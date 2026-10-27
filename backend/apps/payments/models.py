from django.db import models
from apps.core.models import TimeStampedModel
from apps.bookings.models import Booking

class Payment(TimeStampedModel):
    PROVIDER_CHOICES = [
        ("RAZORPAY", "Razorpay"),
        ("PAY_ON_SERVICE", "Pay On Service"),
        ("UPI_MANUAL", "UPI Direct"),
    ]

    STATUS_CHOICES = [
        ("INITIATED", "Initiated"),
        ("SUCCESS", "Success"),
        ("FAILED", "Failed"),
        ("REFUNDED", "Refunded"),
    ]

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="payments")
    provider = models.CharField(max_length=30, choices=PROVIDER_CHOICES, default="PAY_ON_SERVICE")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="INR")
    order_id = models.CharField(max_length=100, blank=True)
    payment_id = models.CharField(max_length=100, blank=True)
    signature = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="INITIATED")
    raw_response = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment {self.id} for {self.booking.booking_reference}: ₹{self.amount} ({self.status})"
