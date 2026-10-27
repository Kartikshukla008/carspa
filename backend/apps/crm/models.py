import uuid
from django.db import models
from django.utils import timezone
from apps.core.models import TimeStampedModel
from apps.services.models import VehicleType, ServicePackage
from apps.staff.models import StaffProfile

def generate_lead_id():
    now = timezone.now()
    random_hex = uuid.uuid4().hex[:6].upper()
    return f"LD-{now.strftime('%Y%m%d')}-{random_hex}"

class Lead(TimeStampedModel):
    STATUS_CHOICES = [
        ("NEW", "New"),
        ("CONTACTED", "Contacted"),
        ("INTERESTED", "Interested"),
        ("BOOKING_PENDING", "Booking Pending"),
        ("CONVERTED", "Converted"),
        ("LOST", "Lost"),
    ]

    SOURCE_CHOICES = [
        ("WEBSITE", "Website Enquiry"),
        ("BOOKING_FLOW", "Booking Flow Incomplete"),
        ("WHATSAPP", "WhatsApp Link"),
        ("CAMPAIGN", "Marketing Campaign"),
        ("REFERRAL", "Referral"),
        ("PHONE", "Phone Call"),
    ]

    lead_id = models.CharField(max_length=40, unique=True, default=generate_lead_id, db_index=True)
    customer_name = models.CharField(max_length=150)
    mobile_number = models.CharField(max_length=20, db_index=True)
    email = models.EmailField(blank=True)
    
    vehicle_type = models.ForeignKey(
        VehicleType, on_delete=models.SET_NULL, null=True, blank=True, related_name="leads"
    )
    service_package = models.ForeignKey(
        ServicePackage, on_delete=models.SET_NULL, null=True, blank=True, related_name="leads"
    )
    requested_date = models.DateField(null=True, blank=True)
    requested_slot = models.CharField(max_length=50, blank=True)
    
    locality = models.CharField(max_length=150, blank=True)
    address = models.TextField(blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    
    source = models.CharField(max_length=30, choices=SOURCE_CHOICES, default="WEBSITE")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="NEW", db_index=True)
    
    assigned_staff = models.ForeignKey(
        StaffProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_leads"
    )
    admin_notes = models.TextField(blank=True)
    booking_reference = models.CharField(max_length=50, blank=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.lead_id} - {self.customer_name} ({self.get_status_display()})"
