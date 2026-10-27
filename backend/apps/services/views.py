from rest_framework import generics, permissions, viewsets
from apps.services.models import VehicleType, ServicePackage, ServiceArea, ServicePackagePrice
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

class PublicServicePackageListView(generics.ListAPIView):
    queryset = ServicePackage.objects.filter(is_active=True).prefetch_related("prices__vehicle_type").order_by("sort_order", "id")
    serializer_class = ServicePackageSerializer
    permission_classes = [permissions.AllowAny]

class PublicServiceAreaListView(generics.ListAPIView):
    queryset = ServiceArea.objects.filter(is_active=True).order_by("city", "name")
    serializer_class = ServiceAreaSerializer
    permission_classes = [permissions.AllowAny]

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
