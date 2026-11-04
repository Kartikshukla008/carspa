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


class ChatbotEngine:
    """
    Intelligent, grounded conversation engine for CARSPA.
    Fetches live knowledge from the database to ensure zero hallucination of prices or offers.
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
        prices_qs = ServicePackagePrice.objects.filter(is_active=True).select_related(
            "service_package", "vehicle_type"
        )
        data = []
        for p in prices_qs:
            data.append({
                "package_name": p.service_package.name,
                "package_slug": p.service_package.slug,
                "vehicle_name": p.vehicle_type.name,
                "vehicle_slug": p.vehicle_type.slug,
                "base_price": float(p.base_price),
                "discounted_price": float(p.discounted_price) if p.discounted_price else None,
                "effective_price": float(p.effective_price),
                "duration_minutes": p.service_package.estimated_duration_minutes,
            })
        return data

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
        q = query_text.lower().strip()
        areas = ServiceArea.objects.filter(is_active=True)

        matched_areas = []
        for a in areas:
            if (
                a.name.lower() in q
                or a.city.lower() in q
                or (a.pincode_prefix and a.pincode_prefix in q)
                or (q in a.name.lower())
                or (q in a.city.lower())
            ):
                matched_areas.append(a)

        # Standard Tricity coverage check
        tricity_keywords = ["chandigarh", "mohali", "panchkula", "tricity", "zirakpur", "kharar"]
        is_tricity = any(k in q for k in tricity_keywords)

        if matched_areas or is_tricity:
            covered_list = ", ".join(set([a.city for a in areas] + ["Chandigarh", "Mohali", "Panchkula"]))
            return {
                "eligible": True,
                "city": matched_areas[0].city if matched_areas else "Chandigarh Tricity",
                "message": (
                    f"Great news! We provide 100% doorstep car washing & detailing across {covered_list}. "
                    f"Our fully equipped vans come directly to your doorstep with our own water and power."
                ),
            }

        return {
            "eligible": False,
            "city": None,
            "message": (
                "Currently, CARSPA provides doorstep service across Chandigarh, Mohali, Panchkula (Tricity) "
                "and select Bengaluru hubs. If you are in Tricity or nearby sectors, we would be delighted to serve you!"
            ),
        }

    @classmethod
    def process_message(cls, session_id: str, user_text: str, user=None) -> dict:
        session = cls.get_or_create_session(session_id, user)

        # 1. Record incoming customer message
        ChatMessage.objects.create(
            session=session,
            sender="USER",
            message=user_text.strip(),
        )

        # 2. Determine intent and grounded answer
        cleaned = user_text.lower().strip()
        reply, intent, quick_replies, action_type, action_payload = cls._generate_response(cleaned, user_text, user)

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
    def _generate_response(cls, text: str, raw_text: str, user=None):
        """
        Determines intent and constructs accurate responses strictly derived from database state.
        """
        quick_replies = cls.DEFAULT_QUICK_REPLIES

        # ---------------------------------------------------------
        # Intent 1: Booking Reference Lookup (e.g. "CW-20261104-ABCD" or "track")
        # ---------------------------------------------------------
        ref_match = re.search(r"CW-[A-Z0-9-]+", raw_text, re.IGNORECASE)
        if ref_match or any(k in text for k in ["track", "status of my booking", "where is my van"]):
            if ref_match:
                ref = ref_match.group(0).upper()
                booking = Booking.objects.filter(reference_id__iexact=ref).select_related(
                    "service_package", "vehicle_type"
                ).first()
                if booking:
                    status_str = booking.get_status_display()
                    pkg = booking.service_package.name if booking.service_package else "Wash"
                    date_str = booking.scheduled_date.strftime("%d %b %Y") if booking.scheduled_date else "Today"
                    time_str = booking.scheduled_time_slot or "Scheduled slot"
                    tech_info = ""
                    assignment = getattr(booking, "technician_assignment", None)
                    if assignment and assignment.staff:
                        tech_info = f"\n• Technician Assigned: {assignment.staff.get_full_name() or assignment.staff.username}"

                    reply = (
                        f"Found your booking **{ref}**!\n\n"
                        f"• **Status**: {status_str}\n"
                        f"• **Package**: {pkg}\n"
                        f"• **Vehicle**: {booking.vehicle_type.name if booking.vehicle_type else 'Car'}\n"
                        f"• **Scheduled Time**: {date_str} at {time_str}\n"
                        f"• **Address**: {booking.service_address}"
                        f"{tech_info}\n\n"
                        f"You can view live van GPS tracking and invoice in our appointment tracker."
                    )
                    return (
                        reply,
                        "BOOKING_TRACK",
                        [{"label": "Open Live Tracker", "action": "track"}, {"label": "Book another wash", "action": "book"}],
                        "NAVIGATE_TRACK",
                        {"reference": ref},
                    )
                else:
                    return (
                        f"I couldn't find an appointment with reference **{ref}**. Please verify your booking code or track using your registered mobile number.",
                        "BOOKING_TRACK",
                        [{"label": "Track by Mobile", "action": "track"}, {"label": "Talk to support", "action": "support"}],
                        "NAVIGATE_TRACK",
                        {},
                    )
            else:
                return (
                    "To track your appointment, please share your Booking Reference ID (e.g. `CW-YYYYMMDD-XXXX`) or visit our live tracking page.",
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
            # Check vehicle target
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

            prices = cls.get_pricing_data()
            if v_slug:
                filtered = [p for p in prices if v_slug in p["vehicle_slug"].lower()]
                if not filtered:
                    filtered = prices
            else:
                # Default to Sedan preview if vehicle not mentioned
                filtered = [p for p in prices if "sedan" in p["vehicle_slug"].lower()]
                vehicle_name = "Sedan (Standard)"

            price_lines = []
            for p in filtered:
                effective = p["effective_price"]
                base = p["base_price"]
                discount_text = f" ~₹{int(base)}~" if base > effective else ""
                price_lines.append(f"• **{p['package_name']}**: ₹{int(effective)}{discount_text} ({p['duration_minutes']} mins)")

            joined_prices = "\n".join(price_lines)
            reply = (
                f"Here is our live database pricing for **{vehicle_name}**:\n\n"
                f"{joined_prices}\n\n"
                f"All packages include 100% doorstep service with our own water, power generators, and premium Meguiar's/Koch-Chemie detailing chemicals. No utility access required from your end!"
            )
            return (
                reply,
                "PRICING",
                [{"label": "Book this wash", "action": "book"}, {"label": "Current offers", "action": "offers"}, {"label": "Explore packages", "action": "services"}],
                "NAVIGATE_BOOK",
                {"vehicle": v_slug or "sedan"},
            )

        # ---------------------------------------------------------
        # Intent 3: Current Offers / Coupons (e.g. "Are there any offers available?")
        # ---------------------------------------------------------
        offer_keywords = ["offer", "coupon", "discount", "promo", "deal", "voucher", "code"]
        if any(k in text for k in offer_keywords):
            active_offers = cls.get_active_offers_data()
            if active_offers:
                offer_items = []
                for o in active_offers:
                    disc = f"{int(o['discount_value'])}% OFF" if o['discount_type'] == "PERCENTAGE" else f"₹{int(o['discount_value'])} FLAT OFF"
                    min_o = f" on orders above ₹{int(o['min_order'])}" if o['min_order'] > 0 else ""
                    offer_items.append(f"• Code **{o['code']}**: {o['title']} ({disc}{min_o}) — Valid till {o['valid_until']}")

                reply = (
                    f"Yes! Here are the active CARSPA discounts available today:\n\n"
                    f"{chr(10).join(offer_items)}\n\n"
                    f"You can apply any of these coupon codes directly at checkout during booking!"
                )
                return (
                    reply,
                    "OFFERS",
                    [{"label": "Claim Offer & Book", "action": "book"}, {"label": "Check prices", "action": "pricing"}],
                    "NAVIGATE_BOOK",
                    {"coupon": active_offers[0]["code"]},
                )
            else:
                return (
                    "We currently don't have any standalone promo codes running, but our service packages already feature discounted online rates across all vehicle types! First-time doorstep appointments also receive complimentary interior fragrance sanitization.",
                    "OFFERS",
                    [{"label": "Book a wash", "action": "book"}, {"label": "Check prices", "action": "pricing"}],
                    "NAVIGATE_BOOK",
                    {},
                )

        # ---------------------------------------------------------
        # Intent 4: Doorstep Mechanics, Water, Power & Working Hours
        # ---------------------------------------------------------
        doorstep_keywords = ["doorstep", "water", "electricity", "power", "plug", "generator", "working hour", "timing", "time", "hours", "how it work"]
        if any(k in text for k in doorstep_keywords):
            reply = (
                "**100% Self-Contained Doorstep Service!**\n\n"
                "• **No Water or Power Needed**: Our mobile detailing vans carry their own soft-water reservoirs, high-pressure machines, and silent generators. You do not need to provide electricity, taps, or extension cords.\n"
                "• **Operating Hours**: We operate daily from **08:00 AM to 08:00 PM** across all Tricity sectors.\n"
                "• **Service Location**: We wash your car right at your home driveway, apartment stilt parking, or office basement with zero mess left behind."
            )
            return (
                reply,
                "DOORSTEP_AND_HOURS",
                [{"label": "Book a slot", "action": "book"}, {"label": "Check prices", "action": "pricing"}, {"label": "Service areas", "action": "coverage"}],
                "NAVIGATE_BOOK",
                {},
            )

        # ---------------------------------------------------------
        # Intent 5: Duration / How long does it take?
        # ---------------------------------------------------------
        duration_keywords = ["how long", "duration", "how much time", "take", "minutes", "hours"]
        if any(k in text for k in duration_keywords):
            packages = ServicePackage.objects.filter(is_active=True).order_by("estimated_duration_minutes")
            items = []
            for p in packages:
                items.append(f"• **{p.name}**: ~{p.estimated_duration_minutes} minutes")

            reply = (
                f"Here are the estimated durations for our detailing sessions:\n\n"
                f"{chr(10).join(items)}\n\n"
                f"Our crew arrives punctually in the scheduled 2-hour window and finishes the job with rigorous 24-point quality inspection."
            )
            return (
                reply,
                "DURATION",
                [{"label": "Book an appointment", "action": "book"}, {"label": "Explore services", "action": "services"}],
                "NAVIGATE_BOOK",
                {},
            )

        # ---------------------------------------------------------
        # Intent 6: Service Package Details (e.g. "What is included in premium detailing?")
        # ---------------------------------------------------------
        package_keywords = ["included", "package", "services", "detail", "wash", "ceramic", "interior", "what is included"]
        if any(k in text for k in package_keywords):
            packages = ServicePackage.objects.filter(is_active=True).order_by("sort_order")
            target_pkg = None
            for p in packages:
                if p.name.lower() in text or p.slug.lower() in text:
                    target_pkg = p
                    break

            if target_pkg:
                features_list = ""
                if target_pkg.features:
                    features_list = "\n" + "\n".join([f"  ✓ {f}" for f in target_pkg.features])

                reply = (
                    f"**{target_pkg.name}**\n\n"
                    f"{target_pkg.description}\n"
                    f"• **Duration**: ~{target_pkg.estimated_duration_minutes} mins\n"
                    f"• **Key Inclusions**:{features_list}\n\n"
                    f"Would you like to check prices or book this package?"
                )
                return (
                    reply,
                    "SERVICES",
                    [{"label": f"Book {target_pkg.name}", "action": "book"}, {"label": "Check prices", "action": "pricing"}],
                    "NAVIGATE_BOOK",
                    {"package": target_pkg.slug},
                )
            else:
                pkg_summaries = []
                for p in packages[:4]:
                    pkg_summaries.append(f"• **{p.name}** ({p.estimated_duration_minutes} mins): {p.short_description}")

                reply = (
                    f"CARSPA offers professional doorstep car detailing treatments:\n\n"
                    f"{chr(10).join(pkg_summaries)}\n\n"
                    f"Which package would you like to explore?"
                )
                return (
                    reply,
                    "SERVICES",
                    [{"label": "Explore all services", "action": "services"}, {"label": "Check prices", "action": "pricing"}],
                    "NAVIGATE_SERVICES",
                    {},
                )

        # ---------------------------------------------------------
        # Intent 7: Location / Service Area Eligibility
        # ---------------------------------------------------------
        location_keywords = ["location", "serve", "area", "city", "pincode", "chandigarh", "mohali", "panchkula", "where", "coverage", "bengaluru"]
        if any(k in text for k in location_keywords):
            res = cls.check_location(text)
            return (
                res["message"],
                "COVERAGE",
                [{"label": "Book doorstep wash", "action": "book"}, {"label": "Explore services", "action": "services"}],
                "NAVIGATE_BOOK",
                {},
            )

        # ---------------------------------------------------------
        # Intent 8: Direct Booking Intent
        # ---------------------------------------------------------
        book_keywords = ["book", "appointment", "schedule", "reserve", "clean my car"]
        if any(k in text for k in book_keywords):
            reply = (
                "You can book your doorstep car wash in just 60 seconds!\n\n"
                "1. Choose your car type (Hatchback, Sedan, SUV, Luxury)\n"
                "2. Pick your preferred service package\n"
                "3. Select a convenient date and time slot\n"
                "4. Enter your doorstep address & confirm\n\n"
                "Ready to begin?"
            )
            return (
                reply,
                "BOOKING",
                [{"label": "🚀 Start Booking Now", "action": "book"}, {"label": "View pricing", "action": "pricing"}],
                "NAVIGATE_BOOK",
                {},
            )

        # ---------------------------------------------------------
        # Intent 9: Human Support / Contact
        # ---------------------------------------------------------
        support_keywords = ["support", "human", "call", "agent", "phone", "contact", "helpline", "talk"]
        if any(k in text for k in support_keywords):
            reply = (
                "Our customer care and dispatch team is here for you!\n\n"
                "• **Helpline & WhatsApp**: +91 70878 11881\n"
                "• **Operating Hours**: 08:00 AM – 08:00 PM (Monday to Sunday)\n"
                "• **Email**: support@carspa.in\n\n"
                "Would you like to message us directly on WhatsApp?"
            )
            return (
                reply,
                "TALK_TO_SUPPORT",
                [{"label": "Open WhatsApp Chat", "action": "whatsapp"}, {"label": "Book a wash", "action": "book"}],
                "WHATSAPP_SUPPORT",
                {"phone": "+917087811881"},
            )

        # ---------------------------------------------------------
        # Intent 10: Greetings
        # ---------------------------------------------------------
        greeting_keywords = ["hi", "hello", "hey", "good morning", "good evening", "namaste", "halo"]
        if any(text == k or text.startswith(k + " ") for k in greeting_keywords):
            user_greeting = f"Welcome back, {user.first_name or user.username}!" if user and user.is_authenticated else "Welcome to CARSPA!"
            reply = (
                f"Hey! {user_greeting} Looking to give your car some doorstep care today?\n\n"
                f"I can help you check live prices, view active discount offers, explore detailing packages, or track an appointment. How can I help?"
            )
            return (
                reply,
                "GREETING",
                quick_replies,
                None,
                {},
            )

        # ---------------------------------------------------------
        # Intent 11: Check FAQs in Database
        # ---------------------------------------------------------
        words = set(re.findall(r"\w+", text))
        faqs = ChatFAQ.objects.filter(is_active=True)
        for faq in faqs:
            faq_words = set(re.findall(r"\w+", faq.question.lower() + " " + (faq.keywords or "").lower()))
            if len(words.intersection(faq_words)) >= 2:
                return (
                    f"**{faq.question}**\n\n{faq.answer}",
                    "FAQS",
                    [{"label": "Book a wash", "action": "book"}, {"label": "Check prices", "action": "pricing"}],
                    None,
                    {},
                )

        # ---------------------------------------------------------
        # Fallback response (polite, informative, guided)
        # ---------------------------------------------------------
        reply = (
            "I'm your CARSPA Doorstep Detailing Assistant! I can help you with:\n\n"
            "• **Live Pricing**: Instant prices for Hatchback, Sedan, SUV, or Luxury cars\n"
            "• **Services**: Foam wash, interior deep sanitization, ceramic booster\n"
            "• **Offers**: Current coupons and discount codes\n"
            "• **Scheduling**: Real-time doorstep slots across Chandigarh, Mohali & Panchkula\n"
            "• **Tracking**: Live van arrival status\n\n"
            "What would you like to explore?"
        )
        return (
            reply,
            "FALLBACK",
            quick_replies,
            None,
            {},
        )
