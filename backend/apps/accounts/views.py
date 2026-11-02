from django.db.models import Sum, Count, Q
from django.contrib.auth import login, logout, get_user_model
from rest_framework import views, viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action

from apps.accounts.models import (
    UserProfile,
    CustomerAddress,
    CustomerVehicle,
    PasswordResetToken,
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

class AdminCustomerViewSet(viewsets.ReadOnlyModelViewSet):
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

        return Response({
            "profile": UserProfileSerializer(profile).data,
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
            # Also toggle user.is_active
            profile.user.is_active = (new_status == "ACTIVE")
            profile.user.save()
            return Response({
                "message": f"Account status updated to {new_status}.",
                "profile": UserProfileSerializer(profile).data
            })
        return Response(
            {"error": "Invalid status. Must be ACTIVE, SUSPENDED, or INACTIVE."},
            status=status.HTTP_400_BAD_REQUEST
        )
