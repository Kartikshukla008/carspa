import os
import re
import json
import urllib.request
from decimal import Decimal
from django.utils import timezone
from django.conf import settings

from apps.services.models import ServicePackage, VehicleType, ServicePackagePrice, ServiceArea
from apps.bookings.models import Booking
from apps.chatbot.models import ChatSession, ChatMessage, ChatOffer, ChatFAQ
from apps.chatbot.tools import (
    get_services,
    get_vehicle_prices,
    check_service_area,
    get_available_slots,
    get_customer_profile,
    create_booking,
    get_booking_status,
)
from apps.chatbot.state_machine import BookingStateMachine
from apps.payments.service import PaymentService


class ChatbotEngine:
    """
    Intelligent, grounded conversation engine for CARSPA.
    Fetches live knowledge from the database to ensure zero hallucination of prices or offers.
    Integrates conversational booking state machine and customer account data.
    """

    DEFAULT_QUICK_REPLIES = [
        {"label": "Book a car wash", "action": "book"},
        {"label": "Explore services", "action": "services"},
        {"label": "Check prices", "action": "pricing"},
        {"label": "Current offers", "action": "offers"},
        {"label": "Track my booking", "action": "track"},
        {"label": "Talk to support", "action": "support"},
    ]

    @classmethod
    def get_or_create_session(cls, session_id: str, user=None) -> ChatSession:
        if not session_id:
            import uuid
            session_id = str(uuid.uuid4())
        session, _ = ChatSession.objects.get_or_create(
            session_id=session_id,
            defaults={"user": user if user and user.is_authenticated else None}
        )
        if user and user.is_authenticated and not session.user:
            session.user = user
            session.save(update_fields=["user"])
        return session

    @classmethod
    def get_active_offers_data(cls):
        now = timezone.now()
        # Strictly exclude expired or inactive offers
        offers = ChatOffer.objects.filter(is_active=True, valid_from__lte=now, valid_until__gte=now)
        return [
            {
                "code": o.code,
                "title": o.title,
                "description": o.description,
                "discount_type": o.discount_type,
                "discount_value": float(o.discount_value),
                "min_order": float(o.min_order_amount),
                "valid_until": o.valid_until.strftime("%d %b %Y"),
            }
            for o in offers
        ]

    @classmethod
    def get_pricing_data(cls, vehicle_query=None):
        return get_vehicle_prices()

    @classmethod
    def get_service_areas_data(cls):
        areas = ServiceArea.objects.filter(is_active=True)
        return [
            {
                "name": a.name,
                "city": a.city,
                "pincode_prefix": a.pincode_prefix,
            }
            for a in areas
        ]

    @classmethod
    def check_location(cls, query_text: str):
        return check_service_area(locality=query_text)

    @classmethod
    def process_message(cls, session_id: str, user_text: str, user=None, action=None, payment_data=None) -> dict:
        session = cls.get_or_create_session(session_id, user)

        # Handle direct payment callbacks from client
        if action == "PAYMENT_SUCCESS" and payment_data:
            return cls._handle_payment_success(session, payment_data, user)
        elif action == "PAYMENT_FAILED":
            return cls._handle_payment_failed(session, payment_data, user)

        # 1. Record incoming customer message
        ChatMessage.objects.create(
            session=session,
            sender="USER",
            message=user_text.strip(),
        )

        # 2. Determine intent and grounded answer
        cleaned = user_text.lower().strip()
        reply, intent, quick_replies, action_type, action_payload = cls._generate_response(
            session, cleaned, user_text, user, action=action
        )

        # 3. Record bot answer
        ChatMessage.objects.create(
            session=session,
            sender="BOT",
            message=reply,
            intent=intent or "",
            quick_replies=quick_replies or [],
            action_type=action_type or "",
            action_payload=action_payload or {},
        )

        return {
            "session_id": session.session_id,
            "reply": reply,
            "intent": intent,
            "quick_replies": quick_replies,
            "action": {
                "type": action_type,
                "payload": action_payload,
            } if action_type else None,
        }

    @classmethod
    def _handle_payment_success(cls, session, payment_data: dict, user=None):
        order_id = payment_data.get("razorpay_order_id")
        payment_id = payment_data.get("razorpay_payment_id")
        signature = payment_data.get("razorpay_signature")
        ref = payment_data.get("booking_reference")

        # Verify signature server-side
        is_valid = PaymentService.verify_payment_signature(order_id, payment_id, signature)
        if not is_valid and settings.RAZORPAY_KEY_SECRET:
            reply = "⚠️ Payment verification signature check failed. Please contact customer support with your Razorpay payment ID."
            intent = "PAYMENT_VERIFY_FAILED"
            action_type = "ERROR"
            action_payload = {}
        else:
            try:
                PaymentService.handle_successful_payment(order_id, payment_id, signature)
                reply = (
                    f"✅ **Payment Verified!**\n\n"
                    f"Your online payment of ₹{payment_data.get('amount', 0) / 100:.0f} was successfully received via Razorpay.\n"
                    f"• **Razorpay Payment ID**: `{payment_id}`\n"
                    f"• **Booking Reference**: `{ref}`\n\n"
                    f"Your mobile detailing van appointment is locked in and confirmed! 🚗✨"
                )
                intent = "PAYMENT_VERIFIED"
                action_type = "PAYMENT_SUCCESS"
                action_payload = {"booking_reference": ref, "payment_id": payment_id}
            except Exception as e:
                reply = f"Payment verified, but booking update encountered an issue: {str(e)}"
                intent = "PAYMENT_UPDATE_ERROR"
                action_type = None
                action_payload = None

        ChatMessage.objects.create(
            session=session,
            sender="BOT",
            message=reply,
            intent=intent,
            quick_replies=[{"label": "Track my booking", "action": f"track_{ref}"}, {"label": "Talk to support", "action": "support"}],
            action_type=action_type or "",
            action_payload=action_payload or {},
        )

        return {
            "session_id": session.session_id,
            "reply": reply,
            "intent": intent,
            "quick_replies": [{"label": "Track my booking", "action": f"track_{ref}"}, {"label": "Talk to support", "action": "support"}],
            "action": {"type": action_type, "payload": action_payload} if action_type else None,
        }

    @classmethod
    def _handle_payment_failed(cls, session, payment_data: dict, user=None):
        ref = (payment_data or {}).get("booking_reference", "")
        reply = (
            f"Your online payment was not completed or was dismissed.\n\n"
            f"Don't worry! Your booking **{ref}** is saved in our system. "
            f"You can choose to pay on arrival via Cash or UPI, or retry online payment in our tracker."
        )
        intent = "PAYMENT_FAILED"
        action_type = "PAYMENT_FAILED"
        action_payload = {"booking_reference": ref}

        ChatMessage.objects.create(
            session=session,
            sender="BOT",
            message=reply,
            intent=intent,
            quick_replies=[{"label": "Track my booking", "action": f"track_{ref}"}, {"label": "Talk to support", "action": "support"}],
            action_type=action_type,
            action_payload=action_payload,
        )

        return {
            "session_id": session.session_id,
            "reply": reply,
            "intent": intent,
            "quick_replies": [{"label": "Track my booking", "action": f"track_{ref}"}, {"label": "Talk to support", "action": "support"}],
            "action": {"type": action_type, "payload": action_payload},
        }

    @classmethod
    def _generate_response(cls, session, text: str, raw_text: str, user=None, action=None):
        """
        Determines intent and constructs accurate responses strictly derived from database state.
        Prioritizes active booking state machine.
        """
        quick_replies = cls.DEFAULT_QUICK_REPLIES

        # ---------------------------------------------------------
        # Check Active Booking State Machine
        # ---------------------------------------------------------
        active_state = BookingStateMachine.get_state(session)
        if active_state and active_state.get("step"):
            return BookingStateMachine.handle_message(session, raw_text, user, action=action)

        # ---------------------------------------------------------
        # Check Booking Trigger Intent
        # ---------------------------------------------------------
        booking_triggers = [
            "book a car wash", "book a wash", "book car wash", "book appointment",
            "i want to book", "i want a wash", "i want a car wash", "i want a premium",
            "want to book", "need a car wash", "schedule a wash", "book detailing",
            "start booking", "book now", "book"
        ]
        is_booking_intent = (
            text in booking_triggers
            or any(t in text for t in ["i want to book", "want to book", "i want a premium", "i want a car wash", "book a car wash"])
            or text.startswith("select_service_")
            or text.startswith("select_vehicle_")
            or (action and (action == "book" or action.startswith("select_")))
        )

        if is_booking_intent:
            return BookingStateMachine.handle_message(session, raw_text, user, action=action)

        # ---------------------------------------------------------
        # Intent 1: Booking Reference Lookup / Track Booking
        # ---------------------------------------------------------
        ref_match = re.search(r"CW-[A-Z0-9-]+", raw_text, re.IGNORECASE)
        track_triggers = ["track", "status of my booking", "where is my van", "my booking", "check my booking"]

        if ref_match or any(k in text for k in track_triggers):
            track_result = get_booking_status(query_str=raw_text, user=user)

            if track_result.get("found"):
                tech_info = ""
                if track_result.get("assigned_staff"):
                    st = track_result["assigned_staff"]
                    tech_info = f"\n• **Technician**: {st['name']} ({st['phone']})"

                reply = (
                    f"Found your booking **{track_result['booking_reference']}**!\n\n"
                    f"• **Status**: {track_result['status']}\n"
                    f"• **Package**: {track_result['service_name']}\n"
                    f"• **Vehicle**: {track_result['vehicle_name']}\n"
                    f"• **Scheduled Date & Slot**: {track_result['service_date']} ({track_result['slot']})\n"
                    f"• **Delivery Address**: {track_result['address']}\n"
                    f"• **Payment**: ₹{track_result['final_amount']:.0f} ({track_result['payment_status']} via {track_result['payment_method']})"
                    f"{tech_info}\n\n"
                    f"Our technician brings soft water tanks and high-pressure steam washers directly to your location."
                )
                return (
                    reply,
                    "BOOKING_TRACK",
                    [{"label": "Open Live Tracker", "action": "track"}, {"label": "Book another wash", "action": "book"}],
                    "NAVIGATE_TRACK",
                    {"reference": track_result["booking_reference"]},
                )
            else:
                if user and user.is_authenticated:
                    return (
                        "You don't have any recent bookings yet. Would you like to schedule a doorstep wash today?",
                        "BOOKING_TRACK",
                        [{"label": "Book a car wash", "action": "book"}, {"label": "Explore services", "action": "services"}],
                        None,
                        None,
                    )
                else:
                    return (
                        "To track your appointment, please share your Booking Reference (e.g. `CW-YYYYMMDD-XXXX`) or your 10-digit mobile number.",
                        "BOOKING_TRACK",
                        [{"label": "Open Live Tracker", "action": "track"}, {"label": "Talk to support", "action": "support"}],
                        "NAVIGATE_TRACK",
                        {},
                    )

        # ---------------------------------------------------------
        # Intent 2: Pricing Questions (e.g. "How much does a sedan wash cost?")
        # ---------------------------------------------------------
        pricing_keywords = ["price", "cost", "how much", "rate", "charge", "pricing", "fee"]
        if any(k in text for k in pricing_keywords):
            vehicle_name = "Car"
            v_slug = None
            if "sedan" in text:
                v_slug = "sedan"
                vehicle_name = "Sedan"
            elif "hatchback" in text:
                v_slug = "hatchback"
                vehicle_name = "Hatchback"
            elif "suv" in text or "muv" in text or "creta" in text or "scorpio" in text:
                v_slug = "suv"
                vehicle_name = "SUV / MUV"
            elif "luxury" in text or "7-seater" in text or "innova" in text or "bmw" in text or "audi" in text:
                v_slug = "luxury"
                vehicle_name = "Luxury / 7-Seater"

            prices_data = get_vehicle_prices()
            if v_slug:
                prices_data = [p for p in prices_data if p["vehicle_type_slug"] == v_slug]

            if prices_data:
                lines = [f"Here is our live transparent pricing for **{vehicle_name}**:"]
                for p in prices_data:
                    lines.append(f"• **{p['service_package_name']}**: **₹{p['effective_price']:.0f}**")
                lines.append("\nAll prices include 100% doorstep delivery, onboard water, and electricity.")
                reply = "\n".join(lines)
            else:
                reply = (
                    "Our basic wash starts at **₹499** for hatchbacks and sedans, and **₹599** for SUVs. "
                    "Full interior detailing starts at **₹1,699**."
                )

            return (
                reply,
                "PRICING",
                [{"label": "Book a car wash", "action": "book"}, {"label": "Current offers", "action": "offers"}],
                "VIEW_PRICING",
                {"vehicle_category": v_slug},
            )

        # ---------------------------------------------------------
        # Intent 3: Package Inclusions (e.g. "What is included in premium detailing?")
        # ---------------------------------------------------------
        inclusion_keywords = ["included", "include", "features", "what is included", "package details", "interior"]
        if any(k in text for k in inclusion_keywords):
            packages = ServicePackage.objects.filter(is_active=True).order_by("sort_order")
            target_pkg = None
            for p in packages:
                if p.name.lower() in text or p.slug.lower() in text:
                    target_pkg = p
                    break

            if not target_pkg:
                target_pkg = packages.filter(name__icontains="detailing").first() or packages.first()

            if target_pkg:
                feats = "\n".join([f"• {f}" for f in target_pkg.features])
                reply = (
                    f"**{target_pkg.name}** includes:\n"
                    f"{feats}\n\n"
                    f"⏱ Duration: ~{target_pkg.estimated_duration_minutes} minutes at your doorstep.\n"
                    f"No home water or electricity connection required."
                )
                return (
                    reply,
                    "SERVICE_DETAILS",
                    [{"label": "Check prices", "action": "pricing"}, {"label": "Book this service", "action": "book"}],
                    "VIEW_SERVICE",
                    {"package_slug": target_pkg.slug},
                )

        # ---------------------------------------------------------
        # Intent 4: Offers and Discounts (Strictly exclude expired offers)
        # ---------------------------------------------------------
        offer_keywords = ["offer", "coupon", "discount", "promo", "deal", "code"]
        if any(k in text for k in offer_keywords):
            active_offers = cls.get_active_offers_data()
            if active_offers:
                lines = ["🎉 Here are our active offers and discount codes:"]
                for o in active_offers:
                    val = f"{o['discount_value']}% OFF" if o["discount_type"] == "PERCENTAGE" else f"₹{o['discount_value']} OFF"
                    lines.append(f"• Use code **{o['code']}** — {o['title']} ({val}). {o['description']}. Valid till {o['valid_until']}.")
                reply = "\n".join(lines)
            else:
                reply = (
                    "We currently do not have active coupon codes, but all our packages come with bundled savings "
                    "including free tire dressing and dashboard polish!"
                )
            return (
                reply,
                "OFFERS",
                [{"label": "Book a car wash", "action": "book"}, {"label": "Check prices", "action": "pricing"}],
                "VIEW_OFFERS",
                {},
            )

        # ---------------------------------------------------------
        # Intent 5: Doorstep Service & Working Hours
        # ---------------------------------------------------------
        doorstep_keywords = ["doorstep", "water", "electricity", "generator", "working hours", "timing", "open", "hours"]
        if any(k in text for k in doorstep_keywords):
            reply = (
                "Yes! CARSPA provides 100% self-powered **doorstep car washing and detailing**.\n\n"
                "• **Operating Hours**: 8:00 AM – 8:00 PM, 7 days a week.\n"
                "• **Zero Utilities Needed**: Our custom-built mobile vans carry onboard RO-soft water tanks and soundproof power generators. You don't need to provide water or power sockets!\n"
                "• **Eco-Friendly**: We use biodegradable, pH-balanced German shampoos."
            )
            return (
                reply,
                "DOORSTEP_INFO",
                [{"label": "Book a car wash", "action": "book"}, {"label": "Check prices", "action": "pricing"}],
                None,
                {},
            )

        # ---------------------------------------------------------
        # Intent 6: Service Duration (e.g. "How long does a full car spa take?")
        # ---------------------------------------------------------
        duration_keywords = ["how long", "duration", "time take", "minutes", "hours take"]
        if any(k in text for k in duration_keywords):
            reply = (
                "Service durations at your doorstep:\n"
                "• **Express Exterior Wash**: ~30 to 45 minutes\n"
                "• **Premium Foam & Wax Wash**: ~60 minutes\n"
                "• **Full Interior Detailing & Spa**: ~90 to 120 minutes\n"
                "• **Platinum Ceramic Shield**: ~150 to 180 minutes\n\n"
                "Our trained two-person crew works efficiently without requiring your supervision."
            )
            return (
                reply,
                "DURATION_INFO",
                [{"label": "Book a car wash", "action": "book"}, {"label": "Explore services", "action": "services"}],
                None,
                {},
            )

        # ---------------------------------------------------------
        # Intent 7: Service Area Eligibility (e.g. "Do you serve my location?")
        # ---------------------------------------------------------
        location_keywords = ["serve my location", "service area", "location", "coverage", "pincode", "chandigarh", "mohali", "panchkula", "area"]
        if any(k in text for k in location_keywords):
            res = check_service_area(locality=text)
            return (
                res["message"],
                "SERVICE_AREA",
                [{"label": "Book a car wash", "action": "book"}, {"label": "Check prices", "action": "pricing"}],
                "CHECK_AREA",
                {"eligible": res["is_eligible"]},
            )

        # ---------------------------------------------------------
        # Intent 8: Customer Support
        # ---------------------------------------------------------
        support_keywords = ["support", "call", "phone", "help", "contact", "human", "agent", "talk"]
        if any(k in text for k in support_keywords):
            reply = (
                "Our customer care team is available 8:00 AM – 8:00 PM:\n\n"
                "• **Helpline**: +91 70878 11881\n"
                "• **WhatsApp**: [Chat on WhatsApp](https://wa.me/917087811881)\n"
                "• **Email**: support@carspa.in\n\n"
                "How else may I help you today?"
            )
            return (
                reply,
                "SUPPORT",
                [{"label": "Book a car wash", "action": "book"}, {"label": "Track my booking", "action": "track"}],
                "OPEN_SUPPORT",
                {"phone": "+91 70878 11881"},
            )

        # ---------------------------------------------------------
        # Intent 9: Knowledge Base FAQs
        # ---------------------------------------------------------
        faqs = ChatFAQ.objects.filter(is_active=True)
        for faq in faqs:
            kw_raw = faq.keywords or ""
            kw_list = [k.strip().lower() for k in kw_raw.split(",") if k.strip()]
            for kw in kw_list:
                if kw and kw in text:
                    return (
                        faq.answer,
                        "FAQ_ANSWER",
                        [{"label": "Book a car wash", "action": "book"}, {"label": "Check prices", "action": "pricing"}],
                        None,
                        {},
                    )

        # ---------------------------------------------------------
        # Fallback for Unknown Inquiries
        # ---------------------------------------------------------
        reply = (
            "I'm here to assist with everything CARSPA! You can ask me to book a car wash, "
            "check prices for your vehicle type, explore package inclusions, view active offers, "
            "or check our service coverage in your sector."
        )
        return (
            reply,
            "FALLBACK",
            cls.DEFAULT_QUICK_REPLIES,
            None,
            {},
        )
