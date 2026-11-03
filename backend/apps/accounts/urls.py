from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.accounts.views import (
    RegisterAPIView,
    LoginAPIView,
    LogoutAPIView,
    PhoneOTPSendAPIView,
    PhoneOTPVerifyAPIView,
    GoogleAuthAPIView,
    CurrentUserProfileAPIView,
    ChangePasswordAPIView,
    PasswordResetRequestAPIView,
    PasswordResetConfirmAPIView,
    CustomerDashboardAPIView,
    CustomerBookingListView,
    CustomerBookingDetailView,
    CustomerPaymentListView,
    CustomerAddressViewSet,
    CustomerVehicleViewSet,
)

router = DefaultRouter()
router.register(r"customer/addresses", CustomerAddressViewSet, basename="customer-addresses")
router.register(r"customer/vehicles", CustomerVehicleViewSet, basename="customer-vehicles")

urlpatterns = [
    # Auth endpoints
    path("auth/register/", RegisterAPIView.as_view(), name="auth-register"),
    path("auth/login/", LoginAPIView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutAPIView.as_view(), name="auth-logout"),
    path("auth/otp/send/", PhoneOTPSendAPIView.as_view(), name="auth-otp-send"),
    path("auth/otp/verify/", PhoneOTPVerifyAPIView.as_view(), name="auth-otp-verify"),
    path("auth/google/", GoogleAuthAPIView.as_view(), name="auth-google"),
    path("auth/profile/", CurrentUserProfileAPIView.as_view(), name="auth-profile"),
    path("auth/profile/change-password/", ChangePasswordAPIView.as_view(), name="auth-change-password"),
    path("auth/password-reset/", PasswordResetRequestAPIView.as_view(), name="auth-password-reset"),
    path("auth/password-reset-confirm/", PasswordResetConfirmAPIView.as_view(), name="auth-password-reset-confirm"),

    # Customer Data Management endpoints
    path("customer/dashboard/", CustomerDashboardAPIView.as_view(), name="customer-dashboard"),
    path("customer/bookings/", CustomerBookingListView.as_view(), name="customer-bookings"),
    path("customer/bookings/<str:reference>/", CustomerBookingDetailView.as_view(), name="customer-booking-detail"),
    path("customer/payments/", CustomerPaymentListView.as_view(), name="customer-payments"),

    # Router endpoints (saved addresses and vehicles)
    path("", include(router.urls)),
]
