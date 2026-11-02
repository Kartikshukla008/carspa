import re
import uuid
from django.db import transaction
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.authtoken.models import Token
from apps.accounts.models import (
    UserProfile,
    CustomerAddress,
    CustomerVehicle,
    PasswordResetToken,
    generate_unique_user_id,
)
from apps.services.models import VehicleType

User = get_user_model()

def clean_phone_number(phone_raw: str) -> str:
    """Normalize phone to 10-digit standard Indian format."""
    digits = re.sub(r"\D", "", phone_raw or "")
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    return digits


class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150, min_length=2)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)
    terms_accepted = serializers.BooleanField(required=True)

    def validate_terms_accepted(self, value):
        if not value:
            raise serializers.ValidationError("You must agree to the Terms of Service & Privacy Policy.")
        return value

    def validate_phone(self, value):
        cleaned = clean_phone_number(value)
        if len(cleaned) != 10:
            raise serializers.ValidationError("Please provide a valid 10-digit Indian mobile number.")
        if UserProfile.objects.filter(phone=cleaned).exists():
            raise serializers.ValidationError("An account with this mobile number already exists. Please log in.")
        return cleaned

    def validate_email(self, value):
        email_clean = value.strip().lower()
        if User.objects.filter(email__iexact=email_clean).exists():
            raise serializers.ValidationError("An account with this email address already exists. Please log in.")
        return email_clean

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        # Run Django's password validators
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        email = validated_data["email"].strip().lower()
        phone = validated_data["phone"]
        full_name = validated_data["full_name"].strip()
        password = validated_data["password"]

        with transaction.atomic():
            # Use email as primary username; fallback to phone if somehow taken
            username = email
            if User.objects.filter(username=username).exists():
                username = f"{phone}_{uuid.uuid4().hex[:6]}"

            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=full_name.split()[0] if full_name else "",
                last_name=" ".join(full_name.split()[1:]) if len(full_name.split()) > 1 else "",
                password=password,
            )

            profile = UserProfile.objects.create(
                user=user,
                phone=phone,
                full_name=full_name,
                carspa_user_id=generate_unique_user_id(),
            )

            token, _ = Token.objects.get_or_create(user=user)
            return user, profile, token


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(help_text="Email address or 10-digit mobile number")
    password = serializers.CharField(write_only=True)
    remember_me = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        identifier = attrs.get("identifier", "").strip()
        password = attrs.get("password", "")

        if not identifier or not password:
            raise serializers.ValidationError("Please enter both your email/phone and password.")

        user = None
        if "@" in identifier:
            # Login via email
            user = User.objects.filter(email__iexact=identifier.lower()).first()
        else:
            # Login via phone
            cleaned_phone = clean_phone_number(identifier)
            profile = UserProfile.objects.filter(phone=cleaned_phone).select_related("user").first()
            if profile:
                user = profile.user

        if not user or not user.check_password(password):
            raise serializers.ValidationError("Invalid email/mobile number or password. Please try again.")

        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated. Please contact customer care.")

        if hasattr(user, "profile") and user.profile.account_status == "SUSPENDED":
            raise serializers.ValidationError("This account has been suspended. Please contact customer support.")

        attrs["user"] = user
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.CharField(source="carspa_user_id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    date_joined = serializers.DateTimeField(source="user.date_joined", read_only=True)
    last_login = serializers.DateTimeField(source="user.last_login", read_only=True)
    is_staff = serializers.BooleanField(source="user.is_staff", read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            "user_id",
            "full_name",
            "email",
            "phone",
            "username",
            "role",
            "account_status",
            "is_phone_verified",
            "is_email_verified",
            "date_joined",
            "last_login",
            "is_staff",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["user_id", "email", "username", "role", "account_status", "date_joined", "last_login", "is_staff", "created_at", "updated_at"]

    def update(self, instance, validated_data):
        instance.full_name = validated_data.get("full_name", instance.full_name)
        new_phone = validated_data.get("phone")
        if new_phone:
            cleaned = clean_phone_number(new_phone)
            if cleaned != instance.phone:
                if UserProfile.objects.filter(phone=cleaned).exclude(pk=instance.pk).exists():
                    raise serializers.ValidationError({"phone": "This phone number is already registered to another account."})
                instance.phone = cleaned
        instance.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "New passwords do not match."})
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    identifier = serializers.CharField(help_text="Registered email address or mobile number")

    def validate_identifier(self, value):
        val = value.strip()
        user = None
        if "@" in val:
            user = User.objects.filter(email__iexact=val.lower()).first()
        else:
            cleaned = clean_phone_number(val)
            profile = UserProfile.objects.filter(phone=cleaned).select_related("user").first()
            if profile:
                user = profile.user

        if not user:
            # For security, avoid leaking whether account exists or not, but validate format
            return val
        return val


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        validate_password(attrs["new_password"])

        token_obj = PasswordResetToken.objects.filter(token=attrs["token"]).select_related("user").first()
        if not token_obj or not token_obj.is_valid():
            raise serializers.ValidationError({"token": "Invalid or expired password reset link. Please request a new one."})

        attrs["reset_token_obj"] = token_obj
        return attrs


class CustomerAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerAddress
        fields = [
            "id",
            "house_building",
            "street_locality",
            "city",
            "state",
            "pincode",
            "address_type",
            "landmark",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class CustomerVehicleSerializer(serializers.ModelSerializer):
    vehicle_type_name = serializers.CharField(source="vehicle_type.name", read_only=True)

    class Meta:
        model = CustomerVehicle
        fields = [
            "id",
            "vehicle_type",
            "vehicle_type_name",
            "brand",
            "model_name",
            "license_plate",
            "color",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "vehicle_type_name", "created_at", "updated_at"]

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
