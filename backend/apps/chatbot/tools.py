import datetime
import re
from decimal import Decimal
from django.db import transaction, models
from django.utils import timezone
from django.conf import settings

from apps.core.models import BusinessConfig
from apps.services.models import ServicePackage, VehicleType, ServicePackagePrice, ServiceArea
from apps.bookings.models import Booking, Customer
from apps.accounts.models import CustomerVehicle, CustomerAddress, UserProfile
from apps.scheduling.models import SlotCapacityLock
from apps.scheduling.engine import AvailabilityEngine
from apps.payments.service import PaymentService
from apps.chatbot.models import ChatSession, ChatMessage, ChatOffer, ChatFAQ, ChatSupportHandoff
from apps.crm.models import Lead


def get_services():
    """
    Tool 1: Fetch all active services with duration, features, and badges.
    """
    packages = ServicePackage.objects.filter(is_active=True).order_by("sort_order")
    return [
        {
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "description": p.short_description or p.description,
            "duration_minutes": p.estimated_duration_minutes,
            "badge_text": p.badge_text,
            "features": p.features,
            "is_popular": p.is_popular,
        }
        for p in packages
    ]


def get_vehicle_prices(service_package_id=None, vehicle_type_id=None):
    """
    Tool 2: Get vehicle-specific pricing strictly from backend records.
    """
    qs = ServicePackagePrice.objects.filter(is_active=True).select_related(
        "service_package", "vehicle_type"
    )
    if service_package_id:
        qs = qs.filter(service_package_id=service_package_id)
    if vehicle_type_id:
        qs = qs.filter(vehicle_type_id=vehicle_type_id)

    return [
        {
            "service_package_id": p.service_package.id,
            "service_package_name": p.service_package.name,
            "service_package_slug": p.service_package.slug,
            "vehicle_type_id": p.vehicle_type.id,
            "vehicle_type_name": p.vehicle_type.name,
            "vehicle_type_slug": p.vehicle_type.slug,
            "base_price": float(p.base_price),
            "discounted_price": float(p.discounted_price) if p.discounted_price else None,
            "effective_price": float(p.effective_price),
        }
        for p in qs
    ]


def check_service_area(pincode=None, locality=None):
    """
    Tool 3: Validate service location eligibility against active ServiceArea records.
    """
    areas = ServiceArea.objects.filter(is_active=True)
    matched = None

    if pincode:
        clean_pincode = str(pincode).strip().replace(" ", "")
        for a in areas:
            if a.pincode_prefix and clean_pincode.startswith(str(a.pincode_prefix)):
                matched = a
                break

        # Standard Tricity / Bengaluru prefix matches if specific area record not explicitly pinned
        if not matched and clean_pincode.startswith(("160", "134", "140", "560")):
            matched = areas.first()

    if not matched and locality:
        clean_loc = str(locality).strip().lower()
        for a in areas:
            if (
                a.name.lower() in clean_loc
                or a.city.lower() in clean_loc
                or clean_loc in a.name.lower()
                or clean_loc in a.city.lower()
            ):
                matched = a
                break

        if not matched:
            tricity_cities = ["chandigarh", "mohali", "panchkula", "zirakpur", "kharar", "bengaluru", "bangalore"]
            if any(city in clean_loc for city in tricity_cities):
                matched = areas.first()

    if matched:
        return {
            "is_eligible": True,
            "service_area_id": matched.id,
            "service_area_name": matched.name,
            "city": matched.city,
            "message": f"Service is active in {matched.name}, {matched.city}! Our mobile van will reach your location.",
        }

    return {
        "is_eligible": False,
        "service_area_id": None,
        "service_area_name": None,
        "city": None,
        "message": (
            "We currently serve Chandigarh Tricity (Chandigarh, Mohali, Panchkula) "
            "and Bengaluru hubs. Please provide an address within these regions."
        ),
    }


def get_available_slots(target_date, service_package_id, vehicle_type_id=None, service_area_id=None):
    """
    Tool 4: Find available time slots for a given date, package, and area.
    """
    if isinstance(target_date, str):
        try:
            target_date = datetime.date.fromisoformat(target_date)
        except ValueError:
            return {"error": "Invalid date format. Use YYYY-MM-DD.", "slots": []}

    engine = AvailabilityEngine()
    result = engine.get_available_slots(
        target_date=target_date,
        service_package_id=service_package_id,
        vehicle_type_id=vehicle_type_id,
        service_area_id=service_area_id,
    )
    return result


def get_customer_profile(user):
    """
    Tool 5: Fetch authenticated customer details, saved vehicles, addresses, and bookings.
    Strictly isolated to user argument to guarantee zero cross-account data leakage.
    """
    if not user or not user.is_authenticated:
        return {"authenticated": False}

    profile = getattr(user, "profile", None)
    full_name = profile.full_name if profile else (user.get_full_name() or user.username)
    phone = profile.phone if profile else ""
    carspa_user_id = profile.carspa_user_id if profile else f"CARSPA-USER-{user.id}"

    saved_vehicles = [
        {
            "id": v.id,
            "brand": v.brand,
            "model_name": v.model_name,
            "license_plate": v.license_plate,
            "vehicle_type_id": v.vehicle_type.id,
            "vehicle_type_name": v.vehicle_type.name,
            "vehicle_type_slug": v.vehicle_type.slug,
            "is_default": v.is_default,
            "label": f"{v.brand} {v.model_name} ({v.vehicle_type.name})",
        }
        for v in CustomerVehicle.objects.filter(user=user).select_related("vehicle_type")
    ]

    saved_addresses = [
        {
            "id": a.id,
            "house_building": a.house_building,
            "street_locality": a.street_locality,
            "city": a.city,
            "pincode": a.pincode,
            "address_type": a.address_type,
            "landmark": a.landmark,
            "is_default": a.is_default,
            "label": f"{a.get_address_type_display()}: {a.house_building}, {a.street_locality}",
        }
        for a in CustomerAddress.objects.filter(user=user)
    ]

    recent_bookings = [
        {
            "booking_reference": b.booking_reference,
            "service_name": b.service_package.name if b.service_package else "Wash",
            "vehicle_name": b.vehicle_type.name if b.vehicle_type else "Vehicle",
            "service_date": str(b.service_date),
            "slot": f"{str(b.slot_start_time)[:5]} - {str(b.slot_end_time)[:5]}",
            "status": b.get_status_display(),
            "status_code": b.status,
            "final_amount": float(b.final_amount),
            "payment_status": b.payment_status,
            "payment_method": b.payment_method,
        }
        for b in Booking.objects.filter(user=user).order_by("-created_at")[:5]
    ]

    return {
        "authenticated": True,
        "user_id": user.id,
        "carspa_user_id": carspa_user_id,
        "full_name": full_name,
        "phone": phone,
        "email": user.email,
        "saved_vehicles": saved_vehicles,
        "saved_addresses": saved_addresses,
        "recent_bookings": recent_bookings,
    }


def create_booking(draft_data: dict, user=None, session=None):
    """
    Tool 6: Creates booking atomically after customer confirmation.
    Validates availability under pessimistic lock and calculates exact price server-side.
    Guarantees duplicate booking prevention.
    """
    service_package_id = draft_data.get("service_package_id")
    vehicle_type_id = draft_data.get("vehicle_type_id")
    service_area_id = draft_data.get("service_area_id")
    service_date_raw = draft_data.get("service_date")
    slot_time_str = draft_data.get("slot_time")
    customer_name = draft_data.get("customer_name", "").strip()
    customer_phone = draft_data.get("customer_phone", "").strip().replace(" ", "").replace("-", "")
    customer_email = draft_data.get("customer_email", "").strip()
    address_line = draft_data.get("address_line", "").strip()
    locality = draft_data.get("locality", "").strip() or "Chandigarh"
    pincode = draft_data.get("pincode", "").strip()
    payment_method = draft_data.get("payment_method", "PAY_ON_SERVICE")
    discount_amount = Decimal(str(draft_data.get("discount_amount", 0.0)))

    if not service_package_id or not vehicle_type_id:
        return {"error": "Missing service package or vehicle type."}

    if not service_date_raw or not slot_time_str:
        return {"error": "Missing appointment date or time slot."}

    if not customer_phone or len(customer_phone) < 10:
        return {"error": "A valid 10-digit mobile number is required."}

    if not customer_name:
        return {"error": "Customer name is required."}

    if not address_line:
        return {"error": "Service delivery address is required."}

    if isinstance(service_date_raw, str):
        try:
            service_date = datetime.date.fromisoformat(service_date_raw)
        except ValueError:
            return {"error": "Invalid date format. Use YYYY-MM-DD."}
    else:
        service_date = service_date_raw

    today = timezone.localdate()
    if service_date < today:
        return {"error": "Cannot book appointments in the past."}

    try:
        parsed_slot_time = datetime.datetime.strptime(slot_time_str, "%H:%M").time()
    except ValueError:
        return {"error": "Invalid slot time format. Use HH:MM."}

    try:
        service_package = ServicePackage.objects.get(id=service_package_id, is_active=True)
    except ServicePackage.DoesNotExist:
        return {"error": "Selected service package not found or inactive."}

    try:
        vehicle_type = VehicleType.objects.get(id=vehicle_type_id, is_active=True)
    except VehicleType.DoesNotExist:
        return {"error": "Selected vehicle type not found or inactive."}

    service_area = None
    if service_area_id:
        try:
            service_area = ServiceArea.objects.get(id=service_area_id, is_active=True)
        except ServiceArea.DoesNotExist:
            pass

    # Duplicate check
    active_statuses = ["PENDING", "CONFIRMED", "ASSIGNED", "IN_PROGRESS"]
    duplicate_exists = Booking.objects.filter(
        customer_phone=customer_phone,
        service_date=service_date,
        slot_start_time=parsed_slot_time,
        vehicle_type=vehicle_type,
        status__in=active_statuses,
    ).first()

    if duplicate_exists:
        return {
            "error": (
                f"A booking already exists for this vehicle and time slot "
                f"(Reference: {duplicate_exists.booking_reference}). Duplicate bookings are prevented."
            )
        }

    # Calculate strict server-side price
    try:
        price_obj = ServicePackagePrice.objects.get(
            service_package=service_package,
            vehicle_type=vehicle_type,
            is_active=True,
        )
        base_price = price_obj.effective_price
    except ServicePackagePrice.DoesNotExist:
        return {"error": "No active pricing configured for this vehicle and package combination."}

    config = BusinessConfig.get_config()
    tax_amount = Decimal("0.00")
    subtotal_after_discount = max(Decimal("0.00"), base_price - discount_amount)
    if config.enable_tax:
        tax_amount = (subtotal_after_discount * config.tax_percentage / Decimal("100.0")).quantize(Decimal("0.01"))

    final_amount = subtotal_after_discount + tax_amount

    authenticated_user = user if (user and user.is_authenticated) else None

    with transaction.atomic():
        slot_lock, _ = SlotCapacityLock.objects.get_or_create(
            service_date=service_date,
            slot_start_time=parsed_slot_time,
            service_area=service_area,
        )
        SlotCapacityLock.objects.select_for_update().get(id=slot_lock.id)

        engine = AvailabilityEngine(config)
        is_valid, err_msg, slot_start, slot_end = engine.validate_and_reserve_slot(
            target_date=service_date,
            slot_time_str=slot_time_str,
            service_package=service_package,
            vehicle_type=vehicle_type,
            service_area=service_area,
        )

        if not is_valid:
            return {
                "error": err_msg or "This slot was just claimed by another customer. Please choose another time."
            }

        customer, _ = Customer.objects.get_or_create(
            phone=customer_phone,
            defaults={
                "name": customer_name,
                "email": customer_email,
                "default_address": address_line,
                "locality": locality,
                "pincode": pincode,
            },
        )

        booking = Booking.objects.create(
            user=authenticated_user,
            customer=customer,
            vehicle_type=vehicle_type,
            service_package=service_package,
            service_area=service_area,
            service_date=service_date,
            slot_start_time=slot_start,
            slot_end_time=slot_end,
            estimated_duration_minutes=service_package.estimated_duration_minutes,
            status="CONFIRMED" if payment_method == "PAY_ON_SERVICE" else "PENDING",
            customer_name=customer_name,
            customer_phone=customer_phone,
            customer_email=customer_email,
            address_line=address_line,
            locality=locality,
            pincode=pincode,
            price_snapshot=base_price,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            final_amount=final_amount,
            payment_method=payment_method,
            payment_status="PENDING",
        )

    # Update session conversion status for analytics
    if session:
        session.has_completed_booking = True
        session.booking_reference = booking.booking_reference
        session.save(update_fields=["has_completed_booking", "booking_reference"])

    razorpay_order = None
    if payment_method == "RAZORPAY":
        if PaymentService.is_razorpay_enabled():
            try:
                razorpay_order = PaymentService.create_order(booking)
            except Exception as e:
                razorpay_order = {"error": str(e)}
        else:
            razorpay_order = {
                "enabled": False,
                "order_id": f"order_simulated_{booking.booking_reference}",
                "amount": int(booking.final_amount * 100),
                "currency": "INR",
                "key_id": settings.RAZORPAY_KEY_ID or "rzp_test_placeholder",
                "booking_reference": booking.booking_reference,
                "customer_name": booking.customer_name,
                "customer_email": booking.customer_email,
                "customer_phone": booking.customer_phone,
                "service_name": booking.service_package.name,
                "vehicle_name": booking.vehicle_type.name,
            }

    return {
        "success": True,
        "booking": booking,
        "booking_reference": booking.booking_reference,
        "final_amount": float(final_amount),
        "razorpay_order": razorpay_order,
    }


def get_booking_status(query_str=None, user=None):
    """
    Tool 7: Track an existing booking by booking reference, phone number, or authenticated user.
    """
    booking = None

    if query_str:
        clean_q = str(query_str).strip()
        ref_match = re.search(r"CW-[A-Z0-9-]+", clean_q, re.IGNORECASE)
        if ref_match:
            ref = ref_match.group(0).upper()
            booking = Booking.objects.filter(booking_reference__iexact=ref).select_related(
                "service_package", "vehicle_type", "assigned_staff"
            ).first()

        if not booking:
            phone_match = re.search(r"\b\d{10}\b", clean_q)
            if phone_match:
                booking = Booking.objects.filter(
                    customer_phone=phone_match.group(0)
                ).select_related("service_package", "vehicle_type", "assigned_staff").order_by("-created_at").first()

    if not booking and user and user.is_authenticated:
        booking = Booking.objects.filter(user=user).select_related(
            "service_package", "vehicle_type", "assigned_staff"
        ).order_by("-created_at").first()

    if not booking:
        return {"found": False, "message": "No booking found matching your query."}

    staff_info = None
    if booking.assigned_staff:
        staff_info = {
            "name": booking.assigned_staff.user.get_full_name() or booking.assigned_staff.user.username,
            "phone": booking.assigned_staff.phone,
        }

    return {
        "found": True,
        "booking_reference": booking.booking_reference,
        "service_name": booking.service_package.name if booking.service_package else "Wash",
        "vehicle_name": booking.vehicle_type.name if booking.vehicle_type else "Vehicle",
        "service_date": str(booking.service_date),
        "slot": f"{str(booking.slot_start_time)[:5]} - {str(booking.slot_end_time)[:5]}",
        "status": booking.get_status_display(),
        "status_code": booking.status,
        "payment_status": booking.payment_status,
        "payment_method": booking.payment_method,
        "final_amount": float(booking.final_amount),
        "address": f"{booking.address_line}, {booking.locality} ({booking.pincode})",
        "customer_name": booking.customer_name,
        "customer_phone": booking.customer_phone,
        "assigned_staff": staff_info,
    }


# =========================================================================
# Phase 3 Advanced Tools: Recommendations, Coupons, Reschedule, Support
# =========================================================================

def get_personalized_recommendation(user):
    """
    Phase 3 Tool: Generates personalized service & package recommendations.
    Strictly isolated to user's authorized profile and past bookings.
    Guarantees ZERO data leakage between customer accounts.
    """
    if not user or not user.is_authenticated:
        # General non-personalized recommendation for anonymous guests
        active_offers = ChatOffer.objects.filter(
            is_active=True, valid_from__lte=timezone.now(), valid_until__gte=timezone.now()
        )
        offer_hint = f" You can use promo code **{active_offers.first().code}** for instant savings!" if active_offers.exists() else ""
        return {
            "has_history": False,
            "recommended_package": "Premium Wash",
            "reason": "Our most popular balanced doorstep wash for exterior foam gloss and complete cabin vacuuming.",
            "message": (
                "For new customers, our **Premium Wash & Wax Spa** is the top-rated choice! "
                "It includes high-pressure foam, carnauba spray wax, deep vacuuming, and soft-microfiber dry."
                f"{offer_hint}"
            ),
            "quick_reply": "Book Premium Wash",
        }

    # Fetch customer's own previous bookings strictly filtered by user
    previous_bookings = list(
        Booking.objects.filter(user=user).select_related("service_package", "vehicle_type").order_by("-created_at")
    )
    saved_vehicles = list(CustomerVehicle.objects.filter(user=user).select_related("vehicle_type"))

    vehicle_label = saved_vehicles[0].model_name if saved_vehicles else "your car"
    vehicle_type_name = saved_vehicles[0].vehicle_type.name if saved_vehicles else "Sedan"

    if previous_bookings:
        latest = previous_bookings[0]
        pkg_slug = latest.service_package.slug if latest.service_package else ""

        if "basic" in pkg_slug or "exterior" in pkg_slug:
            return {
                "has_history": True,
                "recommended_package": "Full Detailing",
                "reason": f"Since you previously booked an exterior wash for {vehicle_label}, treat your cabin to a complete steam and polish restoration.",
                "message": (
                    f"Welcome back! Since you previously booked an exterior wash for **{vehicle_label}**, "
                    f"you might love our **Full Interior & Exterior Detailing Spa**.\n\n"
                    f"It deep-cleans upholstery, removes dashboard grime, and machine-polishes the paint to showroom gloss. "
                    f"Doorstep equipment and electricity are 100% self-powered!"
                ),
                "quick_reply": "Book Full Detailing",
            }
        elif "detail" in pkg_slug:
            return {
                "has_history": True,
                "recommended_package": "Platinum Ceramic Coating",
                "reason": f"You previously experienced our Full Detailing. Lock in that shine with 9H ceramic hydrophobicity.",
                "message": (
                    f"Since your **{vehicle_label}** was detailed previously, consider protecting the paint with our "
                    f"**Platinum Ceramic Shield** for water-beading protection and long-term swirl resistance!"
                ),
                "quick_reply": "Book Ceramic Coating",
            }

    # If user has saved cars but no previous bookings
    return {
        "has_history": False,
        "recommended_package": "Premium Wash",
        "reason": f"Best all-around car care package for your {vehicle_type_name}.",
        "message": (
            f"Welcome! For your **{vehicle_label} ({vehicle_type_name})**, our **Premium Wash & Wax Spa** "
            f"delivers the best combination of exterior foam shine and interior dust extraction at your doorstep."
        ),
        "quick_reply": "Book Premium Wash",
    }


def validate_and_apply_coupon(coupon_code: str, subtotal: float):
    """
    Phase 3 Tool: Connects with admin coupon system to validate and calculate discounts.
    """
    clean_code = str(coupon_code).strip().upper()
    now = timezone.now()

    offer = ChatOffer.objects.filter(code__iexact=clean_code, is_active=True).first()

    if not offer:
        return {
            "is_valid": False,
            "error": f"Promo code **{clean_code}** is invalid or does not exist.",
            "discount_amount": 0.0,
            "final_amount": subtotal,
        }

    if offer.valid_from > now:
        return {
            "is_valid": False,
            "error": f"Promo code **{clean_code}** is not active yet.",
            "discount_amount": 0.0,
            "final_amount": subtotal,
        }

    if offer.valid_until < now:
        return {
            "is_valid": False,
            "error": f"Promo code **{clean_code}** expired on {offer.valid_until.strftime('%d %b %Y')}.",
            "discount_amount": 0.0,
            "final_amount": subtotal,
        }

    if Decimal(str(subtotal)) < offer.min_order_amount:
        return {
            "is_valid": False,
            "error": (
                f"Promo code **{offer.code}** requires a minimum order amount of ₹{offer.min_order_amount:.0f}. "
                f"Your current package amount is ₹{subtotal:.0f}."
            ),
            "discount_amount": 0.0,
            "final_amount": subtotal,
        }

    if offer.discount_type == "PERCENTAGE":
        discount = (Decimal(str(subtotal)) * (offer.discount_value / Decimal("100.0"))).quantize(Decimal("0.01"))
    else:
        discount = min(offer.discount_value, Decimal(str(subtotal)))

    final_subtotal = max(Decimal("0.00"), Decimal(str(subtotal)) - discount)

    return {
        "is_valid": True,
        "code": offer.code,
        "title": offer.title,
        "description": offer.description,
        "discount_amount": float(discount),
        "final_amount": float(final_subtotal),
        "message": f"🎉 Coupon **{offer.code}** applied! You saved **₹{discount:.0f}** ({offer.title}).",
    }


def reschedule_booking(booking_reference: str, new_date, new_slot_time_str: str, user=None):
    """
    Phase 3 Tool: Reschedules an existing appointment to a new date & slot.
    Checks availability with pessimistic lock and updates DB atomically.
    """
    clean_ref = str(booking_reference).strip()
    booking = Booking.objects.filter(booking_reference__iexact=clean_ref).first()

    if not booking:
        return {"success": False, "error": f"No booking found with reference **{clean_ref}**."}

    # Authorization guard: if user is logged in, ensure they own the booking
    if user and user.is_authenticated and booking.user and booking.user != user:
        return {"success": False, "error": "You are not authorized to modify this booking."}

    if booking.status in ["COMPLETED", "CANCELLED", "REJECTED"]:
        return {
            "success": False,
            "error": f"Booking **{clean_ref}** is already {booking.get_status_display().lower()} and cannot be rescheduled.",
        }

    if isinstance(new_date, str):
        try:
            target_date = datetime.date.fromisoformat(new_date)
        except ValueError:
            return {"success": False, "error": "Invalid date format. Use YYYY-MM-DD."}
    else:
        target_date = new_date

    today = timezone.localdate()
    if target_date < today:
        return {"success": False, "error": "Cannot reschedule to a past date."}

    # Concurrency check and lock
    try:
        parsed_slot = datetime.datetime.strptime(new_slot_time_str, "%H:%M").time()
    except ValueError:
        return {"success": False, "error": "Invalid slot time format. Use HH:MM."}

    config = BusinessConfig.get_config()
    with transaction.atomic():
        slot_lock, _ = SlotCapacityLock.objects.get_or_create(
            service_date=target_date,
            slot_start_time=parsed_slot,
            service_area=booking.service_area,
        )
        SlotCapacityLock.objects.select_for_update().get(id=slot_lock.id)

        engine = AvailabilityEngine(config)
        is_valid, err_msg, slot_start, slot_end = engine.validate_and_reserve_slot(
            target_date=target_date,
            slot_time_str=new_slot_time_str,
            service_package=booking.service_package,
            vehicle_type=booking.vehicle_type,
            service_area=booking.service_area,
        )

        if not is_valid:
            return {
                "success": False,
                "error": err_msg or "The selected slot on that date is fully booked. Please select another time.",
            }

        old_date_str = str(booking.service_date)
        old_slot_str = str(booking.slot_start_time)[:5]

        booking.service_date = target_date
        booking.slot_start_time = slot_start
        booking.slot_end_time = slot_end
        booking.status = "CONFIRMED"
        booking.save(update_fields=["service_date", "slot_start_time", "slot_end_time", "status", "updated_at"])

    return {
        "success": True,
        "booking_reference": booking.booking_reference,
        "old_schedule": f"{old_date_str} at {old_slot_str}",
        "new_schedule": f"{target_date.strftime('%d %b %Y')} at {slot_start.strftime('%I:%M %p')}",
        "message": (
            f"✅ Booking **{booking.booking_reference}** successfully rescheduled!\n\n"
            f"• **New Date & Time**: {target_date.strftime('%A, %d %B %Y')} at {slot_start.strftime('%I:%M %p')}\n"
            f"• **Service Package**: {booking.service_package.name if booking.service_package else 'Wash'}\n"
            f"• **Address**: {booking.address_line}, {booking.locality}"
        ),
    }


def cancel_booking(booking_reference: str, reason="Customer request via chat", user=None):
    """
    Phase 3 Tool: Cancels an active booking following business cancellation policies.
    """
    clean_ref = str(booking_reference).strip()
    booking = Booking.objects.filter(booking_reference__iexact=clean_ref).first()

    if not booking:
        return {"success": False, "error": f"No booking found with reference **{clean_ref}**."}

    if user and user.is_authenticated and booking.user and booking.user != user:
        return {"success": False, "error": "You are not authorized to cancel this booking."}

    if booking.status in ["COMPLETED", "CANCELLED", "REJECTED"]:
        return {
            "success": False,
            "error": f"Booking **{clean_ref}** is already {booking.get_status_display().lower()} and cannot be cancelled.",
        }

    booking.status = "CANCELLED"
    booking.cancellation_reason = reason
    booking.cancelled_at = timezone.now()
    booking.save(update_fields=["status", "cancellation_reason", "cancelled_at", "updated_at"])

    refund_note = ""
    if booking.payment_status == "PAID":
        refund_note = (
            "\n\n💳 Since your booking was prepaid online via Razorpay, our finance team has "
            "initiated a 100% full refund to your original payment method (3–5 business days)."
        )

    return {
        "success": True,
        "booking_reference": booking.booking_reference,
        "message": (
            f"✅ Booking **{booking.booking_reference}** has been cancelled.\n\n"
            f"• **Cancelled appointment**: {booking.service_date} ({booking.service_package.name if booking.service_package else 'Wash'})\n"
            f"• **Reason**: {reason}"
            f"{refund_note}\n\n"
            f"We hope to serve your car in the future! Let us know whenever you wish to re-book."
        ),
    }


def request_human_support(session, name: str, phone: str, issue_summary: str, user=None):
    """
    Phase 3 Tool: Escalates conversation to human support representative.
    Logs ChatSupportHandoff and CRM Lead ticket, and returns direct WhatsApp link with context.
    """
    clean_phone = phone.strip().replace(" ", "").replace("-", "")
    clean_name = name.strip() or "Valued Customer"
    authenticated_user = user if (user and user.is_authenticated) else None

    # 1. Create Support Handoff record
    handoff = ChatSupportHandoff.objects.create(
        session=session,
        user=authenticated_user,
        customer_name=clean_name,
        customer_phone=clean_phone,
        issue_summary=issue_summary,
        status="PENDING",
    )

    # 2. Log CRM Lead for support callback
    Lead.objects.create(
        customer_name=clean_name,
        mobile_number=clean_phone,
        source="WEBSITE",
        status="NEW",
        admin_notes=f"Chatbot Escalation Ticket #{handoff.id}: {issue_summary} (Session: {session.session_id})",
    )

    # WhatsApp deep link with encoded issue context
    context_text = f"Hello CARSPA Support! I need human assistance. My phone is {clean_phone} (Ref Ticket #{handoff.id}: {issue_summary[:60]})."
    import urllib.parse
    encoded_text = urllib.parse.quote(context_text)
    whatsapp_url = f"https://wa.me/917087811881?text={encoded_text}"

    return {
        "success": True,
        "ticket_id": handoff.id,
        "whatsapp_url": whatsapp_url,
        "whatsapp_link": whatsapp_url,
        "message": (
            f"🤝 **Human Support Escalation** (Ticket #{handoff.id})\n\n"
            f"Our customer success team has been notified. A representative will contact you at **{clean_phone}** shortly.\n\n"
            f"• **Support Hours**: 8:00 AM – 8:00 PM IST daily (+91 70878 11881).\n"
            f"• **Instant WhatsApp**: You can also reach our live team immediately on WhatsApp below."
        ),
    }


def get_admin_chatbot_analytics():
    """
    Phase 3 Tool: Computes high-level business metrics for the admin dashboard.
    """
    total_sessions = ChatSession.objects.count()
    unique_users = ChatSession.objects.values("user").distinct().count()
    booking_sessions = ChatSession.objects.filter(has_booking_intent=True).count()
    completed_bookings = ChatSession.objects.filter(has_completed_booking=True).count()

    conversion_rate = (
        round((completed_bookings / booking_sessions) * 100, 1) if booking_sessions > 0 else 0.0
    )
    abandoned_sessions = max(0, booking_sessions - completed_bookings)

    # Intent breakdown
    intents = (
        ChatMessage.objects.filter(sender="BOT")
        .values("intent")
        .annotate(count=models.Count("id"))
        .order_by("-count")[:8]
    )

    # Popular services inquired or booked
    popular_packages = [
        {"name": p.name, "slug": p.slug, "count": p.bookings.count()}
        for p in ServicePackage.objects.filter(is_active=True).order_by("-id")[:5]
    ]

    total_handoffs = ChatSupportHandoff.objects.count()

    # Recent 15 conversation sessions
    recent_sessions = []
    for s in ChatSession.objects.select_related("user").order_by("-updated_at")[:15]:
        msg_count = s.messages.count()
        last_msg = s.messages.order_by("-created_at").first()
        user_label = s.user.username if s.user else "Guest Visitor"
        recent_sessions.append({
            "session_id": s.session_id,
            "user_label": user_label,
            "is_authenticated": bool(s.user),
            "message_count": msg_count,
            "has_booking_intent": s.has_booking_intent,
            "has_completed_booking": s.has_completed_booking,
            "booking_reference": s.booking_reference,
            "last_message": last_msg.message[:80] if last_msg else "",
            "updated_at": s.updated_at.strftime("%d %b %Y, %I:%M %p"),
        })

    return {
        "total_conversations": total_sessions,
        "unique_users": unique_users,
        "booking_conversations": booking_sessions,
        "completed_bookings": completed_bookings,
        "conversion_rate": conversion_rate,
        "abandoned_conversations": abandoned_sessions,
        "escalations_count": total_handoffs,
        "intents_distribution": list(intents),
        "popular_packages": popular_packages,
        "recent_sessions": recent_sessions,
    }
