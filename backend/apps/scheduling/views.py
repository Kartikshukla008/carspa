import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, viewsets
from drf_spectacular.utils import extend_schema, OpenApiParameter
from apps.scheduling.engine import AvailabilityEngine
from apps.scheduling.models import SlotBlockout
from rest_framework import serializers

class SlotBlockoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = SlotBlockout
        fields = "__all__"

class PublicAvailabilityAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        parameters=[
            OpenApiParameter("date", str, description="Service date YYYY-MM-DD", required=True),
            OpenApiParameter("service_id", int, description="Service package ID", required=True),
            OpenApiParameter("vehicle_type_id", int, description="Vehicle type ID", required=False),
            OpenApiParameter("area_id", int, description="Service area ID", required=False),
        ]
    )
    def get(self, request):
        date_str = request.query_params.get("date")
        service_id = request.query_params.get("service_id")
        vehicle_type_id = request.query_params.get("vehicle_type_id")
        area_id = request.query_params.get("area_id")

        if not date_str or not service_id:
            return Response(
                {"error": "Both 'date' (YYYY-MM-DD) and 'service_id' parameters are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            target_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Expected YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST
            )

        engine = AvailabilityEngine()
        result = engine.get_available_slots(
            target_date=target_date,
            service_package_id=int(service_id),
            vehicle_type_id=int(vehicle_type_id) if vehicle_type_id else None,
            service_area_id=int(area_id) if area_id else None
        )

        if result.get("error"):
            return Response({"error": result["error"], "slots": []}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "date": date_str,
            "service_id": int(service_id),
            "slots": result["slots"]
        })

class AdminSlotBlockoutViewSet(viewsets.ModelViewSet):
    queryset = SlotBlockout.objects.all().order_by("-start_datetime")
    serializer_class = SlotBlockoutSerializer
    permission_classes = [permissions.IsAdminUser]
