import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.core.models import TimeStampedModel
from apps.services.models import VehicleType, ServicePackage, ServiceArea
from apps.staff.models import StaffProfile
from apps.crm.models import Lead

User = get_user_model()

def generate_booking_reference():
    now = timezone.now()
    random_hex = uuid.uuid4().hex[:6].upper()
    return f"CW-{now.strftime('%Y%m%d')}-{random_hex}"

class Customer(TimeStampedModel):
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, unique=True, db_index=True)
    email = models.EmailField(blank=True)
    default_address = models.TextField(blank=True)
    locality = models.CharField(max_length=150, blank=True)
    pincode = models.CharField(max_length=10, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.phone})"

class Booking(TimeStampedModel):
    STATUS_CHOICES = [
        ("PENDING", "Pending Confirmation"),
        ("CONFIRMED", "Confirmed"),
        ("ASSIGNED", "Assigned"),
        ("IN_PROGRESS", "In Progress"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
        ("REJECTED", "Rejected"),
    ]

    PAYMENT_METHOD_CHOICES = [
        ("PAY_ON_SERVICE", "Pay After Service (Cash/UPI)"),
        ("RAZORPAY", "Razorpay Online"),
    ]

    PAYMENT_STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("PAID", "Paid"),
        ("FAILED", "Failed"),
        ("REFUNDED", "Refunded"),
    ]

    booking_reference = models.CharField(
        max_length=50, unique=True, default=generate_booking_reference, db_index=True
    )
    customer = models.ForeignKey(
        Customer, on_delete=models.PROTECT, related_name="bookings"
    )
    lead = models.ForeignKey(
        Lead, on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings"
    )
    
    vehicle_type = models.ForeignKey(
        VehicleType, on_delete=models.PROTECT, related_name="bookings"
    )
    service_package = models.ForeignKey(
        ServicePackage, on_delete=models.PROTECT, related_name="bookings"
    )
    service_area = models.ForeignKey(
        ServiceArea, on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings"
    )
    
    service_date = models.DateField(db_index=True)
    slot_start_time = models.TimeField()
    slot_end_time = models.TimeField()
    estimated_duration_minutes = models.PositiveIntegerField(default=60)
    
    status = models.CharField(
        max_length=30, choices=STATUS_CHOICES, default="PENDING", db_index=True
    )
    
    # Customer Snapshot (Preserves booking data even if profile changes)
    customer_name = models.CharField(max_length=150)
    customer_phone = models.CharField(max_length=20, db_index=True)
    customer_email = models.EmailField(blank=True)
    
    address_line = models.TextField()
    locality = models.CharField(max_length=150, db_index=True)
    landmark = models.CharField(max_length=150, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    special_instructions = models.TextField(blank=True)
    
    # Financial snapshot
    price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    final_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    payment_method = models.CharField(
        max_length=30, choices=PAYMENT_METHOD_CHOICES, default="PAY_ON_SERVICE"
    )
    payment_status = models.CharField(
        max_length=30, choices=PAYMENT_STATUS_CHOICES, default="PENDING", db_index=True
    )
    
    assigned_staff = models.ForeignKey(
        StaffProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_bookings"
    )
    cancellation_reason = models.TextField(blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-service_date", "-slot_start_time", "-created_at"]
        indexes = [
            models.Index(fields=["service_date", "status"]),
            models.Index(fields=["customer_phone", "status"]),
        ]

    def __str__(self):
        return f"{self.booking_reference} - {self.customer_name} ({self.service_date} {self.slot_start_time})"

class BookingStatusHistory(TimeStampedModel):
    booking = models.ForeignKey(
        Booking, on_delete=models.CASCADE, related_name="status_history"
    )
    from_status = models.CharField(max_length=30)
    to_status = models.CharField(max_length=30)
    changed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.booking.booking_reference}: {self.from_status} -> {self.to_status}"

class BookingAssignment(TimeStampedModel):
    booking = models.ForeignKey(
        Booking, on_delete=models.CASCADE, related_name="assignments"
    )
    staff = models.ForeignKey(
        StaffProfile, on_delete=models.CASCADE, related_name="assignments"
    )
    assigned_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
