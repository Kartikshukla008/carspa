import datetime
import re
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.conf import settings

from apps.core.models import BusinessConfig
from apps.services.models import ServicePackage, VehicleType, ServicePackagePrice, ServiceArea
from apps.bookings.models import Booking, Customer
from apps.accounts.models import CustomerVehicle, CustomerAddress, UserProfile
from apps.scheduling.models import SlotCapacityLock
from apps.scheduling.engine import AvailabilityEngine
from apps.payments.service import PaymentService


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


def create_booking(draft_data: dict, user=None):
    """
    Tool 6: Creates booking atomically after customer confirmation.
    Validates availability under pessimistic lock and calculates exact price server-side.
    Guarantees duplicate booking prevention.
    """
    # 1. Extract required fields
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

    # Date sanity check
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

    # 2. Check for duplicate bookings (same customer phone, date, slot time, vehicle)
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

    # 3. Calculate strict server-side price
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
    if config.enable_tax:
        tax_amount = (base_price * config.tax_percentage / Decimal("100.0")).quantize(Decimal("0.01"))

    final_amount = base_price + tax_amount

    # 4. Atomic transaction with pessimistic slot lock
    authenticated_user = user if (user and user.is_authenticated) else None

    with transaction.atomic():
        # Concurrency Lock
        slot_lock, _ = SlotCapacityLock.objects.get_or_create(
            service_date=service_date,
            slot_start_time=parsed_slot_time,
            service_area=service_area,
        )
        SlotCapacityLock.objects.select_for_update().get(id=slot_lock.id)

        # Validate availability under lock
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

        # Customer record
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

        # Create booking
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
            tax_amount=tax_amount,
            final_amount=final_amount,
            payment_method=payment_method,
            payment_status="PENDING",
        )

    # 5. Generate Razorpay order if online payment
    razorpay_order = None
    if payment_method == "RAZORPAY":
        if PaymentService.is_razorpay_enabled():
            try:
                razorpay_order = PaymentService.create_order(booking)
            except Exception as e:
                # Log error but return created booking so customer can still pay on service or retry
                razorpay_order = {"error": str(e)}
        else:
            # Razorpay simulated order for local / demo environments
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
            # Check if 10-digit phone
            phone_match = re.search(r"\b\d{10}\b", clean_q)
            if phone_match:
                booking = Booking.objects.filter(
                    customer_phone=phone_match.group(0)
                ).select_related("service_package", "vehicle_type", "assigned_staff").order_by("-created_at").first()

    # If no query provided but user is authenticated, retrieve their most recent booking
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
