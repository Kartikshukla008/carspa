from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

def root_api_view(request):
    return JsonResponse({
        "service": "CARSPA Doorstep Detailing API",
        "status": "online",
        "version": "1.0",
        "docs": "/api/docs/",
    })

from apps.services.views import (
    PublicVehicleTypeListView,
    PublicServicePackageListView,
    PublicServiceAreaListView,
    PublicAddonListView,
    AdminServicePackageViewSet,
    AdminVehicleTypeViewSet,
    AdminServiceAreaViewSet,
    AdminPackagePriceViewSet,
)
from apps.scheduling.views import (
    PublicAvailabilityAPIView,
    AdminSlotBlockoutViewSet,
)
from apps.crm.views import (
    PublicLeadCreateView,
    AdminLeadViewSet,
)
from apps.staff.views import AdminStaffViewSet
from apps.bookings.views import (
    PublicBookingCreateAPIView,
    PublicBookingLookupAPIView,
    AdminBookingViewSet,
    AdminDashboardMetricsAPIView,
)
from apps.core.views import (
    AdminLoginAPIView,
    AdminLogoutAPIView,
    AdminMeAPIView,
    AdminBusinessConfigAPIView,
)

admin_router = DefaultRouter()
admin_router.register(r"bookings", AdminBookingViewSet, basename="admin-bookings")
admin_router.register(r"leads", AdminLeadViewSet, basename="admin-leads")
admin_router.register(r"staff", AdminStaffViewSet, basename="admin-staff")
admin_router.register(r"blockouts", AdminSlotBlockoutViewSet, basename="admin-blockouts")
admin_router.register(r"services", AdminServicePackageViewSet, basename="admin-services")
admin_router.register(r"vehicle-types", AdminVehicleTypeViewSet, basename="admin-vehicle-types")
admin_router.register(r"service-areas", AdminServiceAreaViewSet, basename="admin-service-areas")
admin_router.register(r"prices", AdminPackagePriceViewSet, basename="admin-prices")

urlpatterns = [
    path("", root_api_view, name="api-root"),
    path("admin/django/", admin.site.urls),

    # OpenAPI Schema & Interactive Docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),

    # Public APIs
    path("api/vehicle-types/", PublicVehicleTypeListView.as_view(), name="public-vehicle-types"),
    path("api/services/", PublicServicePackageListView.as_view(), name="public-services"),
    path("api/services/addons/", PublicAddonListView.as_view(), name="public-addons"),
    path("api/service-areas/", PublicServiceAreaListView.as_view(), name="public-service-areas"),
    path("api/availability/", PublicAvailabilityAPIView.as_view(), name="public-availability"),
    path("api/leads/", PublicLeadCreateView.as_view(), name="public-lead-create"),
    path("api/bookings/", PublicBookingCreateAPIView.as_view(), name="public-booking-create"),
    path("api/bookings/lookup/", PublicBookingLookupAPIView.as_view(), name="public-booking-lookup"),

    # Razorpay Payment Gateway APIs
    path("api/payments/razorpay/", include("apps.payments.urls")),

    # Admin Auth & Core Endpoints
    path("api/admin/login/", AdminLoginAPIView.as_view(), name="admin-login"),
    path("api/admin/logout/", AdminLogoutAPIView.as_view(), name="admin-logout"),
    path("api/admin/me/", AdminMeAPIView.as_view(), name="admin-me"),
    path("api/admin/config/", AdminBusinessConfigAPIView.as_view(), name="admin-config"),
    path("api/admin/dashboard/", AdminDashboardMetricsAPIView.as_view(), name="admin-dashboard"),

    # Admin Management ViewSets
    path("api/admin/", include(admin_router.urls)),
]
