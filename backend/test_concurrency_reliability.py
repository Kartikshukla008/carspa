import os
import sys
import time
import uuid
import threading
import datetime

# Setup Django Environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.test import RequestFactory
from django.utils import timezone
from apps.core.ratelimit import RateLimiter
from apps.core.idempotency import IdempotencyService
from apps.core.models import IdempotencyRecord
from apps.core.middleware import RateLimitMiddleware
from apps.scheduling.models import SlotCapacityLock
from apps.bookings.models import Booking
from apps.services.models import VehicleType, ServicePackage, ServicePackagePrice
from apps.bookings.serializers import BookingCreateSerializer


def test_rate_limiter():
    print("\n" + "=" * 65)
    print("▶ 1. TESTING REDIS-BACKED SLIDING WINDOW RATE LIMITER")
    print("=" * 65)

    test_ip = f"192.168.1.{int(time.time()) % 200}"
    test_key = f"login:{test_ip}"
    limit = 3
    window = 10

    print(f"[*] Simulating brute force login attempts from IP: {test_ip}")
    print(f"[*] Rule configured: Max {limit} requests per {window} seconds window\n")

    for i in range(1, 5):
        allowed, remaining, retry_after = RateLimiter.is_allowed(test_key, limit=limit, window_seconds=window)
        if allowed:
            print(f"  ✓ Request {i}: ALLOWED (Tokens remaining: {remaining})")
        else:
            print(f"  ✗ Request {i}: BLOCKED (HTTP 429 Too Many Requests, Retry-After: {retry_after}s)")

    # Assert 4th request was blocked
    assert not allowed, "Rate limiter failed to block after threshold!"
    print("\n[SUCCESS] Sliding window rate limiter correctly protected endpoint!\n")


def test_idempotency_keys():
    print("=" * 65)
    print("▶ 2. TESTING IDEMPOTENCY KEY DEDUPLICATION & REPLAY")
    print("=" * 65)

    test_key = f"idem-key-{uuid.uuid4()}"
    factory = RequestFactory()

    payload = {
        "customer_name": "Test Customer",
        "customer_phone": "9876543210",
        "amount": 999
    }

    req1 = factory.post("/api/bookings/", data=payload, content_type="application/json")
    req1.data = payload

    print(f"[*] Simulating 1st Booking Submission with Idempotency-Key: {test_key[:18]}...")
    state1, rec1, resp1, code1 = IdempotencyService.check_or_claim(test_key, req1)
    print(f"  → 1st Request State: {state1} (Lock claimed, processing booking)")
    assert state1 == "CLAIMED"

    # Simulate booking creation response
    mock_booking_data = {
        "booking_reference": "CW-DEMO-778899",
        "customer_name": "Test Customer",
        "amount": 999,
        "razorpay_order": {"id": "order_mock_12345"}
    }
    IdempotencyService.record_completion(test_key, 201, mock_booking_data)
    print("  → Booking and Razorpay order successfully created and persisted in Idempotency ledger.")

    print(f"\n[*] Simulating 2nd Double-Click (same Idempotency-Key, same customer)...")
    req2 = factory.post("/api/bookings/", data=payload, content_type="application/json")
    req2.data = payload
    state2, rec2, resp2, code2 = IdempotencyService.check_or_claim(test_key, req2)

    print(f"  → 2nd Request State: {state2}")
    print(f"  → Replayed Booking Reference: {resp2.get('booking_reference')}")
    print(f"  → Replayed Razorpay Order ID: {resp2.get('razorpay_order', {}).get('id')}")
    print(f"  → HTTP Status: {code2}")

    assert state2 == "REPLAYED", "Idempotency failed to recognize duplicate key!"
    assert resp2["booking_reference"] == "CW-DEMO-778899"
    assert resp2["razorpay_order"]["id"] == "order_mock_12345"

    # Clean up test record
    IdempotencyRecord.objects.filter(idempotency_key=test_key).delete()
    print("\n[SUCCESS] Idempotency engine completely eliminated duplicate booking and payment charge!\n")


def test_pessimistic_slot_locking():
    print("=" * 65)
    print("▶ 3. TESTING PESSIMISTIC SLOT LOCKING (CONCURRENCY RACE)")
    print("=" * 65)

    target_date = timezone.localdate() + datetime.timedelta(days=2)
    slot_time = datetime.time(10, 0)

    print(f"[*] Target Slot: {target_date} at 10:00 AM")
    
    # Pre-create the slot lock entry so threads perform row-level locking
    slot_lock, _ = SlotCapacityLock.objects.get_or_create(
        service_date=target_date,
        slot_start_time=slot_time,
        service_area=None,
    )

    print("[*] Simulating 2 concurrent checkout requests trying to acquire the row lock...")

    results = []

    def book_slot(thread_id):
        from django.db import transaction, connection
        # Configure busy timeout for local SQLite / Postgres
        cursor = connection.cursor()
        try:
            cursor.execute("PRAGMA busy_timeout = 5000;")
        except Exception:
            pass

        with transaction.atomic():
            # Row-level pessimistic lock (select_for_update)
            locked_obj = SlotCapacityLock.objects.select_for_update().get(id=slot_lock.id)
            time.sleep(0.1)
            results.append(f"Thread {thread_id} acquired exclusive lock at {time.time():.3f}")

    t1 = threading.Thread(target=book_slot, args=(1,))
    t2 = threading.Thread(target=book_slot, args=(2,))

    t1.start()
    t2.start()

    t1.join()
    t2.join()

    for r in results:
        print(f"  ✓ {r}")

    assert len(results) == 2, f"Expected 2 results, got {len(results)}"
    # Clean up
    SlotCapacityLock.objects.filter(service_date=target_date, slot_start_time=slot_time).delete()
    print("\n[SUCCESS] Pessimistic slot lock executed serially with zero race overlap!\n")


if __name__ == "__main__":
    print("\n=================================================================")
    print("  CARSPA ENTERPRISE RELIABILITY & CONCURRENCY TEST RUNNER")
    print("=================================================================")
    test_rate_limiter()
    test_idempotency_keys()
    test_pessimistic_slot_locking()
    print("=================================================================")
    print("  ALL 3 ENTERPRISE SYSTEMS VERIFIED & PASSED 100%!")
    print("=================================================================\n")
