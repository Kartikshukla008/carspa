from django.db import models
from apps.core.models import TimeStampedModel
from apps.bookings.models import Booking

class NotificationLog(TimeStampedModel):
    CHANNEL_CHOICES = [
        ("WHATSAPP", "WhatsApp"),
        ("EMAIL", "Email"),
        ("SMS", "SMS"),
    ]

    STATUS_CHOICES = [
        ("SENT", "Sent Successfully"),
        ("FAILED", "Failed"),
        ("SIMULATED", "Simulated / Logged Only"),
    ]

    booking = models.ForeignKey(
        Booking, on_delete=models.CASCADE, null=True, blank=True, related_name="notifications"
    )
    recipient = models.CharField(max_length=150)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    event_type = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    payload = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sent_at"]

    def __str__(self):
        return f"{self.channel} to {self.recipient} [{self.event_type}]: {self.status}"
