from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.staff.models import StaffProfile, StaffWorkingSchedule, StaffServiceArea
from apps.staff.serializers import StaffProfileSerializer, StaffWorkingScheduleSerializer

class AdminStaffViewSet(viewsets.ModelViewSet):
    queryset = StaffProfile.objects.all().prefetch_related("assigned_areas", "working_schedules")
    serializer_class = StaffProfileSerializer
    permission_classes = [permissions.IsAdminUser]

    @action(detail=True, methods=["post"], url_path="set-schedule")
    def set_schedule(self, request, pk=None):
        staff = self.get_object()
        schedules_data = request.data.get("schedules", [])
        
        # Expecting array of {day_of_week: int, start_time: "08:00", end_time: "18:00", is_active: bool}
        for item in schedules_data:
            StaffWorkingSchedule.objects.update_or_create(
                staff=staff,
                day_of_week=item["day_of_week"],
                defaults={
                    "start_time": item.get("start_time", "08:00:00"),
                    "end_time": item.get("end_time", "19:00:00"),
                    "is_active": item.get("is_active", True)
                }
            )

        return Response(StaffProfileSerializer(staff).data)
