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
        date_param = self.request.query_params.get("date")
        staff_id = self.request.query_params.get("staff_id")
        search = self.request.query_params.get("search")

        if status_param:
            qs = qs.filter(status=status_param)
        if date_param:
            qs = qs.filter(service_date=date_param)
        if staff_id:
            qs = qs.filter(assigned_staff_id=staff_id)
        if search:
            qs = qs.filter(
                models.Q(booking_reference__icontains=search) |
                models.Q(customer_name__icontains=search) |
                models.Q(customer_phone__icontains=search) |
                models.Q(locality__icontains=search)
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
            return Response({"error": "Invalid date format."}, status=status.HTTP_400_BAD_REQUEST)

        engine = AvailabilityEngine()
        is_valid, err_msg, slot_start, slot_end = engine.validate_and_reserve_slot(
            target_date=new_date,
            slot_time_str=new_slot_str,
            service_package=booking.service_package,
            vehicle_type=booking.vehicle_type,
            service_area=booking.service_area
        )

        if not is_valid:
            return Response({"error": err_msg}, status=status.HTTP_400_BAD_REQUEST)

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
            notes=f"Rescheduled from {old_date} {old_time} to {new_date} {slot_start}."
        )

        return Response(BookingDetailSerializer(booking).data)

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
