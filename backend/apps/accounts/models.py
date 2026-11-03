import hashlib
import secrets
import uuid
from datetime import timedelta
from django.db import models, transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.core.models import TimeStampedModel
from apps.services.models import VehicleType

User = get_user_model()

def generate_unique_user_id():
    """
    Generate permanent sequential User ID like CARSPA-USER-10001.
    Guaranteed unique and database-level constrained.
    """
    last_profile = UserProfile.objects.order_by("-id").first()
    if last_profile and last_profile.carspa_user_id:
        try:
            parts = last_profile.carspa_user_id.split("-")
            last_num = int(parts[-1])
            candidate = f"CARSPA-USER-{last_num + 1}"
            if not UserProfile.objects.filter(carspa_user_id=candidate).exists():
                return candidate
        except (ValueError, IndexError):
            pass

    # Fallback to total count offset
    count = UserProfile.objects.count()
    candidate = f"CARSPA-USER-{10001 + count}"
    while UserProfile.objects.filter(carspa_user_id=candidate).exists():
        count += 1
        candidate = f"CARSPA-USER-{10001 + count}"
    return candidate


class UserProfile(TimeStampedModel):
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("SUSPENDED", "Suspended"),
        ("INACTIVE", "Inactive"),
    ]

    ROLE_CHOICES = [
        ("SUPER_ADMIN", "Super Admin"),
        ("ADMIN", "Admin"),
        ("MANAGER", "Manager"),
        ("STAFF", "Staff/Service Executive"),
        ("CUSTOMER", "Customer"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    carspa_user_id = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        default=generate_unique_user_id,
        editable=False,
    )
    phone = models.CharField(max_length=20, unique=True, db_index=True)
    full_name = models.CharField(max_length=150)
    account_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ACTIVE")
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default="CUSTOMER", db_index=True)
    is_phone_verified = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"

    @property
    def user_id(self):
        return self.carspa_user_id

    def __str__(self):
        return f"{self.full_name} ({self.carspa_user_id}) - {self.phone}"

    def save(self, *args, **kwargs):
        if not self.carspa_user_id:
            self.carspa_user_id = generate_unique_user_id()
        super().save(*args, **kwargs)


class CustomerAddress(TimeStampedModel):
    ADDRESS_TYPE_CHOICES = [
        ("HOME", "Home"),
        ("WORK", "Work"),
        ("OTHER", "Other"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="saved_addresses")
    house_building = models.CharField(max_length=255, help_text="Flat / House / Villa / Building name")
    street_locality = models.CharField(max_length=255, help_text="Street / Sector / Locality")
    city = models.CharField(max_length=100, default="Chandigarh")
    state = models.CharField(max_length=100, default="Punjab")
    pincode = models.CharField(max_length=10)
    address_type = models.CharField(max_length=20, choices=ADDRESS_TYPE_CHOICES, default="HOME")
    landmark = models.CharField(max_length=255, blank=True)
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ["-is_default", "-created_at"]
        verbose_name = "Customer Address"
        verbose_name_plural = "Customer Addresses"

    def __str__(self):
        return f"{self.get_address_type_display()}: {self.house_building}, {self.street_locality}, {self.city}"

    def save(self, *args, **kwargs):
        # If this is set as default, unset default on other addresses of the user
        if self.is_default:
            CustomerAddress.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class CustomerVehicle(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="saved_vehicles")
    vehicle_type = models.ForeignKey(VehicleType, on_delete=models.PROTECT, related_name="customer_vehicles")
    brand = models.CharField(max_length=100, help_text="Make/Brand e.g. Honda, Hyundai, Tata")
    model_name = models.CharField(max_length=100, help_text="Model name e.g. City, Creta, Nexon")
    license_plate = models.CharField(max_length=30, blank=True, help_text="Vehicle Reg Number e.g. CH01-AB-1234")
    color = models.CharField(max_length=50, blank=True)
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ["-is_default", "-created_at"]
        verbose_name = "Customer Vehicle"
        verbose_name_plural = "Customer Vehicles"

    def __str__(self):
        reg = f" ({self.license_plate})" if self.license_plate else ""
        return f"{self.brand} {self.model_name}{reg} - {self.vehicle_type.name}"

    def save(self, *args, **kwargs):
        if self.is_default:
            CustomerVehicle.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_resets")
    token = models.CharField(max_length=100, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    @classmethod
    def create_for_user(cls, user, expires_hours=2):
        # Invalidate old unused tokens for this user
        cls.objects.filter(user=user, is_used=False).update(is_used=True)
        token_str = uuid.uuid4().hex + uuid.uuid4().hex[:16]
        expires_at = timezone.now() + timedelta(hours=expires_hours)
        return cls.objects.create(
            user=user,
            token=token_str,
            expires_at=expires_at,
        )

    def is_valid(self):
        return not self.is_used and timezone.now() <= self.expires_at


class PhoneOTP(models.Model):
    """
    Cryptographic Phone OTP model for passwordless login via WhatsApp & SMS.
    OTPs are hashed with SHA-256 before storage to protect user privacy and credentials.
    """
    CHANNEL_CHOICES = [
        ("WHATSAPP", "WhatsApp"),
        ("SMS", "SMS"),
    ]

    phone = models.CharField(max_length=20, db_index=True)
    otp_hash = models.CharField(max_length=128)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default="WHATSAPP")
    attempts = models.PositiveIntegerField(default=0)
    is_verified = models.BooleanField(default=False)
    expires_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Phone OTP"
        verbose_name_plural = "Phone OTPs"

    @classmethod
    def hash_otp(cls, raw_otp: str) -> str:
        return hashlib.sha256(raw_otp.encode("utf-8")).hexdigest()

    @classmethod
    def generate_for_phone(cls, phone: str, channel: str = "WHATSAPP", valid_minutes: int = 5):
        # Invalidate existing active OTPs for this phone
        cls.objects.filter(phone=phone, is_verified=False).delete()

        # Cryptographically secure 6-digit random code (100000 - 999999)
        raw_code = f"{secrets.randbelow(900000) + 100000}"
        otp_hash = cls.hash_otp(raw_code)
        expires_at = timezone.now() + timedelta(minutes=valid_minutes)

        otp_record = cls.objects.create(
            phone=phone,
            otp_hash=otp_hash,
            channel=channel,
            expires_at=expires_at,
        )
        return raw_code, otp_record

    @classmethod
    def verify_for_phone(cls, phone: str, raw_code: str) -> tuple[bool, str]:
        record = cls.objects.filter(phone=phone, is_verified=False).order_by("-created_at").first()
        if not record:
            return False, "No active OTP request found. Please request a new verification code."

        if timezone.now() > record.expires_at:
            record.delete()
            return False, "Verification code has expired. Please request a new one."

        if record.attempts >= 3:
            record.delete()
            return False, "Too many failed attempts. Code invalidated for your security. Please request a new one."

        record.attempts += 1
        record.save(update_fields=["attempts"])

        expected_hash = cls.hash_otp(raw_code.strip())
        if secrets.compare_digest(record.otp_hash, expected_hash):
            record.is_verified = True
            record.save(update_fields=["is_verified"])
            return True, "Verification successful."

        remaining = 3 - record.attempts
        return False, f"Incorrect verification code. {remaining} attempt(s) remaining."

