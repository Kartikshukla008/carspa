import pytest
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.services.models import ServicePackage, VehicleType, ServicePackagePrice, ServiceArea
from apps.chatbot.models import ChatSession, ChatMessage, ChatOffer, ChatFAQ
from apps.chatbot.engine import ChatbotEngine

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

        # Seed test ServiceArea
        ServiceArea.objects.get_or_create(
            name="Sector 35 & South Chandigarh",
            city="Chandigarh",
            pincode_prefix="160035",
            defaults={"is_active": True}
        )

    def test_pricing_answers_strictly_match_database(self):
        """
        Verify that pricing questions (e.g. 'How much does a sedan wash cost?')
        return exact live database prices without inventing numbers.
        """
        response = self.client.post(
            "/api/chatbot/message/",
            {"message": "How much does a sedan wash cost?", "session_id": "test_session_pricing"},
            format="json",
        )
        assert response.status_code == 200
        data = response.data
        assert data["intent"] == "PRICING"
        reply = data["reply"]

        # In our database: Basic Wash for Sedan is ₹499, Premium is ₹999, Full Detailing is ₹1699
        assert "Sedan" in reply
        assert "₹499" in reply
        assert "₹999" in reply
        assert "₹1699" in reply
        assert "Basic Wash" in reply
        assert "Premium Wash" in reply

    def test_suv_pricing_query(self):
        """Test pricing extraction for SUV / MUV."""
        response = self.client.post(
            "/api/chatbot/message/",
            {"message": "What is the price for an SUV wash?", "session_id": "test_session_suv"},
            format="json",
        )
        assert response.status_code == 200
        assert "SUV" in response.data["reply"]
        assert "₹599" in response.data["reply"]

    def test_expired_offers_are_never_displayed(self):
        """
        Verify that expired coupons (e.g. DIWALI2023) are strictly filtered out
        and only currently valid active offers are returned.
        """
        response = self.client.get("/api/chatbot/offers/")
        assert response.status_code == 200
        offers = response.data["offers"]
        codes = [o["code"] for o in offers]

        # Active offers MUST be present
        assert "FIRSTWASH" in codes
        assert "CARSPA100" in codes

        # Expired offer MUST NOT be present
        assert "DIWALI2023" not in codes

        # Also test via conversational engine
        msg_resp = self.client.post(
            "/api/chatbot/message/",
            {"message": "Are there any offers available today?", "session_id": "test_offers"},
            format="json",
        )
        assert msg_resp.status_code == 200
        reply = msg_resp.data["reply"]
        assert "FIRSTWASH" in reply
        assert "DIWALI2023" not in reply

    def test_doorstep_and_working_hours(self):
        """
        Verify that questions regarding doorstep utilities and hours
        explain self-contained mobile vans and 08:00 AM - 08:00 PM hours.
        """
        response = self.client.post(
            "/api/chatbot/message/",
            {"message": "Do you provide doorstep service and what are your working hours?", "session_id": "test_hours"},
            format="json",
        )
        assert response.status_code == 200
        reply = response.data["reply"]
        assert "08:00 AM" in reply
        assert "08:00 PM" in reply
        assert "water" in reply.lower()
        assert "power" in reply.lower() or "generators" in reply.lower()

    def test_service_area_eligibility_check(self):
        """Verify checking location for Chandigarh / Tricity vs unserved area."""
        # 1. Eligible sector
        r1 = self.client.post(
            "/api/chatbot/check-service-area/",
            {"location": "Sector 35 Chandigarh"},
            format="json",
        )
        assert r1.status_code == 200
        assert r1.data["eligible"] is True
        assert "Chandigarh" in r1.data["message"]

        # 2. Eligible Mohali
        r2 = self.client.post(
            "/api/chatbot/check-service-area/",
            {"location": "Phase 7 Mohali"},
            format="json",
        )
        assert r2.status_code == 200
        assert r2.data["eligible"] is True

        # 3. Ineligible city e.g. Mumbai
        r3 = self.client.post(
            "/api/chatbot/check-service-area/",
            {"location": "Marine Drive, Mumbai"},
            format="json",
        )
        assert r3.status_code == 200
        assert r3.data["eligible"] is False

    def test_unknown_fallback_response(self):
        """Verify that unrecognized questions receive a polite, helpful guided fallback."""
        response = self.client.post(
            "/api/chatbot/message/",
            {"message": "Can you bake me a chocolate cake?", "session_id": "test_fallback"},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["intent"] == "FALLBACK"
        assert len(response.data["quick_replies"]) > 0

    def test_session_message_history_persistence(self):
        """Verify that messages are recorded and session history can be retrieved."""
        sid = "persistent_session_123"
        self.client.post("/api/chatbot/message/", {"message": "Hello CARSPA", "session_id": sid}, format="json")
        self.client.post("/api/chatbot/message/", {"message": "Tell me prices", "session_id": sid}, format="json")

        hist_resp = self.client.get(f"/api/chatbot/history/?session_id={sid}")
        assert hist_resp.status_code == 200
        messages = hist_resp.data["messages"]
        # 2 user messages + 2 bot messages = 4 messages
        assert len(messages) >= 4
        senders = [m["sender"] for m in messages]
        assert "USER" in senders
        assert "BOT" in senders
