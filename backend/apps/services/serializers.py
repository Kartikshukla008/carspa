from rest_framework import serializers
from apps.services.models import VehicleType, ServicePackage, ServicePackagePrice, ServiceArea

class VehicleTypeSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = VehicleType
        fields = ["id", "name", "slug", "description", "icon_name", "image_url", "sort_order", "is_active"]

    def get_image_url(self, obj):
        mapping = {
            "hatchback": "/vehicles/hatchback.jpg",
            "sedan": "/vehicles/sedan.jpg",
            "suv-muv": "/vehicles/suv.jpg",
            "luxury-7seater": "/vehicles/luxury-7seater.jpg",
        }
        return mapping.get(obj.slug, "/vehicles/sedan.jpg")

class ServicePackagePriceSerializer(serializers.ModelSerializer):
    vehicle_type_name = serializers.CharField(source="vehicle_type.name", read_only=True)
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = ServicePackagePrice
        fields = [
            "id",
            "vehicle_type",
            "vehicle_type_name",
            "base_price",
            "discounted_price",
            "effective_price",
            "is_active",
        ]

class ServicePackageSerializer(serializers.ModelSerializer):
    prices = ServicePackagePriceSerializer(many=True, read_only=True)

    class Meta:
        model = ServicePackage
        fields = [
            "id",
            "name",
            "slug",
            "short_description",
            "description",
            "estimated_duration_minutes",
            "features",
            "is_popular",
            "badge_text",
            "sort_order",
            "is_active",
            "prices",
        ]

class ServiceAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceArea
        fields = ["id", "name", "city", "pincode_prefix", "is_active", "notes"]
