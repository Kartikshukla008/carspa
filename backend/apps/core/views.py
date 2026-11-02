from django.contrib.auth import authenticate, login, logout, get_user_model
from django.db import transaction
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework import viewsets, status, permissions, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.authtoken.models import Token

from apps.core.models import BusinessConfig, AdminAuditLog
from apps.core.permissions import (
    get_user_role,
    IsSuperAdmin,
    IsAdminOrManager,
    IsAdminStaffOrAbove,
)
from apps.accounts.models import UserProfile, generate_unique_user_id

User = get_user_model()


class BusinessConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessConfig
        fields = "__all__"


class AdminAuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = AdminAuditLog
        fields = [
            "id",
            "user",
            "user_name",
            "user_email",
            "action",
            "resource_type",
            "resource_id",
            "details",
            "ip_address",
            "created_at",
        ]

    def get_user_name(self, obj):
        if obj.user:
            profile = getattr(obj.user, "profile", None)
            return profile.full_name if profile else obj.user.get_full_name() or obj.user.username
        return "System"

    def get_user_email(self, obj):
        return obj.user.email if obj.user else ""


class AdminTeamUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "user_id",
            "username",
            "email",
            "full_name",
            "phone",
            "role",
            "is_active",
            "is_staff",
            "is_superuser",
            "last_login",
            "date_joined",
        ]

    def get_role(self, obj):
        return get_user_role(obj)

    def get_phone(self, obj):
        profile = getattr(obj, "profile", None)
        return profile.phone if profile else ""

    def get_full_name(self, obj):
        profile = getattr(obj, "profile", None)
        if profile and profile.full_name:
            return profile.full_name
        return obj.get_full_name() or obj.username

    def get_user_id(self, obj):
        profile = getattr(obj, "profile", None)
        return profile.carspa_user_id if profile else f"ADMIN-{obj.id}"


class AdminLoginAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            username = request.data.get("username", "").strip()
            password = request.data.get("password", "").strip()

            if not username or not password:
                return Response(
                    {"error": "Please provide both username/email and password."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Support login with either username or email
            user = authenticate(request, username=username, password=password)
            if user is None and "@" in username:
                try:
                    matched_user = User.objects.get(email__iexact=username)
                    user = authenticate(request, username=matched_user.username, password=password)
                except (User.DoesNotExist, User.MultipleObjectsReturned):
                    user = None

            if user is None:
                return Response(
                    {"error": "Invalid administrator username/email or password."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # Check that account is not disabled
            if not user.is_active:
                return Response(
                    {"error": "This administrator account has been deactivated. Please contact Super Admin."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Verify RBAC: only superuser, staff, or admin roles can log into Admin Portal
            profile = getattr(user, "profile", None)
            user_role = get_user_role(user)
            if user_role == "CUSTOMER" and not user.is_staff and not user.is_superuser:
                return Response(
                    {"error": "Access denied. Administrator privileges required."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Ensure profile exists with correct role
            if not profile:
                profile, _ = UserProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        "phone": user.username[-10:] if len(user.username) >= 10 and user.username[-10:].isdigit() else f"98765{user.id:05d}",
                        "full_name": user.get_full_name() or user.username,
                        "role": "SUPER_ADMIN" if user.is_superuser else "ADMIN",
                    },
                )
            elif profile.role == "CUSTOMER" and (user.is_staff or user.is_superuser):
                profile.role = "SUPER_ADMIN" if user.is_superuser else "ADMIN"
                profile.save(update_fields=["role"])

            # Create or get DRF Auth Token
            token, _ = Token.objects.get_or_create(user=user)

            # Also maintain session login
            login(request, user)

            # Record Audit Log
            AdminAuditLog.objects.create(
                user=user,
                action="ADMIN_LOGIN",
                resource_type="AUTH",
                resource_id=str(user.id),
                details={"username": user.username, "role": profile.role},
                ip_address=request.META.get("REMOTE_ADDR"),
            )

            return Response({
                "message": "Administrator login successful.",
                "token": token.key,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "full_name": profile.full_name,
                    "role": profile.role,
                    "is_staff": user.is_staff,
                    "is_superuser": user.is_superuser,
                },
            })
        except Exception as e:
            return Response(
                {"error": f"Authentication server error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AdminLogoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        try:
            Token.objects.filter(user=user).delete()
        except Exception:
            pass

        AdminAuditLog.objects.create(
            user=user,
            action="ADMIN_LOGOUT",
            resource_type="AUTH",
            resource_id=str(user.id),
            details={"username": user.username},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        logout(request)
        return Response({"message": "Logged out successfully."})


class AdminMeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = getattr(user, "profile", None)
        role = get_user_role(user)

        if role == "CUSTOMER" and not user.is_staff and not user.is_superuser:
            return Response(
                {"error": "Access denied. Administrator privileges required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": profile.full_name if profile else user.get_full_name() or user.username,
            "phone": profile.phone if profile else "",
            "role": role,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
        })


class AdminBusinessConfigAPIView(APIView):
    permission_classes = [IsAdminOrManager]

    def get(self, request):
        config = BusinessConfig.get_config()
        return Response(BusinessConfigSerializer(config).data)

    def patch(self, request):
        config = BusinessConfig.get_config()
        serializer = BusinessConfigSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            AdminAuditLog.objects.create(
                user=request.user,
                action="UPDATE_CONFIG",
                resource_type="BUSINESS_CONFIG",
                resource_id=str(config.id),
                details=request.data,
                ip_address=request.META.get("REMOTE_ADDR"),
            )
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminOrManager]
    serializer_class = AdminAuditLogSerializer

    def get_queryset(self):
        qs = AdminAuditLog.objects.select_related("user").all()
        action_filter = self.request.query_params.get("action")
        resource_filter = self.request.query_params.get("resource_type")
        search = self.request.query_params.get("search", "").strip()

        if action_filter:
            qs = qs.filter(action__iexact=action_filter)
        if resource_filter:
            qs = qs.filter(resource_type__iexact=resource_filter)
        if search:
            qs = qs.filter(
                Q(action__icontains=search)
                | Q(resource_type__icontains=search)
                | Q(resource_id__icontains=search)
                | Q(user__username__icontains=search)
                | Q(user__email__icontains=search)
            )
        return qs[:100]


class AdminTeamViewSet(viewsets.ModelViewSet):
    """
    Super Admin management of administrative users and roles.
    """
    permission_classes = [IsSuperAdmin]
    serializer_class = AdminTeamUserSerializer

    def get_queryset(self):
        # Return all staff or non-customer profiles
        return User.objects.filter(
            Q(is_staff=True) | Q(is_superuser=True) | Q(profile__role__in=["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"])
        ).distinct().order_by("-date_joined")

    def create(self, request, *args, **kwargs):
        username = request.data.get("username", "").strip()
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "").strip()
        full_name = request.data.get("full_name", "").strip()
        phone = request.data.get("phone", "").strip()
        role = request.data.get("role", "ADMIN").upper()

        if not username or not password or not email:
            return Response(
                {"error": "Username, email, and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username__iexact=username).exists():
            return Response({"error": "A user with this username already exists."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email).exists():
            return Response({"error": "A user with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)

        if role not in ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"]:
            role = "ADMIN"

        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=full_name.split()[0] if full_name else "",
                last_name=" ".join(full_name.split()[1:]) if len(full_name.split()) > 1 else "",
                is_staff=True,
                is_superuser=(role == "SUPER_ADMIN"),
            )

            clean_phone = "".join(filter(str.isdigit, phone))[-10:] if phone else f"98{user.id:08d}"
            profile, _ = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    "phone": clean_phone,
                    "full_name": full_name or username,
                    "role": role,
                    "carspa_user_id": generate_unique_user_id(),
                },
            )
            profile.role = role
            profile.save()

            AdminAuditLog.objects.create(
                user=request.user,
                action="CREATE_ADMIN_USER",
                resource_type="ADMIN_USER",
                resource_id=str(user.id),
                details={"username": username, "email": email, "role": role},
                ip_address=request.META.get("REMOTE_ADDR"),
            )

            return Response(AdminTeamUserSerializer(user).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        target_user = self.get_object()
        if target_user == request.user:
            return Response(
                {"error": "You cannot deactivate your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_user.is_active = not target_user.is_active
        target_user.save(update_fields=["is_active"])

        AdminAuditLog.objects.create(
            user=request.user,
            action="TOGGLE_ADMIN_STATUS",
            resource_type="ADMIN_USER",
            resource_id=str(target_user.id),
            details={"username": target_user.username, "new_active": target_user.is_active},
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        return Response({
            "message": f"User account {'activated' if target_user.is_active else 'deactivated'} successfully.",
            "user": AdminTeamUserSerializer(target_user).data,
        })

    @action(detail=True, methods=["post"], url_path="update-role")
    def update_role(self, request, pk=None):
        target_user = self.get_object()
        new_role = request.data.get("role", "").upper()
        if new_role not in ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"]:
            return Response({"error": "Invalid role specified."}, status=status.HTTP_400_BAD_REQUEST)

        if target_user == request.user and new_role != "SUPER_ADMIN":
            return Response({"error": "You cannot demote yourself from Super Admin."}, status=status.HTTP_400_BAD_REQUEST)

        profile = getattr(target_user, "profile", None)
        if not profile:
            profile = UserProfile.objects.create(
                user=target_user,
                phone=f"98{target_user.id:08d}",
                full_name=target_user.get_full_name() or target_user.username,
                role=new_role,
            )
        else:
            profile.role = new_role
            profile.save(update_fields=["role"])

        target_user.is_superuser = (new_role == "SUPER_ADMIN")
        target_user.is_staff = True
        target_user.save(update_fields=["is_superuser", "is_staff"])

        AdminAuditLog.objects.create(
            user=request.user,
            action="UPDATE_ADMIN_ROLE",
            resource_type="ADMIN_USER",
            resource_id=str(target_user.id),
            details={"username": target_user.username, "new_role": new_role},
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        return Response({
            "message": f"Role updated to {new_role}.",
            "user": AdminTeamUserSerializer(target_user).data,
        })
