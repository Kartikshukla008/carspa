import hmac
import hashlib
import json
from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from apps.services.models import VehicleType, ServicePackage, ServicePackagePrice
from apps.bookings.models import Booking, Customer
from apps.payments.models import Payment
from apps.payments.service import PaymentService

TEST_RAZORPAY_KEY_ID = "rzp_test_sampleKey123"
TEST_RAZORPAY_KEY_SECRET = "sampleSecretKey456"
TEST_RAZORPAY_WEBHOOK_SECRET = "sampleWebhookSecret789"

@override_settings(
    RAZORPAY_KEY_ID=TEST_RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET=TEST_RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET=TEST_RAZORPAY_WEBHOOK_SECRET,
    PAYMENTS_ENABLED=True,
)
class RazorpayPaymentIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Seed customer
        self.customer = Customer.objects.create(
            name="Rajesh Sharma",
            phone="9876543210",
            email="rajesh@example.com",
        )

        # Seed vehicle & service package with price
        self.vehicle = VehicleType.objects.create(
            name="Sedan",
            slug="sedan",
            description="Premium 4-door sedan",
            icon_name="car",
            sort_order=1,
            is_active=True,
        )
        self.package = ServicePackage.objects.create(
            name="Deep Interior Cleaning",
            slug="interior-detail",
            short_description="Deep steam and sanitize",
            description="Full interior detailing",
            estimated_duration_minutes=90,
            sort_order=1,
            is_active=True,
        )
        self.price = ServicePackagePrice.objects.create(
            service_package=self.package,
            vehicle_type=self.vehicle,
            base_price=Decimal("1499.00"),
            discounted_price=Decimal("1299.00"),
            is_active=True,
        )

        # Seed booking
        self.booking = Booking.objects.create(
            customer=self.customer,
            vehicle_type=self.vehicle,
            service_package=self.package,
            service_date="2026-11-05",
            slot_start_time="10:00:00",
            slot_end_time="11:30:00",
            estimated_duration_minutes=90,
            status="PENDING",
            customer_name="Rajesh Sharma",
            customer_phone="9876543210",
            customer_email="rajesh@example.com",
            address_line="Flat 402, Green Avenue",
            locality="Sector 62",
            price_snapshot=Decimal("1299.00"),
            tax_amount=Decimal("0.00"),
            final_amount=Decimal("1299.00"),
            payment_method="RAZORPAY",
            payment_status="PENDING",
        )

    def test_razorpay_config_endpoint(self):
        url = reverse("payments:razorpay-config")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data["enabled"])
        self.assertEqual(data["key_id"], TEST_RAZORPAY_KEY_ID)
        self.assertEqual(data["currency"], "INR")
        # Ensure secret key is NEVER leaked in public config
        self.assertNotIn("secret", str(data).lower())

    @patch("razorpay.Client")
    def test_create_order_for_booking(self, mock_razorpay_client):
        # Mock Razorpay API response
        mock_instance = MagicMock()
        mock_instance.order.create.return_value = {
            "id": "order_test_987654",
            "entity": "order",
            "amount": 129900,
            "currency": "INR",
            "receipt": self.booking.booking_reference,
            "status": "created",
        }
        mock_razorpay_client.return_value = mock_instance

        url = reverse("payments:razorpay-create-order")
        response = self.client.post(url, {"booking_reference": self.booking.booking_reference})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["order_id"], "order_test_987654")
        self.assertEqual(data["amount"], 129900)
        self.assertEqual(data["currency"], "INR")
        self.assertEqual(data["key_id"], TEST_RAZORPAY_KEY_ID)

        # Verify Payment record created in DB
        payment = Payment.objects.filter(order_id="order_test_987654").first()
        self.assertIsNotNone(payment)
        self.assertEqual(payment.booking, self.booking)
        self.assertEqual(payment.status, "INITIATED")
        self.assertEqual(payment.amount, Decimal("1299.00"))

    def test_verify_payment_invalid_signature_fails(self):
        # Create initiated payment record
        Payment.objects.create(
            booking=self.booking,
            provider="RAZORPAY",
            amount=self.booking.final_amount,
            currency="INR",
            order_id="order_fake_111",
            status="INITIATED",
        )

        url = reverse("payments:razorpay-verify")
        payload = {
            "booking_reference": self.booking.booking_reference,
            "razorpay_order_id": "order_fake_111",
            "razorpay_payment_id": "pay_fake_222",
            "razorpay_signature": "invalid_forged_signature_12345",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid payment signature", response.json()["error"])

        # Ensure booking is NOT marked as paid
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.payment_status, "PENDING")

    def test_verify_payment_valid_signature_marks_paid_and_confirmed(self):
        order_id = "order_valid_123"
        payment_id = "pay_valid_456"

        Payment.objects.create(
            booking=self.booking,
            provider="RAZORPAY",
            amount=self.booking.final_amount,
            currency="INR",
            order_id=order_id,
            status="INITIATED",
        )

        # Generate genuine HMAC SHA256 signature
        correct_signature = hmac.new(
            TEST_RAZORPAY_KEY_SECRET.encode("utf-8"),
            f"{order_id}|{payment_id}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        url = reverse("payments:razorpay-verify")
        payload = {
            "booking_reference": self.booking.booking_reference,
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": correct_signature,
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify database update
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.payment_status, "PAID")
        self.assertEqual(self.booking.payment_method, "RAZORPAY")
        self.assertEqual(self.booking.status, "CONFIRMED")

        payment = Payment.objects.get(order_id=order_id)
        self.assertEqual(payment.status, "SUCCESS")
        self.assertEqual(payment.payment_id, payment_id)

    def test_failed_payment_records_without_cancelling_booking(self):
        order_id = "order_failed_test"
        Payment.objects.create(
            booking=self.booking,
            provider="RAZORPAY",
            amount=self.booking.final_amount,
            currency="INR",
            order_id=order_id,
            status="INITIATED",
        )

        url = reverse("payments:razorpay-failed")
        payload = {
            "booking_reference": self.booking.booking_reference,
            "razorpay_order_id": order_id,
            "error_code": "BAD_REQUEST_ERROR",
            "error_description": "User cancelled UPI pin prompt",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.payment_status, "FAILED")
        # Booking slot is not cancelled, permitting retries
        self.assertNotEqual(self.booking.status, "CANCELLED")

        payment = Payment.objects.get(order_id=order_id)
        self.assertEqual(payment.status, "FAILED")

    def test_webhook_order_paid_event(self):
        order_id = "order_webhook_777"
        payment_id = "pay_webhook_888"

        Payment.objects.create(
            booking=self.booking,
            provider="RAZORPAY",
            amount=self.booking.final_amount,
            currency="INR",
            order_id=order_id,
            status="INITIATED",
        )

        body_data = {
            "event": "order.paid",
            "payload": {
                "order": {"entity": {"id": order_id, "amount": 129900}},
                "payment": {"entity": {"id": payment_id, "amount": 129900, "status": "captured"}},
            },
        }
        body_bytes = json.dumps(body_data).encode("utf-8")

        # Generate webhook signature
        signature = hmac.new(
            TEST_RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
            body_bytes,
            hashlib.sha256,
        ).hexdigest()

        url = reverse("payments:razorpay-webhook")
        response = self.client.post(
            url,
            data=body_bytes,
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE=signature,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.payment_status, "PAID")
        self.assertEqual(self.booking.status, "CONFIRMED")
