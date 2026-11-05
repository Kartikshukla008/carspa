import uuid
from django.db import models
from django.contrib.auth import get_user_model
from apps.core.models import TimeStampedModel

User = get_user_model()


class ChatSession(TimeStampedModel):
    """
    Stores customer chatbot conversation sessions.
    Linked to authenticated user if logged in, or anonymous session ID.
    Tracks conversion and booking analytics.
    """
    session_id = models.CharField(max_length=100, unique=True, db_index=True)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_sessions"
    )
    has_booking_intent = models.BooleanField(default=False, db_index=True)
    has_completed_booking = models.BooleanField(default=False, db_index=True)
    booking_reference = models.CharField(max_length=50, blank=True, default="", db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Chat Session"
        verbose_name_plural = "Chat Sessions"

    def __str__(self):
        user_label = self.user.username if self.user else "Anonymous"
        return f"ChatSession {self.session_id[:8]} ({user_label})"


class ChatMessage(TimeStampedModel):
    """
    Individual message in a chatbot conversation session.
    """
    SENDER_CHOICES = [
        ("USER", "User"),
        ("BOT", "Bot"),
        ("SYSTEM", "System"),
    ]

    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name="messages"
    )
    sender = models.CharField(max_length=20, choices=SENDER_CHOICES, default="USER")
    message = models.TextField()
    intent = models.CharField(max_length=50, blank=True, default="")
    quick_replies = models.JSONField(default=list, blank=True)
    action_type = models.CharField(max_length=50, blank=True, default="")
    action_payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Chat Message"
        verbose_name_plural = "Chat Messages"

    def __str__(self):
        return f"[{self.sender}] {self.message[:40]}"


class ChatOffer(TimeStampedModel):
    """
    Promotions, coupons, and seasonal discounts returned by the chatbot.
    Expired offers are strictly excluded from customer answers.
    """
    DISCOUNT_TYPE_CHOICES = [
        ("PERCENTAGE", "Percentage"),
        ("FLAT", "Flat Amount (₹)"),
    ]

    code = models.CharField(max_length=50, unique=True, db_index=True)
    title = models.CharField(max_length=150)
    description = models.TextField()
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES, default="FLAT")
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-valid_until"]
        verbose_name = "Chat Offer"
        verbose_name_plural = "Chat Offers"

    def __str__(self):
        return f"{self.code} - {self.title}"


class ChatFAQ(TimeStampedModel):
    """
    Verified FAQs for CARSPA doorstep car washing knowledge base.
    """
    CATEGORY_CHOICES = [
        ("GENERAL", "General"),
        ("SERVICES", "Services & Detailing"),
        ("PRICING", "Pricing & Payment"),
        ("BOOKING", "Booking & Scheduling"),
        ("DOORSTEP", "Doorstep Requirements"),
    ]

    question = models.CharField(max_length=255)
    answer = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default="GENERAL")
    keywords = models.CharField(
        max_length=255,
        blank=True,
        help_text="Comma-separated keywords for intent matching"
    )
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "id"]
        verbose_name = "Chat FAQ"
        verbose_name_plural = "Chat FAQs"

    def __str__(self):
        return self.question


class ChatSupportHandoff(TimeStampedModel):
    """
    Records customer escalations to human support representatives.
    """
    STATUS_CHOICES = [
        ("PENDING", "Pending Support"),
        ("IN_PROGRESS", "In Progress"),
        ("RESOLVED", "Resolved"),
    ]

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="handoffs")
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="chat_handoffs")
    customer_name = models.CharField(max_length=150)
    customer_phone = models.CharField(max_length=20)
    issue_summary = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    resolution_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Support Handoff"
        verbose_name_plural = "Support Handoffs"

    def __str__(self):
        return f"Handoff for {self.customer_name} ({self.customer_phone}) - {self.status}"
