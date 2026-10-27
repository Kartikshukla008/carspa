from rest_framework import serializers
from apps.staff.models import StaffProfile, StaffWorkingSchedule, StaffServiceArea
from apps.services.serializers import ServiceAreaSerializer

class StaffWorkingScheduleSerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source="get_day_of_week_display", read_only=True)

    class Meta:
        model = StaffWorkingSchedule
        fields = ["id", "day_of_week", "day_name", "start_time", "end_time", "is_active"]

class StaffProfileSerializer(serializers.ModelSerializer):
    assigned_areas_details = ServiceAreaSerializer(source="assigned_areas", many=True, read_only=True)
    working_schedules = StaffWorkingScheduleSerializer(many=True, read_only=True)
    active_jobs_count = serializers.SerializerMethodField()

    class Meta:
        model = StaffProfile
        fields = [
            "id",
            "name",
            "phone",
            "email",
            "is_active",
            "max_daily_jobs",
            "assigned_areas",
            "assigned_areas_details",
            "working_schedules",
            "active_jobs_count",
            "created_at",
        ]

    def get_active_jobs_count(self, obj):
        from django.utils import timezone
        today = timezone.localdate()
        return obj.assigned_bookings.filter(
            service_date=today,
            status__in=["CONFIRMED", "ASSIGNED", "IN_PROGRESS"]
        ).count()
