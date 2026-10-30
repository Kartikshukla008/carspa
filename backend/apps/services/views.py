from rest_framework import generics, permissions, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.services.models import VehicleType, ServicePackage, ServiceArea, ServicePackagePrice
from apps.services.constants import AVAILABLE_ADDONS
from apps.services.serializers import (
    VehicleTypeSerializer,
    ServicePackageSerializer,
    ServiceAreaSerializer,
    ServicePackagePriceSerializer
)

class PublicVehicleTypeListView(generics.ListAPIView):
    queryset = VehicleType.objects.filter(is_active=True).order_by("sort_order", "name")
    serializer_class = VehicleTypeSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

class PublicServicePackageListView(generics.ListAPIView):
    queryset = ServicePackage.objects.filter(is_active=True).prefetch_related("prices__vehicle_type").order_by("sort_order", "id")
    serializer_class = ServicePackageSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

class PublicServiceAreaListView(generics.ListAPIView):
    queryset = ServiceArea.objects.filter(is_active=True).order_by("city", "name")
    serializer_class = ServiceAreaSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

class PublicAddonListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        data = [
            {
                "id": a["id"],
                "name": a["name"],
                "short_description": a["short_description"],
                "price": float(a["price"]),
                "duration_minutes": a["duration_minutes"],
                "badge": a["badge"],
                "icon": a["icon"],
            }
            for a in AVAILABLE_ADDONS
        ]
        return Response(data)

# Admin Service Management
class AdminServicePackageViewSet(viewsets.ModelViewSet):
    queryset = ServicePackage.objects.all().prefetch_related("prices").order_by("sort_order", "id")
    serializer_class = ServicePackageSerializer
    permission_classes = [permissions.IsAdminUser]

class AdminVehicleTypeViewSet(viewsets.ModelViewSet):
    queryset = VehicleType.objects.all().order_by("sort_order", "name")
    serializer_class = VehicleTypeSerializer
    permission_classes = [permissions.IsAdminUser]

class AdminServiceAreaViewSet(viewsets.ModelViewSet):
    queryset = ServiceArea.objects.all().order_by("city", "name")
    serializer_class = ServiceAreaSerializer
    permission_classes = [permissions.IsAdminUser]

class AdminPackagePriceViewSet(viewsets.ModelViewSet):
    queryset = ServicePackagePrice.objects.all().select_related("service_package", "vehicle_type")
    serializer_class = ServicePackagePriceSerializer
    permission_classes = [permissions.IsAdminUser]
