import csv
import datetime
from decimal import Decimal
from django.db import models, transaction
from django.utils import timezone
from django.http import HttpResponse
from rest_framework import generics, viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.bookings.models import Booking, BookingStatusHistory, BookingAssignment
from apps.bookings.serializers import BookingCreateSerializer, BookingDetailSerializer
from apps.staff.models import StaffProfile
from apps.crm.models import Lead
from apps.scheduling.engine import AvailabilityEngine
from apps.notifications.service import NotificationService

class PublicBookingCreateAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = BookingCreateSerializer(data=request.data)
        if serializer.is_valid():
            booking = serializer.save()
            return Response(
                BookingDetailSerializer(booking).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PublicBookingLookupAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        reference = request.query_params.get("reference", "").strip()
        phone = request.query_params.get("phone", "").strip()

        if not reference:
            return Response(
                {"error": "Please provide a booking reference."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            booking = Booking.objects.select_related(
                "vehicle_type", "service_package", "service_area", "assigned_staff"
            ).get(booking_reference__iexact=reference)
        except Booking.DoesNotExist:
            return Response(
                {"error": "No booking found with this reference."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Phone verification if supplied or if full address needs protection
        return Response(BookingDetailSerializer(booking).data)

class AdminBookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all().select_related(
        "vehicle_type", "service_package", "service_area", "assigned_staff", "customer"
    )
    serializer_class = BookingDetailSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        payment_status_param = self.request.query_params.get("payment_status")
        date_param = self.request.query_params.get("date")
        package_id = self.request.query_params.get("package")
        vehicle_type_id = self.request.query_params.get("vehicle_type")
        staff_id = self.request.query_params.get("staff_id")
        search = self.request.query_params.get("search")

        if status_param:
            qs = qs.filter(status=status_param)
        if payment_status_param:
            qs = qs.filter(payment_status=payment_status_param)
        if date_param:
            qs = qs.filter(service_date=date_param)
        if package_id:
            qs = qs.filter(service_package_id=package_id)
        if vehicle_type_id:
            qs = qs.filter(vehicle_type_id=vehicle_type_id)
        if staff_id:
            qs = qs.filter(assigned_staff_id=staff_id)
        if search:
            qs = qs.filter(
                models.Q(booking_reference__icontains=search) |
                models.Q(customer_name__icontains=search) |
                models.Q(customer_phone__icontains=search) |
                models.Q(customer_email__icontains=search) |
                models.Q(locality__icontains=search) |
                models.Q(address_line__icontains=search) |
                models.Q(service_package__name__icontains=search) |
                models.Q(vehicle_type__name__icontains=search)
            )
        return qs

    @action(detail=True, methods=["post"], url_path="confirm")
    def confirm_booking(self, request, pk=None):
        booking = self.get_object()
        old_status = booking.status
        booking.status = "CONFIRMED"
        booking.save(update_fields=["status", "updated_at"])

        BookingStatusHistory.objects.create(
            booking=booking,
            from_status=old_status,
            to_status="CONFIRMED",
            changed_by=request.user,
            notes=request.data.get("notes", "Confirmed by administrator.")
        )
        NotificationService.send_booking_confirmed(booking)
        return Response(BookingDetailSerializer(booking).data)

    @action(detail=True, methods=["post"], url_path="assign")
    def assign_staff(self, request, pk=None):
        booking = self.get_object()
        staff_id = request.data.get("staff_id")
        notes = request.data.get("notes", "")

        if not staff_id:
            return Response({"error": "staff_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            staff = StaffProfile.objects.get(id=staff_id, is_active=True)
        except StaffProfile.DoesNotExist:
            return Response({"error": "Staff member not found or inactive."}, status=status.HTTP_404_NOT_FOUND)

        old_status = booking.status
        booking.assigned_staff = staff
        if booking.status in ["PENDING", "CONFIRMED"]:
            booking.status = "ASSIGNED"
        booking.save(update_fields=["assigned_staff", "status", "updated_at"])

        BookingAssignment.objects.create(
            booking=booking,
            staff=staff,
            assigned_by=request.user,
            notes=notes
        )

        BookingStatusHistory.objects.create(
            booking=booking,
            from_status=old_status,
            to_status=booking.status,
            changed_by=request.user,
            notes=f"Assigned staff {staff.name}."
        )

        NotificationService.send_staff_assigned(booking, staff)
        return Response(BookingDetailSerializer(booking).data)

    @action(detail=True, methods=["post"], url_path="reschedule")
    def reschedule_booking(self, request, pk=None):
        booking = self.get_object()
        new_date_str = request.data.get("service_date")
        new_slot_str = request.data.get("slot_time")

        if not new_date_str or not new_slot_str:
            return Response(
                {"error": "Both 'service_date' (YYYY-MM-DD) and 'slot_time' (HH:MM) are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            new_date = datetime.datetime.strptime(new_date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "Invalid date format. Expected YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        engine = AvailabilityEngine()
        is_valid, err_msg, slot_start, slot_end = engine.validate_and_reserve_slot(
            target_date=new_date,
            slot_time_str=new_slot_str,
            service_package=booking.service_package,
            vehicle_type=booking.vehicle_type,
            service_area=booking.service_area
        )

        force = request.data.get("force", False)
        if not is_valid:
            if not force:
                return Response({"error": err_msg}, status=status.HTTP_400_BAD_REQUEST)
            try:
                slot_start = datetime.datetime.strptime(new_slot_str, "%H:%M").time()
            except ValueError:
                return Response({"error": "Invalid slot_time format. Use HH:MM."}, status=status.HTTP_400_BAD_REQUEST)
            slot_end = (datetime.datetime.combine(new_date, slot_start) + datetime.timedelta(minutes=booking.estimated_duration_minutes)).time()

        old_date = booking.service_date
        old_time = booking.slot_start_time

        booking.service_date = new_date
        booking.slot_start_time = slot_start
        booking.slot_end_time = slot_end
        booking.save(update_fields=["service_date", "slot_start_time", "slot_end_time", "updated_at"])

        BookingStatusHistory.objects.create(
            booking=booking,
            from_status=booking.status,
            to_status=booking.status,
            changed_by=request.user,
            notes=f"Rescheduled from {old_date} {old_time.strftime('%I:%M %p')} to {new_date} {slot_start.strftime('%I:%M %p')}."
        )

        try:
            NotificationService.send_booking_rescheduled(booking, old_date, old_time.strftime('%I:%M %p'))
        except Exception:
            pass

        return Response(BookingDetailSerializer(booking).data)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete_booking(self, request, pk=None):
        booking = self.get_object()
        if booking.status == "CANCELLED":
            return Response(
                {"error": "Cannot complete a cancelled booking."},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_status = booking.status
        booking.status = "COMPLETED"
        mark_paid = request.data.get("mark_paid", True)
        if mark_paid and booking.payment_status != "PAID":
            booking.payment_status = "PAID"
        booking.save(update_fields=["status", "payment_status", "updated_at"])

        BookingStatusHistory.objects.create(
            booking=booking,
            from_status=old_status,
            to_status="COMPLETED",
            changed_by=request.user,
            notes=request.data.get("notes", "Marked as completed by administrator.")
        )

        try:
            NotificationService.send_booking_completed(booking)
        except Exception:
            pass

        return Response(BookingDetailSerializer(booking).data)

    @action(detail=True, methods=["post"], url_path="update-payment")
    def update_payment(self, request, pk=None):
        booking = self.get_object()
        new_status = request.data.get("payment_status")
        if new_status in ["PENDING", "PAID", "FAILED", "REFUNDED"]:
            old_p_status = booking.payment_status
            booking.payment_status = new_status
            booking.save(update_fields=["payment_status", "updated_at"])
            BookingStatusHistory.objects.create(
                booking=booking,
                from_status=booking.status,
                to_status=booking.status,
                changed_by=request.user,
                notes=f"Payment status updated from {old_p_status} to {new_status}."
            )
            return Response(BookingDetailSerializer(booking).data)
        return Response(
            {"error": "Invalid payment status. Allowed: PENDING, PAID, FAILED, REFUNDED"},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel_booking(self, request, pk=None):
        booking = self.get_object()
        reason = request.data.get("reason", "Cancelled by administrator.")

        if booking.status in ["COMPLETED", "CANCELLED"]:
            return Response(
                {"error": f"Cannot cancel a booking in {booking.status} state."},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_status = booking.status
        booking.status = "CANCELLED"
        booking.cancellation_reason = reason
        booking.cancelled_at = timezone.now()
        booking.save(update_fields=["status", "cancellation_reason", "cancelled_at", "updated_at"])

        BookingStatusHistory.objects.create(
            booking=booking,
            from_status=old_status,
            to_status="CANCELLED",
            changed_by=request.user,
            notes=f"Cancelled: {reason}"
        )

        NotificationService.send_booking_cancelled(booking, reason)
        return Response(BookingDetailSerializer(booking).data)

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="bookings_export.csv"'

        writer = csv.writer(response)
        writer.writerow([
            "Reference", "Date", "Slot", "Customer", "Phone", "Locality",
            "Vehicle", "Package", "Status", "Amount", "Payment Status", "Staff", "Created At"
        ])

        for b in self.get_queryset():
            writer.writerow([
                b.booking_reference,
                b.service_date,
                b.slot_start_time,
                b.customer_name,
                b.customer_phone,
                b.locality,
                b.vehicle_type.name,
                b.service_package.name,
                b.get_status_display(),
                b.final_amount,
                b.payment_status,
                b.assigned_staff.name if b.assigned_staff else "Unassigned",
                b.created_at.strftime("%Y-%m-%d %H:%M"),
            ])

        return response

class AdminDashboardMetricsAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        today = timezone.localdate()
        
        # Booking counts
        all_bookings = Booking.objects.all()
        today_bookings = all_bookings.filter(service_date=today)
        pending_count = all_bookings.filter(status="PENDING").count()
        confirmed_count = all_bookings.filter(status="CONFIRMED").count()
        completed_count = all_bookings.filter(status="COMPLETED").count()
        cancelled_count = all_bookings.filter(status="CANCELLED").count()
        
        # Revenue calculation (Sum of completed bookings or paid bookings)
        revenue_agg = all_bookings.filter(
            models.Q(status="COMPLETED") | models.Q(payment_status="PAID")
        ).aggregate(total=models.Sum("final_amount"))
        total_revenue = revenue_agg["total"] or Decimal("0.00")

        # Leads stats
        total_leads = Lead.objects.count()
        new_leads = Lead.objects.filter(status="NEW").count()
        converted_leads = Lead.objects.filter(status="CONVERTED").count()
        conversion_rate = 0.0
        if total_leads > 0:
            conversion_rate = round((converted_leads / total_leads) * 100, 1)

        # Upcoming appointments
        upcoming = all_bookings.filter(
            service_date__gte=today,
            status__in=["CONFIRMED", "ASSIGNED", "IN_PROGRESS", "PENDING"]
        ).order_by("service_date", "slot_start_time")[:8]

        return Response({
            "metrics": {
                "total_bookings": all_bookings.count(),
                "today_bookings_count": today_bookings.count(),
                "pending_confirmations": pending_count,
                "confirmed_bookings": confirmed_count,
                "completed_jobs": completed_count,
                "cancelled_bookings": cancelled_count,
                "total_revenue": str(total_revenue),
                "total_leads": total_leads,
                "new_leads": new_leads,
                "conversion_rate": f"{conversion_rate}%",
            },
            "upcoming_appointments": BookingDetailSerializer(upcoming, many=True).data
        })
