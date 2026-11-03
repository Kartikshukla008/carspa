from django.db import models
from apps.core.models import TimeStampedModel
from apps.services.models import ServiceArea
from apps.staff.models import StaffProfile

class SlotBlockout(TimeStampedModel):
    title = models.CharField(max_length=200)
    start_datetime = models.DateTimeField(db_index=True)
    end_datetime = models.DateTimeField(db_index=True)
    reason = models.TextField(blank=True)
    service_area = models.ForeignKey(
        ServiceArea, on_delete=models.CASCADE, null=True, blank=True, related_name="blockouts"
    )
    staff = models.ForeignKey(
        StaffProfile, on_delete=models.CASCADE, null=True, blank=True, related_name="blockouts"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-start_datetime"]

    def __str__(self):
        return f"Blockout: {self.title} ({self.start_datetime} to {self.end_datetime})"


class SlotCapacityLock(TimeStampedModel):
    """
    Pessimistic concurrency lock for scheduling time slots.
    Acquired with select_for_update() inside atomic transactions to eliminate
    race condition double-bookings across concurrent customer checkouts.
    """
    service_date = models.DateField(db_index=True)
    slot_start_time = models.TimeField(db_index=True)
    service_area = models.ForeignKey(
        ServiceArea, on_delete=models.CASCADE, null=True, blank=True, related_name="capacity_locks"
    )

    class Meta:
        unique_together = ("service_date", "slot_start_time", "service_area")
        verbose_name = "Slot Capacity Lock"
        verbose_name_plural = "Slot Capacity Locks"

    def __str__(self):
        return f"Lock: {self.service_date} @ {self.slot_start_time} (Area: {self.service_area})"

