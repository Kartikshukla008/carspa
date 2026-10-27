import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class BusinessConfig(TimeStampedModel):
    business_name = models.CharField(max_length=200, default="Lustre AutoSpa - Doorstep Car Wash")
    contact_phone = models.CharField(max_length=30, default="+91 98765 43210")
    contact_email = models.EmailField(default="support@lustreautospa.com")
    whatsapp_number = models.CharField(max_length=30, default="+919876543210")
    timezone = models.CharField(max_length=50, default="Asia/Kolkata")
    
    # Scheduling engine rules
    day_open_time = models.TimeField(default="08:00:00")
    day_close_time = models.TimeField(default="20:00:00")
    slot_interval_minutes = models.PositiveIntegerField(default=30)
    default_buffer_minutes = models.PositiveIntegerField(default=30)
    min_advance_hours = models.PositiveIntegerField(default=2)
    max_advance_days = models.PositiveIntegerField(default=14)
    same_day_booking_allowed = models.BooleanField(default=True)
    auto_confirm_bookings = models.BooleanField(default=False)
    
    # Financials
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=18.0)
    enable_tax = models.BooleanField(default=False)

    def __str__(self):
        return self.business_name

    class Meta:
        verbose_name = "Business Configuration"
        verbose_name_plural = "Business Configuration"

    @classmethod
    def get_config(cls):
        config, _ = cls.objects.get_or_create(id=1)
        return config

class AdminAuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=100)
    resource_type = models.CharField(max_length=100)
    resource_id = models.CharField(max_length=100, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} on {self.resource_type}:{self.resource_id} by {self.user}"
