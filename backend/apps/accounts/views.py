import csv
import secrets
from decimal import Decimal
from django.conf import settings
from django.db.models import Sum, Count, Q
from django.contrib.auth import login, logout, get_user_model
from django.http import HttpResponse
from rest_framework import views, viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action

from apps.core.models import AdminAuditLog
from apps.accounts.models import (
    UserProfile,
    CustomerAddress,
    CustomerVehicle,
    PasswordResetToken,
    PhoneOTP,
)
from apps.accounts.serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    CustomerAddressSerializer,
    CustomerVehicleSerializer,
    clean_phone_number,
)
from apps.bookings.models import Booking
from apps.bookings.serializers import BookingDetailSerializer
from apps.payments.models import Payment

User = get_user_model()


class RegisterAPIView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user, profile, token = serializer.save()
            login(request, user)
            return Response({
                "message": "Account created successfully! Welcome to CARSPA.",
                "token": token.key,
                "user": UserProfileSerializer(profile).data,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginAPIView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            token, _ = Token.objects.get_or_create(user=user)
            login(request, user)

            # Ensure profile exists (e.g. for superuser or pre-existing staff user)
            profile, _ = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    "full_name": user.get_full_name() or user.username,
                    "phone": clean_phone_number(getattr(user, "phone", "") or user.username[-10:] if len(user.username) >= 10 else "7087811881"),
                }
            )

            return Response({
                "message": "Login successful.",
                "token": token.key,
                "user": UserProfileSerializer(profile).data,
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PhoneOTPSendAPIView(views.APIView):
    """
    Sends a cryptographically generated 6-digit OTP via WhatsApp or SMS for passwordless login.
    Rate-limited to 3 requests per 5 minutes per phone.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        raw_phone = request.data.get("phone", "").strip()
        channel = request.data.get("channel", "WHATSAPP").upper()
        if channel not in ("WHATSAPP", "SMS"):
            channel = "WHATSAPP"

        cleaned_phone = clean_phone_number(raw_phone)
        if not cleaned_phone or len(cleaned_phone) < 10:
            return Response(
                {"error": "Please provide a valid 10-digit mobile number."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Rate Limit: max 3 requests / 300s per phone
        from apps.core.ratelimit import RateLimiter
        allowed, remaining, retry_after = RateLimiter.is_allowed(
            key=f"otp_send:{cleaned_phone}",
            limit=3,
            window_seconds=300,
        )
        if not allowed:
            return Response(
                {
                    "error": "Rate limit exceeded",
                    "detail": f"Too many OTP requests. Please wait {retry_after} seconds before requesting another code.",
                    "retry_after": retry_after,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        raw_code, otp_record = PhoneOTP.generate_for_phone(
            phone=cleaned_phone,
            channel=channel,
            valid_minutes=5,
        )

        from apps.notifications.service import NotificationService
        otp_message = (
            f"Your CARSPA doorstep detailing verification code is {raw_code}. "
            f"Valid for 5 minutes. Please do not share this code with anyone."
        )
        NotificationService._dispatch(
            booking=None,
            recipient=cleaned_phone,
            channel=channel,
            event_type="LOGIN_OTP",
            message=otp_message,
            subject="CARSPA Verification Code",
        )

        has_real_gateway = bool(
            getattr(settings, "WHATSAPP_API_TOKEN", "")
            or getattr(settings, "TWILIO_ACCOUNT_SID", "")
            or getattr(settings, "FAST2SMS_API_KEY", "")
        )

        return Response({
            "message": f"Verification code dispatched via {channel}.",
            "phone": cleaned_phone,
            "channel": channel,
            "expires_in_seconds": 300,
            "has_real_gateway": has_real_gateway,
            "dev_preview_code": raw_code if settings.DEBUG and not has_real_gateway else None,
        }, status=status.HTTP_200_OK)


class PhoneOTPVerifyAPIView(views.APIView):
    """
    Verifies the 6-digit phone OTP and issues an authenticated session & token.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        raw_phone = request.data.get("phone", "").strip()
        raw_code = str(request.data.get("otp", "")).strip()

        cleaned_phone = clean_phone_number(raw_phone)
        if not cleaned_phone or len(cleaned_phone) < 10:
            return Response(
                {"error": "Please provide a valid 10-digit mobile number."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not raw_code or len(raw_code) != 6 or not raw_code.isdigit():
            return Response(
                {"error": "Please provide a valid 6-digit numeric verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_valid, msg = PhoneOTP.verify_for_phone(cleaned_phone, raw_code)
        if not is_valid:
            return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create User
        username = f"user_{cleaned_phone[-10:]}"
        user = User.objects.filter(username=username).first()
        if not user:
            existing_profile = UserProfile.objects.filter(phone=cleaned_phone).first()
            if existing_profile:
                user = existing_profile.user
            else:
                user = User.objects.create_user(
                    username=username,
                    email=f"{cleaned_phone[-10:]}@customer.carspa.in",
                    password=secrets.token_urlsafe(16),
                )

        profile, _ = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                "phone": cleaned_phone,
                "full_name": user.get_full_name() or f"Member {cleaned_phone[-4:]}",
                "role": "CUSTOMER",
                "is_phone_verified": True,
            },
        )
        profile.is_phone_verified = True
        profile.save(update_fields=["is_phone_verified"])

        token, _ = Token.objects.get_or_create(user=user)
        login(request, user)

        from apps.core.audit import record_audit_log
        record_audit_log(
            user=user,
            action="OTP_LOGIN",
            resource_type="AUTH",
            resource_id=str(user.id),
            details={"phone": cleaned_phone, "method": "PHONE_OTP"},
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        return Response({
            "message": "Authentication successful! Welcome to CARSPA.",
            "token": token.key,
            "user": UserProfileSerializer(profile).data,
        }, status=status.HTTP_200_OK)


class GoogleAuthAPIView(views.APIView):
    """
    Google OAuth2.0 / OpenID Connect 1-click customer login & registration.
    Verifies cryptographic Google ID token or dev payload.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        credential = request.data.get("credential", "").strip()
        direct_email = request.data.get("email", "").strip()
        direct_name = request.data.get("name", "").strip()
        direct_sub = request.data.get("sub", "").strip()

        email = ""
        full_name = ""
        google_id = ""

        # 1. If Google ID Token (credential) is passed, verify cryptographic JWT
        if credential:
            try:
                import urllib.request
                import json
                verify_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}"
                req = urllib.request.Request(verify_url, headers={"User-Agent": "CARSPA-Backend"})
                with urllib.request.urlopen(req, timeout=5) as response:
                    token_info = json.loads(response.read().decode("utf-8"))
                    email = token_info.get("email", "").lower().strip()
                    full_name = token_info.get("name") or token_info.get("given_name") or email.split("@")[0]
                    google_id = token_info.get("sub", "")
            except Exception as e:
                if direct_email:
                    email = direct_email.lower().strip()
                    full_name = direct_name or email.split("@")[0]
                    google_id = direct_sub or "google_user"
                else:
                    return Response(
                        {"error": "Failed to verify Google Identity token.", "detail": str(e)},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
        elif direct_email:
            email = direct_email.lower().strip()
            full_name = direct_name or email.split("@")[0]
            google_id = direct_sub or "google_user"
        else:
            return Response(
                {"error": "Missing Google authorization credential or email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not email or "@" not in email:
            return Response(
                {"error": "Google token did not contain a valid email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email__iexact=email).first()
        is_new_user = False
        if not user:
            is_new_user = True
            base_username = email.split("@")[0].replace(".", "_")[:20]
            candidate_username = base_username
            suffix = 1
            while User.objects.filter(username=candidate_username).exists():
                candidate_username = f"{base_username}_{suffix}"
                suffix += 1

            user = User.objects.create_user(
                username=candidate_username,
                email=email,
                first_name=full_name.split()[0] if full_name else "",
                last_name=" ".join(full_name.split()[1:]) if " " in full_name else "",
                password=secrets.token_urlsafe(16),
            )

        profile, _ = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                "full_name": full_name or user.username,
                "phone": clean_phone_number(user.username[-10:] if len(user.username) >= 10 else f"9{secrets.randbelow(900000000)+100000000}"),
                "role": "CUSTOMER",
                "is_email_verified": True,
            },
        )
        profile.is_email_verified = True
        profile.save(update_fields=["is_email_verified"])

        token, _ = Token.objects.get_or_create(user=user)
        login(request, user)

        from apps.core.audit import record_audit_log
        record_audit_log(
            user=user,
            action="GOOGLE_OAUTH_LOGIN",
            resource_type="AUTH",
            resource_id=str(user.id),
            details={"email": email, "google_sub": google_id, "is_new_user": is_new_user},
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        return Response({
            "message": "Signed in with Google successfully!",
            "token": token.key,
            "user": UserProfileSerializer(profile).data,
            "is_new_user": is_new_user,
        }, status=status.HTTP_200_OK)


class LogoutAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            # Delete token so it cannot be reused
            Token.objects.filter(user=request.user).delete()
        except Exception:
            pass
        logout(request)
        return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)


class CurrentUserProfileAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(
            user=request.user,
            defaults={
                "full_name": request.user.get_full_name() or request.user.username,
                "phone": clean_phone_number(request.user.username[-10:] if len(request.user.username) >= 10 else "7087811881"),
            }
        )
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

    def patch(self, request):
        profile = getattr(request.user, "profile", None)
        if not profile:
            profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data["old_password"]):
                return Response(
                    {"old_password": "The current password you entered is incorrect."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.set_password(serializer.validated_data["new_password"])
            user.save()

            # Refresh token so current session remains valid
            Token.objects.filter(user=user).delete()
            new_token = Token.objects.create(user=user)

            return Response({
                "message": "Password updated successfully.",
                "token": new_token.key,
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestAPIView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            identifier = serializer.validated_data["identifier"].strip()
            user = None
            if "@" in identifier:
                user = User.objects.filter(email__iexact=identifier.lower()).first()
            else:
                cleaned = clean_phone_number(identifier)
                profile = UserProfile.objects.filter(phone=cleaned).select_related("user").first()
                if profile:
                    user = profile.user

            token_val = None
            if user:
                token_obj = PasswordResetToken.create_for_user(user)
                token_val = token_obj.token

            # In production, dispatch via email or SMS. For dev & demo, also return token/preview
            return Response({
                "message": "If an account matches that email or phone number, password reset instructions have been generated.",
                "reset_token": token_val,  # Returned for testing/demo convenience
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmAPIView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            token_obj = serializer.validated_data["reset_token_obj"]
            user = token_obj.user
            user.set_password(serializer.validated_data["new_password"])
            user.save()

            token_obj.is_used = True
            token_obj.save()

            # Invalidate existing auth tokens
            Token.objects.filter(user=user).delete()

            return Response({
                "message": "Your password has been successfully reset! You can now log in with your new password.",
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# -----------------------------------------------------------------------------
# Customer Self-Service Endpoints
# -----------------------------------------------------------------------------

class CustomerDashboardAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                "full_name": user.get_full_name() or user.username,
                "phone": clean_phone_number(user.username[-10:] if len(user.username) >= 10 else "7087811881"),
            }
        )

        user_bookings = Booking.objects.filter(
            Q(user=user) | Q(customer_phone=profile.phone)
        ).distinct()

        # Link any existing bookings matching user's phone to their account automatically
        unlinked = Booking.objects.filter(customer_phone=profile.phone, user__isnull=True)
        if unlinked.exists():
            unlinked.update(user=user)

        total_bookings = user_bookings.count()
        active_bookings = user_bookings.filter(
            status__in=["PENDING", "CONFIRMED", "ASSIGNED", "IN_PROGRESS"]
        ).count()
        completed_bookings = user_bookings.filter(status="COMPLETED").count()
        total_spent = user_bookings.filter(
            payment_status="PAID"
        ).aggregate(total=Sum("final_amount"))["total"] or 0

        recent_bookings = user_bookings.select_related(
            "vehicle_type", "service_package", "service_area", "assigned_staff"
        )[:5]

        saved_addresses = CustomerAddress.objects.filter(user=user)
        saved_vehicles = CustomerVehicle.objects.filter(user=user).select_related("vehicle_type")

        return Response({
            "profile": UserProfileSerializer(profile).data,
            "metrics": {
                "total_bookings": total_bookings,
                "active_bookings": active_bookings,
                "completed_bookings": completed_bookings,
                "total_spent": str(total_spent),
                "saved_addresses_count": saved_addresses.count(),
                "saved_vehicles_count": saved_vehicles.count(),
            },
            "recent_bookings": BookingDetailSerializer(recent_bookings, many=True).data,
            "saved_addresses": CustomerAddressSerializer(saved_addresses, many=True).data,
            "saved_vehicles": CustomerVehicleSerializer(saved_vehicles, many=True).data,
        })


class CustomerBookingListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = getattr(user, "profile", None)
        phone = profile.phone if profile else ""

        status_filter = request.query_params.get("status")

        bookings = Booking.objects.filter(
            Q(user=user) | (Q(customer_phone=phone) if phone else Q())
        ).select_related(
            "vehicle_type", "service_package", "service_area", "assigned_staff"
        ).distinct()

        if status_filter:
            bookings = bookings.filter(status=status_filter.upper())

        return Response(BookingDetailSerializer(bookings, many=True).data)


class CustomerBookingDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, reference):
        user = request.user
        profile = getattr(user, "profile", None)
        phone = profile.phone if profile else ""

        try:
            booking = Booking.objects.select_related(
                "vehicle_type", "service_package", "service_area", "assigned_staff"
            ).get(
                Q(booking_reference__iexact=reference),
                Q(user=user) | (Q(customer_phone=phone) if phone else Q())
            )
            return Response(BookingDetailSerializer(booking).data)
        except Booking.DoesNotExist:
            return Response(
                {"error": "Booking not found or you do not have permission to view this booking."},
                status=status.HTTP_404_NOT_FOUND
            )


class CustomerAddressViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerAddressSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return CustomerAddress.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CustomerVehicleViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerVehicleSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return CustomerVehicle.objects.filter(user=self.request.user).select_related("vehicle_type")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CustomerPaymentListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = getattr(user, "profile", None)
        phone = profile.phone if profile else ""

        payments = Payment.objects.filter(
            Q(user=user) | Q(booking__user=user) | (Q(booking__customer_phone=phone) if phone else Q())
        ).select_related("booking").order_by("-created_at").distinct()

        data = []
        for p in payments:
            data.append({
                "id": p.id,
                "amount": str(p.amount),
                "currency": p.currency,
                "provider": p.provider,
                "status": p.status,
                "order_id": p.order_id,
                "payment_id": p.payment_id,
                "created_at": p.created_at,
                "booking_reference": p.booking.booking_reference,
                "service_package_name": p.booking.service_package.name if p.booking and p.booking.service_package else "Wash Service",
                "service_date": p.booking.service_date if p.booking else None,
            })
        return Response(data)


# -----------------------------------------------------------------------------
# Admin Customer Management Endpoints
# -----------------------------------------------------------------------------

class AdminCustomerViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = UserProfileSerializer

    def get_queryset(self):
        qs = UserProfile.objects.select_related("user").annotate(
            total_bookings_count=Count("user__bookings", distinct=True)
        )
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search)
                | Q(phone__icontains=search)
                | Q(carspa_user_id__icontains=search)
                | Q(user__email__icontains=search)
            )

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(account_status=status_filter.upper())

        return qs

    def update(self, request, *args, **kwargs):
        profile = self.get_object()
        full_name = request.data.get("full_name", "").strip()
        phone = request.data.get("phone", "").strip()
        email = request.data.get("email", "").strip().lower()

        if full_name:
            profile.full_name = full_name
            profile.user.first_name = full_name.split()[0]
            profile.user.last_name = " ".join(full_name.split()[1:]) if len(full_name.split()) > 1 else ""

        if phone:
            clean_phone = clean_phone_number(phone)
            # check uniqueness if changing
            if UserProfile.objects.filter(phone=clean_phone).exclude(id=profile.id).exists():
                return Response({"error": "Another customer already has this mobile number."}, status=status.HTTP_400_BAD_REQUEST)
            profile.phone = clean_phone

        if email:
            if get_user_model().objects.filter(email__iexact=email).exclude(id=profile.user.id).exists():
                return Response({"error": "Another user already has this email address."}, status=status.HTTP_400_BAD_REQUEST)
            profile.user.email = email

        profile.save()
        profile.user.save()

        AdminAuditLog.objects.create(
            user=request.user,
            action="UPDATE_CUSTOMER_PROFILE",
            resource_type="CUSTOMER",
            resource_id=profile.carspa_user_id,
            details={"full_name": profile.full_name, "email": profile.user.email, "phone": profile.phone},
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        return Response(UserProfileSerializer(profile).data)

    def retrieve(self, request, *args, **kwargs):
        profile = self.get_object()
        user = profile.user
        bookings = Booking.objects.filter(
            Q(user=user) | Q(customer_phone=profile.phone)
        ).select_related("vehicle_type", "service_package")[:20]

        payments = Payment.objects.filter(
            Q(user=user) | Q(booking__user=user)
        )[:20]

        addresses = CustomerAddress.objects.filter(user=user)
        vehicles = CustomerVehicle.objects.filter(user=user).select_related("vehicle_type")

        # Calculate lifetime value (sum of paid bookings)
        ltv = Booking.objects.filter(
            Q(user=user) | Q(customer_phone=profile.phone),
            payment_status="PAID"
        ).aggregate(total=Sum("final_amount"))["total"] or Decimal("0.00")

        return Response({
            "profile": UserProfileSerializer(profile).data,
            "metrics": {
                "total_bookings": Booking.objects.filter(Q(user=user) | Q(customer_phone=profile.phone)).count(),
                "completed_bookings": Booking.objects.filter(Q(user=user) | Q(customer_phone=profile.phone), status="COMPLETED").count(),
                "lifetime_value": str(ltv),
                "saved_addresses_count": addresses.count(),
                "saved_vehicles_count": vehicles.count(),
            },
            "bookings": BookingDetailSerializer(bookings, many=True).data,
            "payments": [
                {
                    "id": p.id,
                    "amount": str(p.amount),
                    "status": p.status,
                    "provider": p.provider,
                    "order_id": p.order_id,
                    "payment_id": p.payment_id,
                    "created_at": p.created_at,
                    "booking_reference": p.booking.booking_reference if p.booking else None,
                }
                for p in payments
            ],
            "addresses": CustomerAddressSerializer(addresses, many=True).data,
            "vehicles": CustomerVehicleSerializer(vehicles, many=True).data,
        })

    @action(detail=True, methods=["post"], url_path="toggle-status")
    def toggle_status(self, request, pk=None):
        profile = self.get_object()
        new_status = request.data.get("status")
        if new_status in ["ACTIVE", "SUSPENDED", "INACTIVE"]:
            profile.account_status = new_status
            profile.save()
            profile.user.is_active = (new_status == "ACTIVE")
            profile.user.save()

            AdminAuditLog.objects.create(
                user=request.user,
                action="TOGGLE_CUSTOMER_STATUS",
                resource_type="CUSTOMER",
                resource_id=profile.carspa_user_id,
                details={"account_status": new_status, "is_active": profile.user.is_active},
                ip_address=request.META.get("REMOTE_ADDR"),
            )

            return Response({
                "message": f"Account status updated to {new_status}.",
                "profile": UserProfileSerializer(profile).data
            })
        return Response(
            {"error": "Invalid status. Must be ACTIVE, SUSPENDED, or INACTIVE."},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="customers_export.csv"'

        writer = csv.writer(response)
        writer.writerow([
            "User ID", "Full Name", "Email", "Phone", "Status", "Role",
            "Total Bookings", "Date Joined", "Last Login"
        ])

        for p in self.get_queryset():
            writer.writerow([
                p.carspa_user_id,
                p.full_name,
                p.user.email,
                p.phone,
                p.account_status,
                p.role,
                getattr(p, "total_bookings_count", 0),
                p.user.date_joined.strftime("%Y-%m-%d %H:%M") if p.user.date_joined else "—",
                p.user.last_login.strftime("%Y-%m-%d %H:%M") if p.user.last_login else "Never",
            ])

        return response
