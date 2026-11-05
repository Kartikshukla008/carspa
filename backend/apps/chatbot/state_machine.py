import re
import datetime
from django.utils import timezone

from apps.services.models import ServicePackage, VehicleType
from apps.bookings.models import Booking
from apps.chatbot.tools import (
    get_services,
    get_vehicle_prices,
    check_service_area,
    get_available_slots,
    get_customer_profile,
    create_booking,
    get_booking_status,
    validate_and_apply_coupon,
    reschedule_booking,
    cancel_booking,
)


class BookingStateMachine:
    """
    Structured conversational state machine for car wash bookings.
    Collects booking details step by step:
    1. Service selection
    2. Vehicle type and model
    3. Customer location and address
    4. Preferred booking date
    5. Available time slots
    6. Customer contact details
    7. Booking confirmation
    
    Prevents arbitrary LLM booking creation.
    Requires explicit customer confirmation before calling create_booking().
    """

    STEPS = [
        "SELECT_SERVICE",
        "SELECT_VEHICLE",
        "SELECT_LOCATION",
        "SELECT_DATE",
        "SELECT_SLOT",
        "COLLECT_CONTACT",
        "AWAIT_CONFIRMATION",
        "COMPLETED",
    ]

    @classmethod
    def get_state(cls, session):
        meta = session.metadata or {}
        return meta.get("booking_state")

    @classmethod
    def set_state(cls, session, step, draft):
        meta = session.metadata or {}
        meta["booking_state"] = {
            "step": step,
            "draft": draft,
            "updated_at": timezone.now().isoformat(),
        }
        session.metadata = meta
        session.save(update_fields=["metadata"])

    @classmethod
    def clear_state(cls, session):
        meta = session.metadata or {}
        meta.pop("booking_state", None)
        session.metadata = meta
        session.save(update_fields=["metadata"])

    @classmethod
    def handle_message(cls, session, user_text: str, user=None, action=None):
        """
        Main handler for booking conversational messages.
        Accepts user message and optional action identifier.
        Returns: (reply, intent, quick_replies, action_type, action_payload)
        """
        text = user_text.lower().strip()
        if action:
            text = f"{text} {str(action).lower().strip()}".strip()
        state = cls.get_state(session)

        # Allow user to cancel at any time
        if text in ["cancel", "stop", "cancel booking", "nevermind", "restart booking", "abort"]:
            cls.clear_state(session)
            return (
                "No problem, I've cancelled your booking process. Feel free to ask about our services, pricing, or start a new booking anytime!",
                "BOOKING_CANCELLED",
                [
                    {"label": "Book a car wash", "action": "book"},
                    {"label": "Explore services", "action": "services"},
                    {"label": "Check prices", "action": "pricing"},
                    {"label": "Talk to support", "action": "support"},
                ],
                None,
                None,
            )

        # If no active booking state, initialize one
        if not state or not state.get("step"):
            return cls._init_booking_flow(session, user_text, user)

        step = state.get("step")
        draft = state.get("draft", {})

        if step == "SELECT_SERVICE":
            return cls._step_select_service(session, user_text, text, draft, user)
        elif step == "SELECT_VEHICLE":
            return cls._step_select_vehicle(session, user_text, text, draft, user)
        elif step == "SELECT_LOCATION":
            return cls._step_select_location(session, user_text, text, draft, user)
        elif step == "SELECT_DATE":
            return cls._step_select_date(session, user_text, text, draft, user)
        elif step == "SELECT_SLOT":
            return cls._step_select_slot(session, user_text, text, draft, user)
        elif step == "COLLECT_CONTACT":
            return cls._step_collect_contact(session, user_text, text, draft, user)
        elif step == "AWAIT_CONFIRMATION":
            return cls._step_await_confirmation(session, user_text, text, draft, user)
        elif step == "RESCHEDULE_DATE":
            return cls._step_reschedule_date(session, user_text, text, draft, user)
        elif step == "RESCHEDULE_SLOT":
            return cls._step_reschedule_slot(session, user_text, text, draft, user)
        elif step == "RESCHEDULE_CONFIRM":
            return cls._step_reschedule_confirm(session, user_text, text, draft, user)
        elif step == "CANCEL_CONFIRM":
            return cls._step_cancel_confirm(session, user_text, text, draft, user)
        else:
            cls.clear_state(session)
            return cls._init_booking_flow(session, user_text, user)

    # -------------------------------------------------------------
    # Step 0: Initialize Booking Flow
    # -------------------------------------------------------------
    @classmethod
    def _init_booking_flow(cls, session, user_text: str, user=None):
        text = user_text.lower()
        draft = {}

        # Profile pre-fill for logged-in user
        user_profile = get_customer_profile(user)
        if user_profile.get("authenticated"):
            draft["customer_name"] = user_profile.get("full_name") or ""
            draft["customer_phone"] = user_profile.get("phone") or ""
            draft["customer_email"] = user_profile.get("email") or ""

        # Extract upfront service if mentioned (e.g., "I want a premium car wash")
        services = get_services()
        matched_pkg = None
        if "premium" in text or "wax" in text:
            matched_pkg = next((s for s in services if "premium" in s["name"].lower() or "wax" in s["name"].lower()), None)
        elif "detail" in text or "spa" in text:
            matched_pkg = next((s for s in services if "detail" in s["name"].lower()), None)
        elif "ceramic" in text or "coating" in text:
            matched_pkg = next((s for s in services if "ceramic" in s["name"].lower()), None)
        elif "basic" in text or "express" in text:
            matched_pkg = next((s for s in services if "basic" in s["name"].lower()), None)

        # Extract upfront vehicle if mentioned (e.g., "for my sedan")
        vehicle_types = list(VehicleType.objects.filter(is_active=True))
        matched_vehicle = None
        for v in vehicle_types:
            if v.name.lower() in text or v.slug.lower() in text:
                matched_vehicle = v
                break
        if not matched_vehicle:
            if "creta" in text or "scorpio" in text or "harrier" in text or "xuv" in text:
                matched_vehicle = next((v for v in vehicle_types if "suv" in v.slug), None)
            elif "city" in text or "verna" in text or "ciaz" in text:
                matched_vehicle = next((v for v in vehicle_types if "sedan" in v.slug), None)
            elif "i20" in text or "swift" in text or "baleno" in text or "polo" in text:
                matched_vehicle = next((v for v in vehicle_types if "hatchback" in v.slug), None)

        if matched_pkg:
            draft["service_package_id"] = matched_pkg["id"]
            draft["service_package_name"] = matched_pkg["name"]

        if matched_vehicle:
            draft["vehicle_type_id"] = matched_vehicle.id
            draft["vehicle_type_name"] = matched_vehicle.name

        # Decide next step based on what was prefilled
        if not draft.get("service_package_id"):
            cls.set_state(session, "SELECT_SERVICE", draft)
            pkg_buttons = [{"label": s["name"], "action": f"select_service_{s['id']}"} for s in services[:4]]
            return (
                "Hey! Welcome to CARSPA. What service would you like to book today?",
                "BOOKING_STEP_SERVICE",
                pkg_buttons,
                None,
                None,
            )

        if not draft.get("vehicle_type_id"):
            cls.set_state(session, "SELECT_VEHICLE", draft)
            return cls._prompt_vehicle_selection(draft, user)

        # If both service and vehicle pre-filled, calculate price and ask location
        return cls._advance_to_location(session, draft, user)

    # -------------------------------------------------------------
    # Step 1: Select Service
    # -------------------------------------------------------------
    @classmethod
    def _step_select_service(cls, session, user_text: str, text: str, draft: dict, user=None):
        services = get_services()
        matched = None

        # Direct selection by ID from action pill e.g. "select_service_2"
        id_match = re.search(r"select_service_(\d+)", text)
        if id_match:
            pkg_id = int(id_match.group(1))
            matched = next((s for s in services if s["id"] == pkg_id), None)

        if not matched:
            for s in services:
                if s["name"].lower() in text or s["slug"].lower() in text or text in s["name"].lower():
                    matched = s
                    break

        if not matched:
            if "premium" in text or "wax" in text:
                matched = next((s for s in services if "premium" in s["name"].lower() or "wax" in s["name"].lower()), None)
            elif "detail" in text or "interior" in text:
                matched = next((s for s in services if "detail" in s["name"].lower()), None)
            elif "ceramic" in text:
                matched = next((s for s in services if "ceramic" in s["name"].lower()), None)
            elif "basic" in text or "quick" in text:
                matched = next((s for s in services if "basic" in s["name"].lower()), None)

        if not matched:
            pkg_buttons = [{"label": s["name"], "action": f"select_service_{s['id']}"} for s in services[:4]]
            return (
                "Please choose one of our available car care packages:",
                "BOOKING_STEP_SERVICE",
                pkg_buttons,
                None,
                None,
            )

        draft["service_package_id"] = matched["id"]
        draft["service_package_name"] = matched["name"]
        cls.set_state(session, "SELECT_VEHICLE", draft)
        return cls._prompt_vehicle_selection(draft, user)

    @classmethod
    def _prompt_vehicle_selection(cls, draft: dict, user=None):
        user_profile = get_customer_profile(user)
        buttons = []

        # If logged in user has saved vehicles, offer them first!
        if user_profile.get("authenticated") and user_profile.get("saved_vehicles"):
            for sv in user_profile["saved_vehicles"]:
                buttons.append({
                    "label": f"🚗 {sv['label']}",
                    "action": f"select_saved_vehicle_{sv['id']}",
                })

        # Add standard vehicle categories
        vehicle_types = VehicleType.objects.filter(is_active=True).order_by("sort_order")
        for vt in vehicle_types:
            buttons.append({
                "label": vt.name,
                "action": f"select_vehicle_{vt.id}",
            })

        prefix = f"Great! You've selected **{draft['service_package_name']}**.\n\n"
        if user_profile.get("authenticated") and user_profile.get("saved_vehicles"):
            return (
                f"{prefix}Which vehicle would you like to wash? Choose from your saved cars or select a category below:",
                "BOOKING_STEP_VEHICLE",
                buttons,
                None,
                None,
            )
        else:
            return (
                f"{prefix}Great! Which vehicle do you have?",
                "BOOKING_STEP_VEHICLE",
                buttons,
                None,
                None,
            )

    # -------------------------------------------------------------
    # Step 2: Select Vehicle
    # -------------------------------------------------------------
    @classmethod
    def _step_select_vehicle(cls, session, user_text: str, text: str, draft: dict, user=None):
        vehicle_types = list(VehicleType.objects.filter(is_active=True))
        matched = None
        model_name = ""

        # Check saved vehicle selection (logged-in user)
        sv_match = re.search(r"select_saved_vehicle_(\d+)", text)
        if sv_match and user and user.is_authenticated:
            from apps.accounts.models import CustomerVehicle
            sv = CustomerVehicle.objects.filter(id=int(sv_match.group(1)), user=user).first()
            if sv:
                matched = sv.vehicle_type
                model_name = f"{sv.brand} {sv.model_name}"

        # Action pill ID selection e.g. "select_vehicle_2"
        if not matched:
            vt_match = re.search(r"select_vehicle_(\d+)", text)
            if vt_match:
                vt_id = int(vt_match.group(1))
                matched = next((v for v in vehicle_types if v.id == vt_id), None)

        # Keyword match
        if not matched:
            for v in vehicle_types:
                if v.name.lower() in text or v.slug.lower() in text or text in v.name.lower():
                    matched = v
                    break

        if not matched:
            if "sedan" in text:
                matched = next((v for v in vehicle_types if "sedan" in v.slug), None)
            elif "suv" in text or "muv" in text or "creta" in text or "scorpio" in text:
                matched = next((v for v in vehicle_types if "suv" in v.slug), None)
            elif "hatchback" in text or "swift" in text or "i20" in text:
                matched = next((v for v in vehicle_types if "hatchback" in v.slug), None)
            elif "luxury" in text or "bmw" in text or "audi" in text or "innova" in text or "7-seater" in text:
                matched = next((v for v in vehicle_types if "luxury" in v.slug), None)

        if not matched:
            buttons = [{"label": vt.name, "action": f"select_vehicle_{vt.id}"} for vt in vehicle_types]
            return (
                "Please select your vehicle category so we can fetch accurate pricing:",
                "BOOKING_STEP_VEHICLE",
                buttons,
                None,
                None,
            )

        draft["vehicle_type_id"] = matched.id
        draft["vehicle_type_name"] = matched.name
        if model_name:
            draft["vehicle_model"] = model_name

        return cls._advance_to_location(session, draft, user)

    @classmethod
    def _advance_to_location(cls, session, draft: dict, user=None):
        # Calculate vehicle price strictly from backend
        prices = get_vehicle_prices(
            service_package_id=draft["service_package_id"],
            vehicle_type_id=draft["vehicle_type_id"],
        )
        if prices:
            draft["base_price"] = prices[0]["effective_price"]
            draft["final_amount"] = prices[0]["effective_price"]
        else:
            draft["base_price"] = 999.0
            draft["final_amount"] = 999.0

        cls.set_state(session, "SELECT_LOCATION", draft)

        user_profile = get_customer_profile(user)
        buttons = []

        if user_profile.get("authenticated") and user_profile.get("saved_addresses"):
            for addr in user_profile["saved_addresses"]:
                buttons.append({
                    "label": f"📍 {addr['label']}",
                    "action": f"select_saved_address_{addr['id']}",
                })

        buttons.append({"label": "Sector 17, Chandigarh", "action": "loc_sector17"})
        buttons.append({"label": "Phase 7, Mohali", "action": "loc_mohali"})
        buttons.append({"label": "Sector 11, Panchkula", "action": "loc_panchkula"})

        price_formatted = f"₹{int(draft['final_amount'])}" if draft['final_amount'].is_integer() else f"₹{draft['final_amount']:.2f}"
        
        saved_hint = ""
        if user_profile.get("authenticated") and user_profile.get("saved_addresses"):
            saved_hint = "Pick from your saved addresses or type your address/pincode:"
        else:
            saved_hint = "Where should our mobile spa van arrive? Please share your street address or pincode:"

        return (
            f"Your selected service is **{draft['service_package_name']}**. "
            f"The price for your {draft['vehicle_type_name']} is **{price_formatted}**.\n\n"
            f"{saved_hint}",
            "BOOKING_STEP_LOCATION",
            buttons,
            None,
            None,
        )

    # -------------------------------------------------------------
    # Step 3: Select Location
    # -------------------------------------------------------------
    @classmethod
    def _step_select_location(cls, session, user_text: str, text: str, draft: dict, user=None):
        address_line = user_text.strip()
        locality = "Chandigarh"
        pincode = ""
        service_area_id = None

        # Check saved address selection (logged in)
        addr_match = re.search(r"select_saved_address_(\d+)", text)
        if addr_match and user and user.is_authenticated:
            from apps.accounts.models import CustomerAddress
            ca = CustomerAddress.objects.filter(id=int(addr_match.group(1)), user=user).first()
            if ca:
                address_line = ca.house_building
                locality = ca.street_locality
                pincode = ca.pincode

        # Check quick reply shortcuts
        if "loc_sector17" in text or "sector 17" in text:
            address_line = "Sector 17"
            locality = "Chandigarh"
            pincode = "160017"
        elif "loc_mohali" in text or "mohali" in text:
            address_line = "Phase 7"
            locality = "Mohali"
            pincode = "160062"
        elif "loc_panchkula" in text or "panchkula" in text:
            address_line = "Sector 11"
            locality = "Panchkula"
            pincode = "134112"

        # Extract 6-digit Indian pincode if provided
        pin_match = re.search(r"\b(\d{6})\b", text)
        if pin_match:
            pincode = pin_match.group(1)

        # Validate against active service areas
        area_check = check_service_area(pincode=pincode, locality=text)
        if not area_check["is_eligible"]:
            buttons = [
                {"label": "Sector 17, Chandigarh", "action": "loc_sector17"},
                {"label": "Phase 7, Mohali", "action": "loc_mohali"},
                {"label": "Sector 11, Panchkula", "action": "loc_panchkula"},
            ]
            return (
                f"We currently don't serve that specific pincode or locality yet. "
                f"CARSPA delivers doorstep mobile detailing across Chandigarh, Mohali, Panchkula (Tricity) and Bengaluru hubs. "
                f"Please share an address in our service area:",
                "BOOKING_STEP_LOCATION",
                buttons,
                None,
                None,
            )

        draft["address_line"] = address_line
        draft["locality"] = locality or area_check.get("city") or "Chandigarh"
        draft["pincode"] = pincode or "160017"
        draft["service_area_id"] = area_check.get("service_area_id")

        cls.set_state(session, "SELECT_DATE", draft)
        return cls._prompt_date_selection(draft)

    @classmethod
    def _prompt_date_selection(cls, draft: dict):
        today = timezone.localdate()
        tomorrow = today + datetime.timedelta(days=1)
        day_after = today + datetime.timedelta(days=2)

        buttons = [
            {"label": f"Today ({today.strftime('%d %b')})", "action": f"date_{today.isoformat()}"},
            {"label": f"Tomorrow ({tomorrow.strftime('%d %b')})", "action": f"date_{tomorrow.isoformat()}"},
            {"label": f"Day After ({day_after.strftime('%d %b')})", "action": f"date_{day_after.isoformat()}"},
        ]

        return (
            f"We serve your location! Which date would you prefer for the doorstep wash?",
            "BOOKING_STEP_DATE",
            buttons,
            None,
            None,
        )

    # -------------------------------------------------------------
    # Step 4: Select Date
    # -------------------------------------------------------------
    @classmethod
    def _step_select_date(cls, session, user_text: str, text: str, draft: dict, user=None):
        today = timezone.localdate()
        target_date = None

        # Check action pill e.g. "date_2026-11-05"
        date_pill = re.search(r"date_(\d{4}-\d{2}-\d{2})", text)
        if date_pill:
            target_date = datetime.date.fromisoformat(date_pill.group(1))

        if not target_date:
            if "tomorrow" in text:
                target_date = today + datetime.timedelta(days=1)
            elif "today" in text:
                target_date = today
            elif "day after" in text:
                target_date = today + datetime.timedelta(days=2)
            else:
                # Attempt to parse ISO or natural date
                iso_match = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", text)
                if iso_match:
                    try:
                        target_date = datetime.date.fromisoformat(iso_match.group(1))
                    except ValueError:
                        pass

        if not target_date or target_date < today:
            return cls._prompt_date_selection(draft)

        draft["service_date"] = target_date.isoformat()
        draft["service_date_display"] = target_date.strftime("%A, %d %B %Y")

        # Check available slots for this date
        slots_data = get_available_slots(
            target_date=target_date,
            service_package_id=draft["service_package_id"],
            vehicle_type_id=draft.get("vehicle_type_id"),
            service_area_id=draft.get("service_area_id"),
        )

        available_slots = [s for s in slots_data.get("slots", []) if s.get("available")]

        if not available_slots:
            buttons = [
                {"label": "Try Tomorrow", "action": "date_tomorrow"},
                {"label": "Try Another Date", "action": "date_other"},
            ]
            return (
                f"All slots are fully booked for **{draft['service_date_display']}**. Would you like to check tomorrow or another date?",
                "BOOKING_STEP_DATE",
                buttons,
                None,
                None,
            )

        cls.set_state(session, "SELECT_SLOT", draft)

        # Show first 4-6 available slots
        slot_buttons = [
            {"label": s["label"], "action": f"slot_{s['time']}"}
            for s in available_slots[:6]
        ]

        # Extract time if user already mentioned time in their message (e.g. "Tomorrow at 11 AM")
        time_match = re.search(r"\b(1[0-2]|0?[1-9])(?::([0-5][0-9]))?\s*(am|pm)\b", text)
        if time_match:
            hr = int(time_match.group(1))
            mn = int(time_match.group(2) or 0)
            ampm = time_match.group(3).lower()
            if ampm == "pm" and hr < 12:
                hr += 12
            elif ampm == "am" and hr == 12:
                hr = 0
            candidate_time = f"{hr:02d}:{mn:02d}"
            # Check if this candidate is available
            matching_slot = next((s for s in available_slots if s["time"] == candidate_time), None)
            if matching_slot:
                return cls._step_select_slot(session, candidate_time, f"slot_{candidate_time}", draft, user)

        return (
            f"Let me check availability for you.\n\n"
            f"Here are the available time slots for **{draft['service_date_display']}**:\n"
            f"Which time works best for you?",
            "BOOKING_STEP_SLOT",
            slot_buttons,
            None,
            None,
        )

    # -------------------------------------------------------------
    # Step 5: Select Slot
    # -------------------------------------------------------------
    @classmethod
    def _step_select_slot(cls, session, user_text: str, text: str, draft: dict, user=None):
        # Fetch current available slots for date
        target_date = datetime.date.fromisoformat(draft["service_date"])
        slots_data = get_available_slots(
            target_date=target_date,
            service_package_id=draft["service_package_id"],
            vehicle_type_id=draft.get("vehicle_type_id"),
            service_area_id=draft.get("service_area_id"),
        )
        available_slots = [s for s in slots_data.get("slots", []) if s.get("available")]

        matched_slot = None

        # Check action pill e.g. "slot_11:00"
        slot_pill = re.search(r"slot_(\d{2}:\d{2})", text)
        if slot_pill:
            time_str = slot_pill.group(1)
            matched_slot = next((s for s in available_slots if s["time"] == time_str), None)

        if not matched_slot:
            # Check natural time e.g. "11 AM", "11:00", "2 pm"
            time_match = re.search(r"\b(1[0-2]|0?[1-9])(?::([0-5][0-9]))?\s*(am|pm)?\b", text)
            if time_match:
                hr = int(time_match.group(1))
                mn = int(time_match.group(2) or 0)
                ampm = time_match.group(3)
                if ampm:
                    ampm = ampm.lower()
                    if ampm == "pm" and hr < 12:
                        hr += 12
                    elif ampm == "am" and hr == 12:
                        hr = 0
                else:
                    # If no am/pm specified and hr in 8..11 assume AM, if 1..6 assume PM
                    if 1 <= hr <= 6:
                        hr += 12

                candidate = f"{hr:02d}:{mn:02d}"
                matched_slot = next((s for s in available_slots if s["time"] == candidate), None)

        if not matched_slot:
            slot_buttons = [{"label": s["label"], "action": f"slot_{s['time']}"} for s in available_slots[:6]]
            return (
                f"That slot is currently unavailable or already booked. Please choose from the available times below:",
                "BOOKING_STEP_SLOT",
                slot_buttons,
                None,
                None,
            )

        draft["slot_time"] = matched_slot["time"]
        draft["slot_label"] = matched_slot["label"]

        # Check if customer contact is already available (logged-in user)
        user_profile = get_customer_profile(user)
        if user_profile.get("authenticated") and user_profile.get("phone"):
            draft["customer_name"] = user_profile.get("full_name") or "Valued Customer"
            draft["customer_phone"] = user_profile.get("phone")
            draft["customer_email"] = user_profile.get("email") or ""
            cls.set_state(session, "AWAIT_CONFIRMATION", draft)
            return cls._render_booking_summary(draft)

        cls.set_state(session, "COLLECT_CONTACT", draft)
        return (
            f"Slot locked for **{matched_slot['label']}**! ⏰\n\n"
            f"Almost there! Who should our technician contact upon arrival? "
            f"Please share your Name and 10-digit Mobile Number (e.g. *Rahul Sharma, 9876543210*):",
            "BOOKING_STEP_CONTACT",
            [],
            None,
            None,
        )

    # -------------------------------------------------------------
    # Step 6: Collect Contact
    # -------------------------------------------------------------
    @classmethod
    def _step_collect_contact(cls, session, user_text: str, text: str, draft: dict, user=None):
        # Extract 10-digit phone number
        phone_match = re.search(r"\b(\d{10})\b", text)
        if not phone_match:
            return (
                "Please provide a valid 10-digit mobile number so we can confirm your van dispatch and send updates:",
                "BOOKING_STEP_CONTACT",
                [],
                None,
                None,
            )

        phone = phone_match.group(1)
        name = user_text.replace(phone, "").replace(",", "").replace("-", "").strip() or "Valued Customer"

        draft["customer_phone"] = phone
        draft["customer_name"] = name
        draft["customer_email"] = getattr(user, "email", "") if (user and user.is_authenticated) else ""

        cls.set_state(session, "AWAIT_CONFIRMATION", draft)
        return cls._render_booking_summary(draft)

    # -------------------------------------------------------------
    # Step 7: Await Explicit Confirmation & Render Summary
    # -------------------------------------------------------------
    @classmethod
    def _render_booking_summary(cls, draft: dict):
        price = draft.get("final_amount", draft.get("price", 999.0))
        formatted_price = f"₹{int(price)}" if isinstance(price, (int, float)) and (isinstance(price, int) or price.is_integer()) else f"₹{price:.2f}"
        
        coupon_row = ""
        if draft.get("coupon_code"):
            discount = draft.get("discount_amount", 0)
            coupon_row = f"| **Coupon Applied** | **-₹{int(discount)} ({draft['coupon_code']})** |\n"

        summary = (
            f"### 📋 Booking Summary\n\n"
            f"| Detail | Selection |\n"
            f"| :--- | :--- |\n"
            f"| **Service** | {draft.get('service_package_name', 'Car Wash')} |\n"
            f"| **Vehicle** | {draft.get('vehicle_type_name', 'Car')} {draft.get('vehicle_model', '')} |\n"
            f"| **Location** | {draft.get('address_line', '')}, {draft.get('locality', '')} ({draft.get('pincode', '')}) |\n"
            f"| **Date** | {draft.get('service_date_display', draft.get('service_date'))} |\n"
            f"| **Time Slot** | {draft.get('slot_label', draft.get('slot_time'))} |\n"
            f"| **Customer** | {draft.get('customer_name')} ({draft.get('customer_phone')}) |\n"
            f"{coupon_row}"
            f"| **Amount** | **{formatted_price}** |\n\n"
            f"**Awaiting confirmation.** How would you like to pay?"
        )

        buttons = [
            {"label": "💳 Pay Online (Razorpay UPI/Cards)", "action": "confirm_razorpay"},
            {"label": "💵 Pay on Service (Cash/UPI)", "action": "confirm_pay_on_service"},
            {"label": "🎟️ Apply Coupon", "action": "prompt_coupon"},
            {"label": "❌ Cancel Booking", "action": "cancel_booking"},
        ]

        return (
            summary,
            "BOOKING_STEP_CONFIRM",
            buttons,
            "BOOKING_SUMMARY",
            draft,
        )

    # -------------------------------------------------------------
    # Step 8: Confirm & Create Booking
    # -------------------------------------------------------------
    @classmethod
    def _step_await_confirmation(cls, session, user_text: str, text: str, draft: dict, user=None):
        if any(k in text for k in ["cancel", "no", "stop", "abort"]):
            cls.clear_state(session)
            return (
                "Your booking draft has been cancelled. Let me know whenever you'd like to book!",
                "BOOKING_CANCELLED",
                [
                    {"label": "Book a car wash", "action": "book"},
                    {"label": "Explore services", "action": "services"},
                    {"label": "Check prices", "action": "pricing"},
                ],
                None,
                None,
            )

        # Coupon application during confirmation
        if "prompt_coupon" in text:
            return (
                "Please type your coupon code (for example: **CARSPA100** or **WELCOME10**):",
                "BOOKING_AWAIT_COUPON",
                [{"label": "Back to Summary", "action": "summary"}],
                None,
                None,
            )

        has_coupon_intent = (
            "coupon" in text
            or "promo" in text
            or "discount" in text
            or (text.startswith("code ") or text.startswith("apply "))
        )
        is_pay_on_service = (
            "confirm_pay_on_service" in text
            or "pay on service" in text
            or "cash" in text
            or "pay later" in text
            or "after service" in text
            or "on arrival" in text
            or "cod" in text
        )

        is_online = (
            not is_pay_on_service
            and (
                "confirm_razorpay" in text
                or "pay online" in text
                or "razorpay" in text
                or "online" in text
                or "card" in text
                or "gpay" in text
                or "phonepe" in text
                or "upi" in text
            )
        )

        if has_coupon_intent and not (is_online or is_pay_on_service):
            raw_code = user_text
            for prefix in ["apply coupon", "apply promo", "apply code", "coupon", "promo", "code"]:
                raw_code = re.sub(f"(?i)^{prefix}", "", raw_code).strip(": ")
            raw_code = raw_code.strip().upper()
            subtotal = float(draft.get("price", draft.get("final_amount", 999.0)))
            coupon_res = validate_and_apply_coupon(raw_code, subtotal)
            if coupon_res["is_valid"]:
                draft["coupon_code"] = coupon_res["code"]
                draft["discount_amount"] = coupon_res["discount_amount"]
                draft["final_amount"] = coupon_res["final_amount"]
                cls.set_state(session, "AWAIT_CONFIRMATION", draft)
                summary_tuple = cls._render_booking_summary(draft)
                return (
                    f"{coupon_res['message']}\n\n{summary_tuple[0]}",
                    summary_tuple[1],
                    summary_tuple[2],
                    summary_tuple[3],
                    summary_tuple[4],
                )
            else:
                summary_tuple = cls._render_booking_summary(draft)
                return (
                    f"⚠️ {coupon_res['error']}\n\n{summary_tuple[0]}",
                    summary_tuple[1],
                    summary_tuple[2],
                    summary_tuple[3],
                    summary_tuple[4],
                )

        # Explicit confirmation required
        if not is_online and not is_pay_on_service:
            return cls._render_booking_summary(draft)

        draft["payment_method"] = "PAY_ON_SERVICE" if is_pay_on_service else "RAZORPAY"

        # Create booking via Tool 6
        result = create_booking(draft, user=user)

        if result.get("error"):
            buttons = [
                {"label": "Pick Another Slot", "action": "select_another_slot"},
                {"label": "Cancel Booking", "action": "cancel_booking"},
            ]
            return (
                f"⚠️ {result['error']}",
                "BOOKING_ERROR",
                buttons,
                None,
                None,
            )

        booking_ref = result["booking_reference"]
        cls.clear_state(session)

        if draft["payment_method"] == "RAZORPAY":
            razorpay_order = result.get("razorpay_order", {})
            return (
                f"🎉 Booking **{booking_ref}** created!\n\n"
                f"Launching secure Razorpay Checkout for **₹{result['final_amount']:.0f}**...\n"
                f"You can complete payment using UPI (GPay, PhonePe, Paytm, QR), Credit/Debit Cards, or NetBanking.\n\n"
                f"Once payment is confirmed, your mobile detailing van is fully secured!",
                "BOOKING_PAYMENT_INITIATED",
                [
                    {"label": "Track my booking", "action": f"track_{booking_ref}"},
                    {"label": "Talk to support", "action": "support"},
                ],
                "LAUNCH_RAZORPAY",
                razorpay_order,
            )
        else:
            return (
                f"🎉 **Booking Confirmed!**\n\n"
                f"Your booking reference is **{booking_ref}**.\n\n"
                f"• **Package**: {draft.get('service_package_name')}\n"
                f"• **Vehicle**: {draft.get('vehicle_type_name')} {draft.get('vehicle_model', '')}\n"
                f"• **Scheduled Time**: {draft.get('service_date_display')} at {draft.get('slot_label')}\n"
                f"• **Address**: {draft.get('address_line')}, {draft.get('locality')}\n"
                f"• **Payment**: ₹{result['final_amount']:.0f} (Pay After Service via Cash or UPI)\n\n"
                f"Our fully equipped, self-powered mobile spa van with onboard soft water and power will arrive directly at your location!",
                "BOOKING_CONFIRMED",
                [
                    {"label": "Track my booking", "action": f"track_{booking_ref}"},
                    {"label": "Book another wash", "action": "book"},
                ],
                "BOOKING_CONFIRMED",
                {"booking_reference": booking_ref},
            )

    # =============================================================
    # Phase 3: Conversational Rescheduling Flow
    # =============================================================
    @classmethod
    def _init_reschedule_flow(cls, session, booking_reference: str, user=None):
        clean_ref = (booking_reference or "").strip()
        booking = None
        if clean_ref:
            booking = Booking.objects.filter(booking_reference__iexact=clean_ref).first()
        elif user and user.is_authenticated:
            booking = Booking.objects.filter(user=user).exclude(status__in=["COMPLETED", "CANCELLED", "REJECTED"]).order_by("-created_at").first()

        if not booking:
            return (
                "Please provide your booking reference (e.g. `CW-20261104-XXXX`) so I can help reschedule your appointment.",
                "RESCHEDULE_NEED_REF",
                [{"label": "Track my booking", "action": "track"}, {"label": "Talk to support", "action": "support"}],
                None,
                None,
            )

        if user and user.is_authenticated and booking.user and booking.user != user:
            return (
                "You are only authorized to reschedule bookings associated with your account.",
                "AUTH_ERROR",
                [{"label": "Talk to support", "action": "support"}],
                None,
                None,
            )

        if booking.status in ["COMPLETED", "CANCELLED", "REJECTED"]:
            return (
                f"Booking **{booking.booking_reference}** is already {booking.get_status_display().lower()} and cannot be rescheduled.",
                "RESCHEDULE_INVALID_STATUS",
                [{"label": "Book a car wash", "action": "book"}, {"label": "Talk to support", "action": "support"}],
                None,
                None,
            )

        draft = {
            "booking_reference": booking.booking_reference,
            "service_package_id": booking.service_package_id,
            "service_package_name": booking.service_package.name if booking.service_package else "Wash",
            "vehicle_type_id": booking.vehicle_type_id,
            "service_area_id": booking.service_area_id,
            "old_date": str(booking.service_date),
            "old_slot": str(booking.slot_start_time)[:5],
        }
        cls.set_state(session, "RESCHEDULE_DATE", draft)

        today = timezone.localdate()
        date_buttons = []
        for i in range(1, 4):
            d = today + datetime.timedelta(days=i)
            label = "Tomorrow" if i == 1 else d.strftime("%A, %d %b")
            date_buttons.append({"label": f"📅 {label}", "action": f"reschedule_date_{d.isoformat()}"})

        return (
            f"Let's reschedule your appointment for **{booking.booking_reference}** ({draft['service_package_name']}).\n"
            f"Current schedule: **{booking.service_date}** at **{str(booking.slot_start_time)[:5]}**.\n\n"
            f"Which date would you prefer to move it to?",
            "RESCHEDULE_STEP_DATE",
            date_buttons,
            None,
            draft,
        )

    @classmethod
    def _step_reschedule_date(cls, session, user_text: str, text: str, draft: dict, user=None):
        if any(k in text for k in ["cancel", "nevermind", "stop", "abort"]):
            cls.clear_state(session)
            return ("Rescheduling cancelled. Your original appointment time is preserved.", "RESCHEDULE_ABORTED", None, None, None)

        today = timezone.localdate()
        target_date = None

        if "tomorrow" in text:
            target_date = today + datetime.timedelta(days=1)
        elif "today" in text:
            target_date = today

        date_match = re.search(r"(\d{4}-\d{2}-\d{2})", text)
        if date_match:
            try:
                target_date = datetime.date.fromisoformat(date_match.group(1))
            except ValueError:
                pass

        if not target_date:
            target_date = today + datetime.timedelta(days=1)

        draft["new_date"] = target_date.isoformat()
        draft["new_date_display"] = target_date.strftime("%A, %d %B %Y")

        slots_data = get_available_slots(
            target_date=target_date,
            service_package_id=draft.get("service_package_id"),
            vehicle_type_id=draft.get("vehicle_type_id"),
            service_area_id=draft.get("service_area_id"),
        )

        avail_slots = [s for s in slots_data.get("slots", []) if s.get("available")]
        if not avail_slots:
            return (
                f"All slots on **{draft['new_date_display']}** are fully reserved. Please pick another date.",
                "RESCHEDULE_STEP_DATE",
                [{"label": "Pick Another Date", "action": "reschedule"}],
                None,
                None,
            )

        cls.set_state(session, "RESCHEDULE_SLOT", draft)
        slot_buttons = [
            {"label": s.get("label", s.get("time")), "action": f"reschedule_slot_{s.get('time', s.get('start_time'))}"}
            for s in avail_slots[:6]
        ]
        return (
            f"Great! Available detailing time slots for **{draft['new_date_display']}**:\n\n"
            f"Which time works best for you?",
            "RESCHEDULE_STEP_SLOT",
            slot_buttons,
            None,
            draft,
        )

    @classmethod
    def _step_reschedule_slot(cls, session, user_text: str, text: str, draft: dict, user=None):
        if any(k in text for k in ["cancel", "nevermind", "stop", "abort"]):
            cls.clear_state(session)
            return ("Rescheduling cancelled. Your original appointment time is preserved.", "RESCHEDULE_ABORTED", None, None, None)

        slot_match = re.search(r"(\d{1,2}:\d{2})", text)
        if not slot_match:
            return (
                "Please choose an available time slot (e.g. `10:30` or `14:00`).",
                "RESCHEDULE_STEP_SLOT",
                None,
                None,
                draft,
            )

        slot_time = slot_match.group(1)
        if len(slot_time.split(":")[0]) == 1:
            slot_time = f"0{slot_time}"

        draft["new_slot"] = slot_time

        # Move to explicit confirmation step
        cls.set_state(session, "RESCHEDULE_CONFIRM", draft)

        buttons = [
            {"label": "✅ Confirm Reschedule", "action": "confirm_reschedule"},
            {"label": "❌ Keep Existing Slot", "action": "cancel_reschedule"},
        ]
        return (
            f"### 🗓️ Reschedule Confirmation\n\n"
            f"• **Booking Reference**: `{draft['booking_reference']}`\n"
            f"• **Previous Schedule**: {draft.get('old_date')} at {draft.get('old_slot')}\n"
            f"• **New Schedule**: **{draft.get('new_date_display')} at {slot_time}**\n\n"
            f"**Explicit confirmation required:** Would you like to confirm this new appointment time?",
            "RESCHEDULE_STEP_CONFIRM",
            buttons,
            None,
            draft,
        )

    @classmethod
    def _step_reschedule_confirm(cls, session, user_text: str, text: str, draft: dict, user=None):
        if any(k in text for k in ["cancel", "keep", "no", "abort"]):
            cls.clear_state(session)
            return (
                f"Reschedule cancelled. Your booking **{draft['booking_reference']}** remains scheduled at your original time.",
                "RESCHEDULE_CANCELLED",
                [{"label": "Track my booking", "action": f"track_{draft['booking_reference']}"}],
                None,
                None,
            )

        is_confirmed = any(k in text for k in ["confirm", "yes", "reschedule", "confirm_reschedule", "proceed"])
        if not is_confirmed:
            buttons = [
                {"label": "✅ Confirm Reschedule", "action": "confirm_reschedule"},
                {"label": "❌ Keep Existing Slot", "action": "cancel_reschedule"},
            ]
            return (
                f"Please confirm whether you want to reschedule **{draft['booking_reference']}** to **{draft.get('new_date_display')} at {draft.get('new_slot')}**:",
                "RESCHEDULE_STEP_CONFIRM",
                buttons,
                None,
                draft,
            )

        res = reschedule_booking(
            booking_reference=draft["booking_reference"],
            new_date=draft["new_date"],
            new_slot_time_str=draft["new_slot"],
            user=user,
        )
        cls.clear_state(session)

        if not res.get("success"):
            return (
                f"⚠️ Could not reschedule: {res.get('error')}",
                "RESCHEDULE_ERROR",
                [{"label": "Talk to support", "action": "support"}],
                None,
                None,
            )

        return (
            res["message"],
            "BOOKING_RESCHEDULED",
            [
                {"label": "Open Live Tracker", "action": f"track_{draft['booking_reference']}"},
                {"label": "Explore services", "action": "services"},
            ],
            "NAVIGATE_TRACK",
            {"reference": draft["booking_reference"]},
        )

    # =============================================================
    # Phase 3: Conversational Cancellation Flow
    # =============================================================
    @classmethod
    def _init_cancel_flow(cls, session, booking_reference: str, user=None):
        clean_ref = (booking_reference or "").strip()
        booking = None
        if clean_ref:
            booking = Booking.objects.filter(booking_reference__iexact=clean_ref).first()
        elif user and user.is_authenticated:
            booking = Booking.objects.filter(user=user).exclude(status__in=["COMPLETED", "CANCELLED", "REJECTED"]).order_by("-created_at").first()

        if not booking:
            return (
                "Please provide your booking reference (e.g. `CW-20261104-XXXX`) so I can assist with cancellation.",
                "CANCEL_NEED_REF",
                [{"label": "Track my booking", "action": "track"}, {"label": "Talk to support", "action": "support"}],
                None,
                None,
            )

        if user and user.is_authenticated and booking.user and booking.user != user:
            return (
                "You are only authorized to cancel bookings associated with your account.",
                "AUTH_ERROR",
                [{"label": "Talk to support", "action": "support"}],
                None,
                None,
            )

        if booking.status in ["COMPLETED", "CANCELLED", "REJECTED"]:
            return (
                f"Booking **{booking.booking_reference}** is already {booking.get_status_display().lower()} and cannot be cancelled.",
                "CANCEL_INVALID_STATUS",
                [{"label": "Book a car wash", "action": "book"}, {"label": "Talk to support", "action": "support"}],
                None,
                None,
            )

        draft = {
            "booking_reference": booking.booking_reference,
            "service_package_name": booking.service_package.name if booking.service_package else "Wash",
            "service_date": str(booking.service_date),
            "slot": str(booking.slot_start_time)[:5],
            "payment_status": booking.payment_status,
            "final_amount": float(booking.final_amount),
        }
        cls.set_state(session, "CANCEL_CONFIRM", draft)

        refund_note = ""
        if booking.payment_status == "PAID":
            refund_note = f"\n• **Refund**: A 100% full refund of ₹{booking.final_amount:.0f} will be returned to your original payment method via Razorpay."

        buttons = [
            {"label": "⚠️ Yes, Cancel Booking", "action": "confirm_cancel_booking"},
            {"label": "Keep My Booking", "action": "keep_booking"},
        ]

        return (
            f"### ⚠️ Booking Cancellation Confirmation Required\n\n"
            f"Are you sure you want to cancel booking **{booking.booking_reference}**?\n\n"
            f"• **Package**: {draft['service_package_name']}\n"
            f"• **Scheduled For**: {booking.service_date} at {str(booking.slot_start_time)[:5]}\n"
            f"• **Cancellation Policy**: Free cancellation anytime prior to van arrival.{refund_note}\n\n"
            f"**Explicit confirmation required:** Would you like to proceed?",
            "CANCEL_STEP_CONFIRM",
            buttons,
            None,
            draft,
        )

    @classmethod
    def _step_cancel_confirm(cls, session, user_text: str, text: str, draft: dict, user=None):
        if any(k in text for k in ["keep", "no", "keep_booking", "abort", "back"]):
            cls.clear_state(session)
            return (
                f"Cancellation cancelled! Your booking **{draft['booking_reference']}** remains confirmed and scheduled.",
                "CANCEL_ABORTED",
                [{"label": "Track my booking", "action": f"track_{draft['booking_reference']}"}],
                None,
                None,
            )

        is_confirmed = any(k in text for k in ["yes", "confirm", "cancel", "confirm_cancel_booking"])
        if not is_confirmed:
            buttons = [
                {"label": "⚠️ Yes, Cancel Booking", "action": "confirm_cancel_booking"},
                {"label": "Keep My Booking", "action": "keep_booking"},
            ]
            return (
                f"Please confirm whether you wish to permanently cancel **{draft['booking_reference']}**:",
                "CANCEL_STEP_CONFIRM",
                buttons,
                None,
                draft,
            )

        res = cancel_booking(
            booking_reference=draft["booking_reference"],
            reason="Customer requested cancellation via chat",
            user=user,
        )
        cls.clear_state(session)

        return (
            res["message"],
            "BOOKING_CANCELLED",
            [
                {"label": "Book a car wash", "action": "book"},
                {"label": "Talk to support", "action": "support"},
            ],
            None,
            None,
        )
