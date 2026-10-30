import datetime
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.core.models import BusinessConfig
from apps.services.models import VehicleType, ServicePackage, ServicePackagePrice, ServiceArea
from apps.services.constants import ADDONS_BY_ID
from apps.staff.models import StaffProfile
from apps.crm.models import Lead
from apps.bookings.models import Booking, Customer, BookingStatusHistory, BookingAssignment
from apps.scheduling.engine import AvailabilityEngine
from apps.notifications.service import NotificationService
from apps.payments.service import PaymentService

class BookingCreateSerializer(serializers.Serializer):
    vehicle_type_id = serializers.IntegerField()
    service_package_id = serializers.IntegerField()
    service_area_id = serializers.IntegerField(required=False, allow_null=True)
    service_date = serializers.DateField()
    slot_time = serializers.CharField(max_length=10)
    
    customer_name = serializers.CharField(max_length=150)
    customer_phone = serializers.CharField(max_length=20)
    customer_email = serializers.EmailField(required=False, allow_blank=True)
    
    address_line = serializers.CharField()
    locality = serializers.CharField(max_length=150)
    landmark = serializers.CharField(max_length=150, required=False, allow_blank=True)
    pincode = serializers.CharField(max_length=10, required=False, allow_blank=True)
    special_instructions = serializers.CharField(required=False, allow_blank=True)
    selected_addon_ids = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    
    payment_method = serializers.ChoiceField(
        choices=["PAY_ON_SERVICE", "RAZORPAY"], default="PAY_ON_SERVICE"
    )
    lead_id = serializers.CharField(required=False, allow_blank=True)

    def validate_customer_phone(self, value):
        cleaned = value.replace(" ", "").replace("-", "")
        if len(cleaned) < 10:
            raise serializers.ValidationError("Please provide a valid 10-digit mobile number.")
        return cleaned

    def validate_service_date(self, value):
        today = timezone.localdate()
        if value < today:
            raise serializers.ValidationError("Cannot book appointments in the past.")
        return value

    def create(self, validated_data):
        vehicle_type_id = validated_data["vehicle_type_id"]
        service_package_id = validated_data["service_package_id"]
        service_area_id = validated_data.get("service_area_id")
        service_date = validated_data["service_date"]
        slot_time_str = validated_data["slot_time"]
        
        try:
            vehicle_type = VehicleType.objects.get(id=vehicle_type_id, is_active=True)
        except VehicleType.DoesNotExist:
            raise serializers.ValidationError({"vehicle_type_id": "Vehicle type not found or inactive."})

        try:
            service_package = ServicePackage.objects.get(id=service_package_id, is_active=True)
        except ServicePackage.DoesNotExist:
            raise serializers.ValidationError({"service_package_id": "Service package not found or inactive."})

        service_area = None
        if service_area_id:
            try:
                service_area = ServiceArea.objects.get(id=service_area_id, is_active=True)
            except ServiceArea.DoesNotExist:
                pass

        # Calculate Price snapshot strictly on the server
        try:
            price_obj = ServicePackagePrice.objects.get(
                service_package=service_package,
                vehicle_type=vehicle_type,
                is_active=True
            )
            base_price = price_obj.effective_price
        except ServicePackagePrice.DoesNotExist:
            raise serializers.ValidationError({"price": "No active pricing configured for this vehicle and package combination."})

        # Calculate Add-ons total & validate IDs server-side
        selected_addon_ids = validated_data.get("selected_addon_ids", [])
        validated_addons = []
        addons_total = Decimal("0.00")
        addon_duration = 0

        for addon_id in selected_addon_ids:
            if addon_id in ADDONS_BY_ID:
                info = ADDONS_BY_ID[addon_id]
                validated_addons.append({
                    "id": info["id"],
                    "name": info["name"],
                    "price": str(info["price"]),
                })
                addons_total += info["price"]
                addon_duration += info.get("duration_minutes", 0)

        subtotal = base_price + addons_total

        config = BusinessConfig.get_config()
        tax_amount = Decimal("0.00")
        if config.enable_tax:
            tax_amount = (subtotal * config.tax_percentage / Decimal("100.0")).quantize(Decimal("0.01"))
        
        final_amount = subtotal + tax_amount

        # Race-safe atomic validation and booking creation
        with transaction.atomic():
            # Run availability engine validation
            engine = AvailabilityEngine(config)
            is_valid, err_msg, slot_start, slot_end = engine.validate_and_reserve_slot(
                target_date=service_date,
                slot_time_str=slot_time_str,
                service_package=service_package,
                vehicle_type=vehicle_type,
                service_area=service_area,
            )

            if not is_valid:
                raise serializers.ValidationError({"slot_time": err_msg})

            # Create or update Customer profile
            phone = validated_data["customer_phone"]
            customer, _ = Customer.objects.get_or_create(
                phone=phone,
                defaults={
                    "name": validated_data["customer_name"],
                    "email": validated_data.get("customer_email", ""),
                    "default_address": validated_data["address_line"],
                    "locality": validated_data["locality"],
                    "pincode": validated_data.get("pincode", ""),
                }
            )

            # Auto confirm if configured
            initial_status = "CONFIRMED" if config.auto_confirm_bookings else "PENDING"

            # Check existing lead or create lead
            lead = None
            lead_id = validated_data.get("lead_id")
            if lead_id:
                lead = Lead.objects.filter(lead_id=lead_id).first()
            if not lead:
                lead = Lead.objects.create(
                    customer_name=validated_data["customer_name"],
                    mobile_number=phone,
                    email=validated_data.get("customer_email", ""),
                    vehicle_type=vehicle_type,
                    service_package=service_package,
                    requested_date=service_date,
                    requested_slot=slot_time_str,
                    locality=validated_data["locality"],
                    address=validated_data["address_line"],
                    pincode=validated_data.get("pincode", ""),
                    source="WEBSITE",
                    status="CONVERTED" if initial_status == "CONFIRMED" else "BOOKING_PENDING",
                )

            booking = Booking.objects.create(
                customer=customer,
                lead=lead,
                vehicle_type=vehicle_type,
                service_package=service_package,
                service_area=service_area,
                service_date=service_date,
                slot_start_time=slot_start,
                slot_end_time=slot_end,
                estimated_duration_minutes=service_package.estimated_duration_minutes + addon_duration,
                status=initial_status,
                customer_name=validated_data["customer_name"],
                customer_phone=phone,
                customer_email=validated_data.get("customer_email", ""),
                address_line=validated_data["address_line"],
                locality=validated_data["locality"],
                landmark=validated_data.get("landmark", ""),
                pincode=validated_data.get("pincode", ""),
                special_instructions=validated_data.get("special_instructions", ""),
                selected_addons=validated_addons,
                price_snapshot=base_price,
                tax_amount=tax_amount,
                final_amount=final_amount,
                payment_method=validated_data.get("payment_method", "PAY_ON_SERVICE"),
                payment_status="PENDING",
            )

            # Update lead reference
            if lead:
                lead.booking_reference = booking.booking_reference
                lead.status = "CONVERTED" if initial_status == "CONFIRMED" else "BOOKING_PENDING"
                lead.save(update_fields=["booking_reference", "status"])

            # Record audit/status history
            BookingStatusHistory.objects.create(
                booking=booking,
                from_status="",
                to_status=initial_status,
                notes="Initial customer booking submission through web platform."
            )

        # Dispatch notifications outside atomic block
        try:
            NotificationService.send_booking_created(booking)
        except Exception:
            pass

        return booking

class BookingDetailSerializer(serializers.ModelSerializer):
    vehicle_type_name = serializers.CharField(source="vehicle_type.name", read_only=True)
    service_package_name = serializers.CharField(source="service_package.name", read_only=True)
    service_area_name = serializers.CharField(source="service_area.name", read_only=True)
    assigned_staff_name = serializers.CharField(source="assigned_staff.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)
    payment_details = serializers.SerializerMethodField()

    def get_payment_details(self, obj):
        latest = obj.payments.order_by("-created_at").first()
        if latest:
            return {
                "id": latest.id,
                "provider": latest.provider,
                "amount": str(latest.amount),
                "currency": latest.currency,
                "order_id": latest.order_id,
                "payment_id": latest.payment_id,
                "status": latest.status,
                "created_at": latest.created_at.isoformat(),
            }
        return None

    class Meta:
        model = Booking
        fields = [
            "id",
            "booking_reference",
            "service_date",
            "slot_start_time",
            "slot_end_time",
            "estimated_duration_minutes",
            "status",
            "status_display",
            "customer_name",
            "customer_phone",
            "customer_email",
            "address_line",
            "locality",
            "landmark",
            "pincode",
            "special_instructions",
            "selected_addons",
            "price_snapshot",
            "tax_amount",
            "discount_amount",
            "final_amount",
            "payment_method",
            "payment_method_display",
            "payment_status",
            "payment_details",
            "vehicle_type",
            "vehicle_type_name",
            "service_package",
            "service_package_name",
            "service_area",
            "service_area_name",
            "assigned_staff",
            "assigned_staff_name",
            "cancellation_reason",
            "cancelled_at",
            "admin_notes",
            "created_at",
            "updated_at",
        ]
