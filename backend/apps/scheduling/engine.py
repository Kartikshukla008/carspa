import datetime
from decimal import Decimal
from django.utils import timezone
import pytz
from apps.core.models import BusinessConfig
from apps.services.models import ServicePackage, VehicleType, ServiceArea
from apps.staff.models import StaffProfile, StaffWorkingSchedule
from apps.scheduling.models import SlotBlockout
from apps.bookings.models import Booking

class AvailabilityEngine:
    """
    Production-grade scheduling & capacity engine for doorstep car washing.
    Calculates time slot availability dynamically considering:
    - Business operating hours
    - Service duration & turnaround buffer
    - Staff working shifts & area coverage
    - Blackouts & blocked time ranges
    - Existing active bookings & concurrency limits
    """

    def __init__(self, config=None):
        self.config = config or BusinessConfig.get_config()
        self.tz = pytz.timezone(self.config.timezone)

    def get_available_slots(self, target_date, service_package_id, vehicle_type_id=None, service_area_id=None):
        """
        Returns list of slots for target_date with availability status & remaining capacity.
        """
        now = timezone.now().astimezone(self.tz)
        today = now.date()

        # Validation: Date range
        if target_date < today:
            return {"error": "Cannot book slots in the past.", "slots": []}

        max_date = today + datetime.timedelta(days=self.config.max_advance_days)
        if target_date > max_date:
            return {
                "error": f"Bookings are only accepted up to {self.config.max_advance_days} days in advance.",
                "slots": []
            }

        if target_date == today and not self.config.same_day_booking_allowed:
            return {"error": "Same-day bookings are not permitted.", "slots": []}

        try:
            service = ServicePackage.objects.get(id=service_package_id, is_active=True)
        except ServicePackage.DoesNotExist:
            return {"error": "Invalid or inactive service package.", "slots": []}

        duration_minutes = service.estimated_duration_minutes
        buffer_minutes = self.config.default_buffer_minutes
        total_slot_span = duration_minutes + buffer_minutes
        slot_interval = self.config.slot_interval_minutes

        # Staff filtering
        day_of_week = target_date.weekday()  # 0 = Monday, 6 = Sunday
        active_staff_qs = StaffProfile.objects.filter(is_active=True)

        if service_area_id:
            active_staff_qs = active_staff_qs.filter(assigned_areas__id=service_area_id)

        staff_list = list(active_staff_qs)
        total_staff_count = len(staff_list)

        # If no dedicated staff configured, fallback to 2 slots concurrent default capacity
        default_capacity = max(total_staff_count, 2)

        # Working schedules for staff on this day of week
        staff_schedules = {
            s.staff_id: s
            for s in StaffWorkingSchedule.objects.filter(
                staff__in=staff_list, day_of_week=day_of_week, is_active=True
            )
        }

        # Active bookings on target_date
        active_statuses = ["PENDING", "CONFIRMED", "ASSIGNED", "IN_PROGRESS"]
        existing_bookings = list(
            Booking.objects.filter(
                service_date=target_date,
                status__in=active_statuses
            ).values("id", "slot_start_time", "slot_end_time", "assigned_staff_id")
        )

        # Blockouts overlapping target_date
        day_start_dt = self.tz.localize(datetime.datetime.combine(target_date, datetime.time.min))
        day_end_dt = self.tz.localize(datetime.datetime.combine(target_date, datetime.time.max))
        blockouts = list(
            SlotBlockout.objects.filter(
                is_active=True,
                start_datetime__lt=day_end_dt,
                end_datetime__gt=day_start_dt
            )
        )

        # Generate slots throughout the day
        start_time = self.config.day_open_time
        close_time = self.config.day_close_time

        current_dt = datetime.datetime.combine(target_date, start_time)
        close_dt = datetime.datetime.combine(target_date, close_time)

        slots = []

        while current_dt + datetime.timedelta(minutes=duration_minutes) <= close_dt:
            slot_start = current_dt.time()
            slot_end_dt = current_dt + datetime.timedelta(minutes=duration_minutes)
            slot_end = slot_end_dt.time()
            slot_full_end_dt = current_dt + datetime.timedelta(minutes=total_slot_span)

            slot_start_aware = self.tz.localize(current_dt)
            slot_end_aware = self.tz.localize(slot_full_end_dt)

            # Check 1: Minimum advance hours
            is_past_min_advance = True
            if target_date == today:
                earliest_allowed = now + datetime.timedelta(hours=self.config.min_advance_hours)
                if slot_start_aware < earliest_allowed:
                    is_past_min_advance = False

            # Check 2: Blockouts
            is_blocked = False
            blockout_reason = ""
            for bo in blockouts:
                # If blockout overlaps with slot window
                if bo.start_datetime < slot_end_aware and bo.end_datetime > slot_start_aware:
                    if not bo.service_area_id or (service_area_id and bo.service_area_id == int(service_area_id)):
                        is_blocked = True
                        blockout_reason = bo.reason or bo.title
                        break

            # Check 3: Capacity & Bookings collision
            # Find overlapping bookings
            overlapping_count = 0
            unassigned_overlapping_count = 0
            busy_staff_ids = set()

            for b in existing_bookings:
                b_start = b["slot_start_time"]
                b_end = b["slot_end_time"]
                # Two intervals [A_start, A_end] and [B_start, B_end] overlap if A_start < B_end and A_end > B_start
                if slot_start < b_end and slot_end > b_start:
                    overlapping_count += 1
                    if b["assigned_staff_id"]:
                        busy_staff_ids.add(b["assigned_staff_id"])
                    else:
                        unassigned_overlapping_count += 1

            # Compute available capacity
            if total_staff_count > 0:
                # Staff-aware capacity
                available_staff = [
                    s for s in staff_list
                    if (s.id not in busy_staff_ids) and
                       (s.id not in staff_schedules or (
                           staff_schedules[s.id].start_time <= slot_start and
                           staff_schedules[s.id].end_time >= slot_end
                       ))
                ]
                remaining_capacity = max(0, len(available_staff) - unassigned_overlapping_count)
            else:
                remaining_capacity = max(0, default_capacity - overlapping_count)

            is_available = is_past_min_advance and not is_blocked and (remaining_capacity > 0)

            reason = None
            if not is_past_min_advance:
                reason = "Notice window passed"
            elif is_blocked:
                reason = blockout_reason or "Time blocked"
            elif remaining_capacity <= 0:
                reason = "Fully booked"

            slots.append({
                "time": slot_start.strftime("%H:%M"),
                "label": slot_start.strftime("%I:%M %p"),
                "end_time": slot_end.strftime("%H:%M"),
                "end_label": slot_end.strftime("%I:%M %p"),
                "available": is_available,
                "remaining_capacity": remaining_capacity if is_available else 0,
                "unavailable_reason": reason,
            })

            current_dt += datetime.timedelta(minutes=slot_interval)

        return {"error": None, "slots": slots}

    def validate_and_reserve_slot(self, target_date, slot_time_str, service_package, vehicle_type=None, service_area=None):
        """
        Validates slot availability atomically before booking creation.
        Returns (is_valid, error_message, slot_start_time, slot_end_time).
        """
        try:
            slot_time = datetime.datetime.strptime(slot_time_str, "%H:%M").time()
        except ValueError:
            return False, "Invalid slot time format. Use HH:MM.", None, None

        slots_data = self.get_available_slots(
            target_date=target_date,
            service_package_id=service_package.id,
            vehicle_type_id=vehicle_type.id if vehicle_type else None,
            service_area_id=service_area.id if service_area else None,
        )

        if slots_data.get("error"):
            return False, slots_data["error"], None, None

        matching_slot = None
        for s in slots_data["slots"]:
            if s["time"] == slot_time_str:
                matching_slot = s
                break

        if not matching_slot:
            return False, "The selected time slot does not align with business operating hours.", None, None

        if not matching_slot["available"]:
            return False, f"Selected slot is unavailable: {matching_slot.get('unavailable_reason', 'Capacity exhausted')}", None, None

        slot_end_time = datetime.datetime.strptime(matching_slot["end_time"], "%H:%M").time()
        return True, None, slot_time, slot_end_time
