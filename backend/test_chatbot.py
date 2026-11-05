import pytest
from datetime import timedelta, date, time
from decimal import Decimal
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

from apps.services.models import ServicePackage, VehicleType, ServicePackagePrice, ServiceArea
from apps.bookings.models import Booking, Customer
from apps.accounts.models import CustomerVehicle, CustomerAddress, UserProfile
from apps.scheduling.models import SlotBlockout
from apps.chatbot.models import ChatSession, ChatMessage, ChatOffer, ChatFAQ, ChatSupportHandoff
from apps.chatbot.engine import ChatbotEngine
from apps.chatbot.tools import (
    get_services,
    get_vehicle_prices,
    check_service_area,
    get_available_slots,
    get_customer_profile,
    create_booking,
    get_booking_status,
    get_personalized_recommendation,
    validate_and_apply_coupon,
    reschedule_booking,
    cancel_booking,
    request_human_support,
    get_admin_chatbot_analytics,
)

User = get_user_model()


@pytest.mark.django_db
class TestChatbotEngineAndAPIs:

    def setup_method(self):
        self.client = APIClient()
        call_command("seed_chatbot")

        # Ensure vehicle types exist
        self.sedan, _ = VehicleType.objects.get_or_create(
            slug="sedan",
            defaults={"name": "Sedan", "sort_order": 2, "is_active": True}
        )
        self.suv, _ = VehicleType.objects.get_or_create(
            slug="suv",
            defaults={"name": "SUV / MUV", "sort_order": 3, "is_active": True}
        )

        # Ensure service packages exist
        self.basic, _ = ServicePackage.objects.get_or_create(
            slug="basic-wash",
            defaults={
                "name": "Basic Wash",
                "short_description": "Exterior pressure foam wash",
                "description": "High pressure foam wash and microfiber dry.",
                "estimated_duration_minutes": 45,
                "is_active": True,
            }
        )
        self.premium, _ = ServicePackage.objects.get_or_create(
            slug="premium-wash",
            defaults={
                "name": "Premium Wash",
                "short_description": "Interior and exterior spa",
                "description": "Carnauba wax and interior deep vacuum.",
                "estimated_duration_minutes": 75,
                "is_active": True,
            }
        )
        self.full_detail, _ = ServicePackage.objects.get_or_create(
            slug="full-detailing",
            defaults={
                "name": "Full Detailing",
                "short_description": "Complete restoration",
                "description": "Paint decontamination, machine polish, and interior shampoo.",
                "estimated_duration_minutes": 120,
                "is_active": True,
            }
        )

        # Seed exact prices
        ServicePackagePrice.objects.update_or_create(
            service_package=self.basic,
            vehicle_type=self.sedan,
            defaults={"base_price": Decimal("499.00"), "discounted_price": Decimal("499.00"), "is_active": True}
        )
        ServicePackagePrice.objects.update_or_create(
            service_package=self.premium,
            vehicle_type=self.sedan,
            defaults={"base_price": Decimal("999.00"), "discounted_price": Decimal("999.00"), "is_active": True}
        )
        ServicePackagePrice.objects.update_or_create(
            service_package=self.full_detail,
            vehicle_type=self.sedan,
            defaults={"base_price": Decimal("1699.00"), "discounted_price": Decimal("1699.00"), "is_active": True}
        )
        ServicePackagePrice.objects.update_or_create(
            service_package=self.basic,
            vehicle_type=self.suv,
            defaults={"base_price": Decimal("599.00"), "discounted_price": Decimal("599.00"), "is_active": True}
        )
        ServicePackagePrice.objects.update_or_create(
            service_package=self.premium,
            vehicle_type=self.suv,
            defaults={"base_price": Decimal("1099.00"), "discounted_price": Decimal("1099.00"), "is_active": True}
        )

        # Seed test ServiceArea
        self.area, _ = ServiceArea.objects.get_or_create(
            name="Sector 35 & South Chandigarh",
            city="Chandigarh",
            pincode_prefix="160035",
            defaults={"is_active": True}
        )

    # =========================================================
    # Phase 1 Baseline Tests
    # =========================================================
    def test_pricing_answers_strictly_match_database(self):
        response = self.client.post(
            "/api/chatbot/message/",
            {"message": "How much does a sedan wash cost?", "session_id": "test_session_pricing"},
            format="json",
        )
        assert response.status_code == 200
        reply = response.data["reply"]
        assert "Sedan" in reply
        assert "₹499" in reply
        assert "₹999" in reply
        assert "Basic Wash" in reply
        assert "Premium Wash" in reply

    def test_suv_pricing_query(self):
        response = self.client.post(
            "/api/chatbot/message/",
            {"message": "What is the price for an SUV wash?", "session_id": "test_session_suv"},
            format="json",
        )
        assert response.status_code == 200
        assert "SUV" in response.data["reply"]
        assert "₹599" in response.data["reply"]

    def test_expired_offers_are_never_displayed(self):
        response = self.client.get("/api/chatbot/offers/")
        assert response.status_code == 200
        codes = [o["code"] for o in response.data["offers"]]
        assert "FIRSTWASH" in codes
        assert "CARSPA100" in codes
        assert "DIWALI2023" not in codes

    def test_doorstep_and_working_hours(self):
        response = self.client.post(
            "/api/chatbot/message/",
            {"message": "Do you provide doorstep service and what are your working hours?", "session_id": "test_hours"},
            format="json",
        )
        assert response.status_code == 200
        reply = response.data["reply"]
        assert "8:00 AM" in reply
        assert "8:00 PM" in reply
        assert "water" in reply.lower()

    def test_service_area_eligibility_check(self):
        r1 = self.client.post("/api/chatbot/check-service-area/", {"query": "Sector 35 Chandigarh"}, format="json")
        assert r1.status_code == 200
        assert r1.data["is_eligible"] is True

        r2 = self.client.post("/api/chatbot/check-service-area/", {"query": "Marine Drive, Mumbai"}, format="json")
        assert r2.status_code == 200
        assert r2.data["is_eligible"] is False

    def test_unknown_fallback_response(self):
        response = self.client.post(
            "/api/chatbot/message/",
            {"message": "Can you bake me a chocolate cake?", "session_id": "test_fallback"},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["intent"] == "FALLBACK"

    def test_session_message_history_persistence(self):
        sid = "persistent_session_123"
        self.client.post("/api/chatbot/message/", {"message": "Hello CARSPA", "session_id": sid}, format="json")
        self.client.post("/api/chatbot/message/", {"message": "Check prices", "session_id": sid}, format="json")

        hist_resp = self.client.get(f"/api/chatbot/history/?session_id={sid}")
        assert hist_resp.status_code == 200
        messages = hist_resp.data["messages"]
        assert len(messages) >= 4

    # =========================================================
    # Phase 2 Checklist Tests
    # =========================================================

    def test_chatbot_completes_booking_conversation_step_by_step(self):
        """
        Checklist 1: Chatbot completes a full booking conversation step by step.
        """
        sid = "booking_flow_full_session"

        # 1. Start booking flow
        r1 = self.client.post("/api/chatbot/message/", {"message": "I want to book a car wash", "session_id": sid}, format="json")
        assert r1.status_code == 200
        assert "service" in r1.data["reply"].lower()

        # 2. Select service: Premium Wash
        r2 = self.client.post("/api/chatbot/message/", {"message": "Premium Wash", "session_id": sid}, format="json")
        assert r2.status_code == 200
        assert "vehicle" in r2.data["reply"].lower()

        # 3. Select vehicle: Sedan
        r3 = self.client.post("/api/chatbot/message/", {"message": "Sedan", "session_id": sid}, format="json")
        assert r3.status_code == 200
        assert "₹999" in r3.data["reply"]  # Exact database price for Premium Wash on Sedan
        assert "address" in r3.data["reply"].lower() or "where" in r3.data["reply"].lower()

        # 4. Provide location
        r4 = self.client.post("/api/chatbot/message/", {"message": "#123 Sector 35-B, Chandigarh 160035", "session_id": sid}, format="json")
        assert r4.status_code == 200
        assert "date" in r4.data["reply"].lower()

        # 5. Provide date: Tomorrow
        r5 = self.client.post("/api/chatbot/message/", {"message": "Tomorrow", "session_id": sid}, format="json")
        assert r5.status_code == 200
        assert "time slot" in r5.data["reply"].lower() or "availability" in r5.data["reply"].lower()

        # 6. Select slot: 11:00 AM
        r6 = self.client.post("/api/chatbot/message/", {"message": "11:00 AM", "session_id": sid}, format="json")
        assert r6.status_code == 200
        assert "contact" in r6.data["reply"].lower() or "mobile" in r6.data["reply"].lower()

        # 7. Provide guest contact
        r7 = self.client.post("/api/chatbot/message/", {"message": "Sukhbir Singh, 9888877777", "session_id": sid}, format="json")
        assert r7.status_code == 200
        assert "Booking Summary" in r7.data["reply"]
        assert "Awaiting confirmation" in r7.data["reply"]
        assert "₹999" in r7.data["reply"]

        # Ensure booking NOT created yet (explicit confirmation required!)
        assert not Booking.objects.filter(customer_phone="9888877777").exists()

        # 8. Customer confirms with Pay on Service (Cash/UPI)
        r8 = self.client.post(
            "/api/chatbot/message/",
            {"message": "Pay on Service (Cash/UPI)", "session_id": sid},
            format="json",
        )
        assert r8.status_code == 200
        assert "Booking Confirmed" in r8.data["reply"]
        assert "CW-" in r8.data["reply"]
        # Ensure Razorpay is NOT launched!
        action_type = (r8.data.get("action") or {}).get("type")
        assert action_type != "LAUNCH_RAZORPAY"
        assert action_type == "BOOKING_CONFIRMED"

        # Verify booking created in database!
        b = Booking.objects.get(customer_phone="9888877777")
        assert b.customer_name == "Sukhbir Singh"
        assert b.vehicle_type == self.sedan
        assert b.service_package == self.premium
        assert b.final_amount == Decimal("999.00")
        assert b.payment_method == "PAY_ON_SERVICE"
        assert b.payment_status == "PENDING"

    def test_vehicle_specific_pricing_is_accurate(self):
        """
        Checklist 2: Vehicle-specific pricing is strictly accurate from backend.
        Sedan Premium = ₹999, SUV Premium = ₹1099.
        """
        sedan_prices = get_vehicle_prices(service_package_id=self.premium.id, vehicle_type_id=self.sedan.id)
        suv_prices = get_vehicle_prices(service_package_id=self.premium.id, vehicle_type_id=self.suv.id)

        assert sedan_prices[0]["effective_price"] == 999.0
        assert suv_prices[0]["effective_price"] == 1099.0

    def test_unavailable_slots_cannot_be_booked(self):
        """
        Checklist 3: Unavailable / blockout slots cannot be booked.
        """
        from apps.scheduling.engine import AvailabilityEngine
        import datetime
        engine = AvailabilityEngine()
        tomorrow = timezone.localdate() + timedelta(days=1)
        # Block out 11:00 slot tomorrow in business timezone
        start_dt = engine.tz.localize(datetime.datetime.combine(tomorrow, time(11, 0)))
        end_dt = engine.tz.localize(datetime.datetime.combine(tomorrow, time(12, 0)))

        SlotBlockout.objects.create(
            title="Emergency van maintenance",
            start_datetime=start_dt,
            end_datetime=end_dt,
            is_active=True,
        )

        slots_resp = get_available_slots(target_date=tomorrow, service_package_id=self.basic.id)
        slot_11 = next((s for s in slots_resp["slots"] if s["time"] == "11:00"), None)
        assert slot_11 is not None
        assert slot_11["available"] is False

    def test_customer_must_explicitly_confirm_before_booking_creation(self):
        """
        Checklist 4: Customer must explicitly confirm before booking creation.
        Arbitrary chit-chat or questions at confirmation step do NOT create a booking.
        """
        sid = "explicit_confirm_session"
        tomorrow = timezone.localdate() + timedelta(days=1)

        # Pre-seed session state into AWAIT_CONFIRMATION
        session = ChatSession.objects.create(session_id=sid)
        draft = {
            "service_package_id": self.basic.id,
            "service_package_name": self.basic.name,
            "vehicle_type_id": self.sedan.id,
            "vehicle_type_name": self.sedan.name,
            "address_line": "123 Main Rd",
            "locality": "Chandigarh",
            "pincode": "160035",
            "service_date": tomorrow.isoformat(),
            "service_date_display": tomorrow.strftime("%d %b %Y"),
            "slot_time": "10:00",
            "slot_label": "10:00 AM",
            "customer_name": "Test Customer",
            "customer_phone": "9112233445",
            "final_amount": 499.0,
        }
        session.metadata = {"booking_state": {"step": "AWAIT_CONFIRMATION", "draft": draft}}
        session.save()

        # Send non-confirming message
        resp = self.client.post("/api/chatbot/message/", {"message": "Will it rain tomorrow?", "session_id": sid}, format="json")
        assert resp.status_code == 200
        assert "Booking Summary" in resp.data["reply"]
        assert "Awaiting confirmation" in resp.data["reply"]

        # No booking must exist
        assert not Booking.objects.filter(customer_phone="9112233445").exists()

    def test_duplicate_bookings_prevented(self):
        """
        Checklist 5: Duplicate bookings are strictly prevented for same phone, date, slot, vehicle.
        """
        tomorrow = timezone.localdate() + timedelta(days=1)
        cust = Customer.objects.create(name="Duplicate Tester", phone="9988776655")

        # Create existing booking
        Booking.objects.create(
            customer=cust,
            vehicle_type=self.sedan,
            service_package=self.basic,
            service_date=tomorrow,
            slot_start_time=time(10, 0),
            slot_end_time=time(10, 45),
            customer_name="Duplicate Tester",
            customer_phone="9988776655",
            address_line="123 Test St",
            locality="Chandigarh",
            price_snapshot=Decimal("499.00"),
            final_amount=Decimal("499.00"),
            status="CONFIRMED",
        )

        draft = {
            "service_package_id": self.basic.id,
            "vehicle_type_id": self.sedan.id,
            "service_date": tomorrow.isoformat(),
            "slot_time": "10:00",
            "customer_name": "Duplicate Tester",
            "customer_phone": "9988776655",
            "address_line": "123 Test St",
            "locality": "Chandigarh",
            "payment_method": "PAY_ON_SERVICE",
        }

        res = create_booking(draft)
        assert "error" in res
        assert "Duplicate bookings are prevented" in res["error"]

    def test_booking_associated_with_correct_user_id_when_logged_in(self):
        """
        Checklist 6: Booking is associated with the authenticated user ID.
        """
        user = User.objects.create_user(username="authcustomer", email="auth@carspa.in", password="Password123!")
        profile, _ = UserProfile.objects.get_or_create(
            user=user,
            defaults={"full_name": "Amit Varma", "phone": "9777788888", "role": "CUSTOMER"}
        )
        saved_car = CustomerVehicle.objects.create(
            user=user,
            vehicle_type=self.sedan,
            brand="Honda",
            model_name="City",
            license_plate="CH01-AZ-9999",
            is_default=True,
        )
        saved_addr = CustomerAddress.objects.create(
            user=user,
            house_building="Flat 402, Royale Estate",
            street_locality="Sector 35-C",
            city="Chandigarh",
            pincode="160035",
            is_default=True,
        )
        token = Token.objects.create(user=user)

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        # Check customer profile tool
        prof_data = get_customer_profile(user)
        assert prof_data["authenticated"] is True
        assert prof_data["full_name"] == "Amit Varma"
        assert len(prof_data["saved_vehicles"]) == 1
        assert prof_data["saved_vehicles"][0]["brand"] == "Honda"

        tomorrow = timezone.localdate() + timedelta(days=1)
        draft = {
            "service_package_id": self.premium.id,
            "vehicle_type_id": self.sedan.id,
            "service_date": tomorrow.isoformat(),
            "slot_time": "14:00",
            "customer_name": prof_data["full_name"],
            "customer_phone": prof_data["phone"],
            "address_line": saved_addr.house_building,
            "locality": saved_addr.street_locality,
            "pincode": saved_addr.pincode,
            "payment_method": "PAY_ON_SERVICE",
        }

        res = create_booking(draft, user=user)
        assert res.get("success") is True
        booking = res["booking"]
        assert booking.user == user
        assert booking.customer_name == "Amit Varma"

    def test_guest_flow_works_and_never_assigns_to_unrelated_user(self):
        """
        Checklist 7: Guest flow works without auth, and never assigns to unrelated user.
        """
        tomorrow = timezone.localdate() + timedelta(days=1)
        draft = {
            "service_package_id": self.basic.id,
            "vehicle_type_id": self.sedan.id,
            "service_date": tomorrow.isoformat(),
            "slot_time": "16:00",
            "customer_name": "Independent Guest",
            "customer_phone": "9666655555",
            "address_line": "#456 Sector 17",
            "locality": "Chandigarh",
            "pincode": "160017",
            "payment_method": "PAY_ON_SERVICE",
        }

        res = create_booking(draft, user=None)
        assert res.get("success") is True
        booking = res["booking"]
        assert booking.user is None  # Never assigned to random user!
        assert booking.customer.phone == "9666655555"

    def test_payment_order_correctly_associated_with_booking(self):
        """
        Checklist 8: Razorpay payment order is generated and associated with booking.
        """
        tomorrow = timezone.localdate() + timedelta(days=1)
        draft = {
            "service_package_id": self.basic.id,
            "vehicle_type_id": self.sedan.id,
            "service_date": tomorrow.isoformat(),
            "slot_time": "15:00",
            "customer_name": "Online Payer",
            "customer_phone": "9555544444",
            "address_line": "#789 Sector 35",
            "locality": "Chandigarh",
            "pincode": "160035",
            "payment_method": "RAZORPAY",
        }

        res = create_booking(draft, user=None)
        assert res.get("success") is True
        rzp_order = res.get("razorpay_order")
        assert rzp_order is not None
        assert "order_id" in rzp_order
        assert rzp_order["booking_reference"] == res["booking_reference"]
        assert rzp_order["amount"] == int(res["final_amount"] * 100)

    def test_failed_payments_do_not_create_paid_bookings(self):
        """
        Checklist 9: Failed or dismissed payments do NOT create paid bookings.
        """
        tomorrow = timezone.localdate() + timedelta(days=1)
        cust = Customer.objects.create(name="Fail Payer", phone="9444433333")
        booking = Booking.objects.create(
            customer=cust,
            vehicle_type=self.sedan,
            service_package=self.basic,
            service_date=tomorrow,
            slot_start_time=time(12, 0),
            slot_end_time=time(12, 45),
            customer_name="Fail Payer",
            customer_phone="9444433333",
            address_line="Sector 35",
            locality="Chandigarh",
            price_snapshot=Decimal("499.00"),
            final_amount=Decimal("499.00"),
            payment_method="RAZORPAY",
            payment_status="PENDING",
            status="PENDING",
        )

        sid = "failed_payment_session"
        resp = self.client.post(
            "/api/chatbot/message/",
            {
                "session_id": sid,
                "action": "PAYMENT_FAILED",
                "payment_data": {"booking_reference": booking.booking_reference},
            },
            format="json",
        )
        assert resp.status_code == 200
        assert "not completed" in resp.data["reply"].lower()

        # Booking payment status MUST remain PENDING
        booking.refresh_from_db()
        assert booking.payment_status == "PENDING"
        assert booking.payment_status != "PAID"

    def test_customer_can_track_their_booking(self):
        """
        Checklist 10: Customer can track their booking by reference or user login.
        """
        tomorrow = timezone.localdate() + timedelta(days=1)
        user = User.objects.create_user(username="tracker_user", email="tracker@carspa.in")
        cust = Customer.objects.create(name="Track Tester", phone="9333322222")

        booking = Booking.objects.create(
            user=user,
            customer=cust,
            vehicle_type=self.sedan,
            service_package=self.premium,
            service_date=tomorrow,
            slot_start_time=time(14, 0),
            slot_end_time=time(15, 15),
            customer_name="Track Tester",
            customer_phone="9333322222",
            address_line="Sector 35-B, House #400",
            locality="Chandigarh",
            price_snapshot=Decimal("999.00"),
            final_amount=Decimal("999.00"),
            payment_method="PAY_ON_SERVICE",
            payment_status="PENDING",
            status="CONFIRMED",
        )

        # 1. Track by reference string
        res1 = get_booking_status(query_str=booking.booking_reference)
        assert res1["found"] is True
        assert res1["booking_reference"] == booking.booking_reference
        assert "Premium Wash" in res1["service_name"]
        assert "Sedan" in res1["vehicle_name"]

        # 2. Track via conversational API with reference
        r1 = self.client.post(
            "/api/chatbot/message/",
            {"message": f"Track my booking {booking.booking_reference}", "session_id": "test_track_ref"},
            format="json",
        )
        assert r1.status_code == 200
        assert booking.booking_reference in r1.data["reply"]
        assert "Confirmed" in r1.data["reply"]

        # 3. Track by logged-in user without typing reference
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        r2 = self.client.post(
            "/api/chatbot/message/",
            {"message": "Where is my booking?", "session_id": "test_track_user"},
            format="json",
        )
        assert r2.status_code == 200
        assert booking.booking_reference in r2.data["reply"]

    def test_phase3_personalized_recommendations(self):
        """
        Checklist Item 1: Personalized suggestions use past customer history.
        Exterior wash customer receives full detailing recommendation.
        """
        user = User.objects.create_user(username="rec_user", email="rec@example.com", password="password")
        cust = Customer.objects.create(name="Rec User", phone="9888877111")
        CustomerVehicle.objects.create(user=user, vehicle_type=self.sedan, model_name="Honda City")

        # Booking history: Exterior wash
        Booking.objects.create(
            user=user,
            customer=cust,
            service_package=self.basic,  # basic-wash (exterior)
            vehicle_type=self.sedan,
            service_area=self.area,
            service_date=timezone.localdate() - timedelta(days=5),
            slot_start_time=time(10, 0),
            slot_end_time=time(11, 0),
            customer_name="Rec User",
            customer_phone="9888877111",
            address_line="Sector 22",
            locality="Chandigarh",
            price_snapshot=Decimal("499.00"),
            final_amount=Decimal("499.00"),
            payment_method="PAY_ON_SERVICE",
            payment_status="PENDING",
            status="COMPLETED",
        )

        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        # Natural language query
        r = self.client.post(
            "/api/chatbot/message/",
            {"message": "What service do you recommend for my car?", "session_id": "test_rec_sess"},
            format="json",
        )
        assert r.status_code == 200
        assert r.data["intent"] == "RECOMMENDATION"
        assert "exterior wash" in r.data["reply"].lower()
        assert "detailing" in r.data["reply"].lower()

    def test_phase3_strict_data_isolation_between_accounts(self):
        """
        Checklist Item 5: Customer data cannot leak between accounts.
        """
        user1 = User.objects.create_user(username="user1", email="u1@example.com", password="password")
        user2 = User.objects.create_user(username="user2", email="u2@example.com", password="password")
        cust1 = Customer.objects.create(name="Secret User 1", phone="9111111111")

        # User1's booking
        b1 = Booking.objects.create(
            user=user1,
            customer=cust1,
            service_package=self.premium,
            vehicle_type=self.sedan,
            service_area=self.area,
            service_date=timezone.localdate() + timedelta(days=2),
            slot_start_time=time(11, 0),
            slot_end_time=time(12, 0),
            customer_name="Secret User 1",
            customer_phone="9111111111",
            address_line="Confidential Villa 99",
            locality="Chandigarh",
            price_snapshot=Decimal("999.00"),
            final_amount=Decimal("999.00"),
            payment_method="PAY_ON_SERVICE",
            payment_status="PENDING",
            status="CONFIRMED",
        )

        # User2 logged in tries to track
        token2 = Token.objects.create(user=user2)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token2.key}")

        r = self.client.post(
            "/api/chatbot/message/",
            {"message": "Track my booking", "session_id": "test_isolation_sess"},
            format="json",
        )
        assert r.status_code == 200
        # User 2 must NOT see User 1's booking reference or address
        assert b1.booking_reference not in r.data["reply"]
        assert "Confidential Villa 99" not in r.data["reply"]

    def test_phase3_coupon_validation_and_calculations(self):
        """
        Checklist Item 2: Offers are valid and correctly calculated.
        Min order requirements and expiration enforced.
        """
        # Active coupon: 10% off, min order 500
        now = timezone.now()
        ChatOffer.objects.create(
            code="SAVE10",
            title="10% Off",
            description="10% discount on detailing",
            discount_type="PERCENTAGE",
            discount_value=Decimal("10.00"),
            min_order_amount=Decimal("500.00"),
            valid_from=now - timedelta(days=1),
            valid_until=now + timedelta(days=10),
            is_active=True,
        )

        # 1. Valid coupon applied to 1000 subtotal
        res_valid = validate_and_apply_coupon("SAVE10", 1000.0)
        assert res_valid["is_valid"] is True
        assert res_valid["discount_amount"] == 100.0
        assert res_valid["final_amount"] == 900.0

        # 2. Min order violation (subtotal 400 < 500)
        res_min = validate_and_apply_coupon("SAVE10", 400.0)
        assert res_min["is_valid"] is False
        assert "minimum order" in res_min["error"].lower()

        # 3. Expired coupon
        ChatOffer.objects.create(
            code="EXPIRED50",
            title="Expired Offer",
            description="Old",
            discount_type="FIXED",
            discount_value=Decimal("50.00"),
            min_order_amount=Decimal("100.00"),
            valid_from=now - timedelta(days=30),
            valid_until=now - timedelta(days=1),
            is_active=True,
        )
        res_exp = validate_and_apply_coupon("EXPIRED50", 1000.0)
        assert res_exp["is_valid"] is False
        assert "expired" in res_exp["error"].lower()

    def test_phase3_reschedule_booking_with_confirmation(self):
        """
        Checklist Item 4: Rescheduling requires explicit confirmation before modifying DB.
        """
        today = timezone.localdate()
        target_date = today + timedelta(days=2)
        cust = Customer.objects.create(name="Reschedule Cust", phone="9777766666")

        booking = Booking.objects.create(
            customer=cust,
            service_package=self.premium,
            vehicle_type=self.sedan,
            service_area=self.area,
            service_date=target_date,
            slot_start_time=time(10, 0),
            slot_end_time=time(11, 0),
            customer_name="Reschedule Cust",
            customer_phone="9777766666",
            address_line="Sector 34",
            locality="Chandigarh",
            price_snapshot=Decimal("999.00"),
            final_amount=Decimal("999.00"),
            payment_method="PAY_ON_SERVICE",
            payment_status="PENDING",
            status="CONFIRMED",
        )

        sid = "sess_resched_1"
        # 1. User requests reschedule
        r1 = self.client.post(
            "/api/chatbot/message/",
            {"message": f"Reschedule booking {booking.booking_reference}", "session_id": sid},
            format="json",
        )
        assert r1.status_code == 200
        assert "reschedule" in r1.data["reply"].lower()

        # 2. User selects tomorrow
        new_date = today + timedelta(days=1)
        r2 = self.client.post(
            "/api/chatbot/message/",
            {"message": f"{new_date.isoformat()}", "session_id": sid},
            format="json",
        )
        assert r2.status_code == 200
        assert "time" in r2.data["reply"].lower()

        # 3. User selects slot 11:00
        r3 = self.client.post(
            "/api/chatbot/message/",
            {"message": "11:00", "session_id": sid},
            format="json",
        )
        assert r3.status_code == 200
        assert "Reschedule Confirmation" in r3.data["reply"]
        assert "Explicit confirmation required" in r3.data["reply"]

        # Ensure DB has NOT been rescheduled yet!
        booking.refresh_from_db()
        assert booking.service_date == target_date

        # 4. User explicitly confirms
        r4 = self.client.post(
            "/api/chatbot/message/",
            {"message": "Confirm Reschedule", "session_id": sid},
            format="json",
        )
        assert r4.status_code == 200
        assert "successfully rescheduled" in r4.data["reply"].lower()

        # Verify DB updated!
        booking.refresh_from_db()
        assert booking.service_date == new_date

    def test_phase3_cancel_booking_with_confirmation(self):
        """
        Checklist Item 4: Cancellation requires explicit confirmation and enforces policy.
        """
        today = timezone.localdate()
        cust = Customer.objects.create(name="Cancel Cust", phone="9555544444")
        booking = Booking.objects.create(
            customer=cust,
            service_package=self.premium,
            vehicle_type=self.sedan,
            service_area=self.area,
            service_date=today + timedelta(days=3),
            slot_start_time=time(14, 0),
            slot_end_time=time(15, 0),
            customer_name="Cancel Cust",
            customer_phone="9555544444",
            address_line="Sector 17",
            locality="Chandigarh",
            price_snapshot=Decimal("999.00"),
            final_amount=Decimal("999.00"),
            payment_method="PAY_ON_SERVICE",
            payment_status="PENDING",
            status="CONFIRMED",
        )

        sid = "sess_cancel_1"
        # 1. User requests cancellation
        r1 = self.client.post(
            "/api/chatbot/message/",
            {"message": f"Cancel my booking {booking.booking_reference}", "session_id": sid},
            format="json",
        )
        assert r1.status_code == 200
        assert "Cancellation Confirmation Required" in r1.data["reply"]

        # Verify DB is still CONFIRMED (not cancelled yet)
        booking.refresh_from_db()
        assert booking.status == "CONFIRMED"

        # 2. User confirms cancellation
        r2 = self.client.post(
            "/api/chatbot/message/",
            {"message": "Yes, Cancel Booking", "session_id": sid},
            format="json",
        )
        assert r2.status_code == 200
        assert "has been cancelled" in r2.data["reply"]

        # Verify DB is now CANCELLED!
        booking.refresh_from_db()
        assert booking.status == "CANCELLED"

    def test_phase3_human_support_handoff(self):
        """
        Checklist Item 7: Human handoff logs handoff record, CRM lead, and returns WhatsApp link.
        """
        r = self.client.post(
            "/api/chatbot/message/",
            {"message": "I want to speak with a human agent please", "session_id": "test_handoff_sess"},
            format="json",
        )
        assert r.status_code == 200
        assert r.data["intent"] == "HUMAN_HANDOFF"
        assert "wa.me" in r.data["reply"] or "WhatsApp" in r.data["reply"]
        assert "+91 70878 11881" in r.data["reply"]
        assert ChatSupportHandoff.objects.filter(session__session_id="test_handoff_sess").exists()

    def test_phase3_admin_chatbot_analytics(self):
        """
        Checklist Item 6: Admin analytics match actual conversation records.
        """
        admin = User.objects.create_superuser(username="admin_user", email="adm@example.com", password="password")
        token = Token.objects.create(user=admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        r = self.client.get("/api/chatbot/admin/analytics/")
        assert r.status_code == 200
        assert "total_conversations" in r.data
        assert "unique_users" in r.data
        assert "conversion_rate" in r.data
        assert "intents_distribution" in r.data
        assert "recent_sessions" in r.data
