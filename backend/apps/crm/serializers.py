from rest_framework import serializers
from apps.crm.models import Lead

class LeadCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = [
            "lead_id",
            "customer_name",
            "mobile_number",
            "email",
            "vehicle_type",
            "service_package",
            "requested_date",
            "requested_slot",
            "locality",
            "address",
            "pincode",
            "source",
        ]
        read_only_fields = ["lead_id"]

    def validate_mobile_number(self, value):
        cleaned = value.replace(" ", "").replace("-", "")
        if len(cleaned) < 10:
            raise serializers.ValidationError("Please provide a valid 10-digit mobile number.")
        return cleaned

class LeadAdminSerializer(serializers.ModelSerializer):
    vehicle_type_name = serializers.CharField(source="vehicle_type.name", read_only=True)
    service_package_name = serializers.CharField(source="service_package.name", read_only=True)
    assigned_staff_name = serializers.CharField(source="assigned_staff.name", read_only=True)

    class Meta:
        model = Lead
        fields = "__all__"
