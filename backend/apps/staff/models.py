from django.db import models
from django.contrib.auth import get_user_model
from apps.core.models import TimeStampedModel
from apps.services.models import ServiceArea

User = get_user_model()

class StaffProfile(TimeStampedModel):
    user = models.OneToOneField(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="staff_profile"
    )
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, unique=True)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    max_daily_jobs = models.PositiveIntegerField(default=6)
    assigned_areas = models.ManyToManyField(
        ServiceArea, through="StaffServiceArea", related_name="assigned_staff"
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.phone})"

class StaffWorkingSchedule(TimeStampedModel):
    DAYS_OF_WEEK = [
        (0, "Monday"),
        (1, "Tuesday"),
        (2, "Wednesday"),
        (3, "Thursday"),
        (4, "Friday"),
        (5, "Saturday"),
        (6, "Sunday"),
    ]

    staff = models.ForeignKey(
        StaffProfile, on_delete=models.CASCADE, related_name="working_schedules"
    )
    day_of_week = models.PositiveSmallIntegerField(choices=DAYS_OF_WEEK)
    start_time = models.TimeField(default="08:00:00")
    end_time = models.TimeField(default="19:00:00")
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("staff", "day_of_week")
        ordering = ["staff", "day_of_week"]

    def __str__(self):
        return f"{self.staff.name} - {self.get_day_of_week_display()} ({self.start_time}-{self.end_time})"

class StaffServiceArea(TimeStampedModel):
    staff = models.ForeignKey(StaffProfile, on_delete=models.CASCADE)
    service_area = models.ForeignKey(ServiceArea, on_delete=models.CASCADE)
    is_primary = models.BooleanField(default=True)

    class Meta:
        unique_together = ("staff", "service_area")

    def __str__(self):
        return f"{self.staff.name} -> {self.service_area.name}"
