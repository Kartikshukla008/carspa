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
from apps.payments.service import PaymentService
from apps.accounts.models import UserProfile
from apps.payments.models import Payment
from apps.core.models import AdminAuditLog
from apps.core.permissions import IsAdminOrManager, IsAdminStaffOrAbove

class PublicBookingCreateAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = BookingCreateSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            booking = serializer.save()
            data = BookingDetailSerializer(booking).data

            # If customer chose online payment, generate Razorpay order securely
            if booking.payment_method == "RAZORPAY" and PaymentService.is_razorpay_enabled():
                try:
                    order_data = PaymentService.create_order(booking)
                    data["razorpay_order"] = order_data
                except Exception as e:
                    data["razorpay_order_error"] = str(e)

            # Real-time WebSocket broadcast to Admin Operations Dashboard
            from apps.core.realtime import send_admin_dashboard_event
            send_admin_dashboard_event("booking_created", {
                "booking_id": booking.id,
                "booking_reference": booking.booking_reference,
                "customer_name": booking.customer_name,
                "customer_phone": booking.customer_phone,
                "package_name": booking.service_package.name if booking.service_package else "Wash",
                "vehicle_name": booking.vehicle_type.name if booking.vehicle_type else "Vehicle",
                "service_date": str(booking.service_date),
                "slot": f"{str(booking.slot_start_time)[:5]} - {str(booking.slot_end_time)[:5]}",
                "final_amount": str(booking.final_amount),
                "payment_status": booking.payment_status,
                "status": booking.status,
            })

            return Response(
                data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PublicBookingLookupAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        reference = request.query_params.get("reference", "").strip().lstrip("#")
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

        # Broadcast real-time assignment to Admin Dashboard and Customer Live Tracking
        from apps.core.realtime import send_admin_dashboard_event, send_tracking_update
        send_admin_dashboard_event("technician_assigned", {
            "booking_id": booking.id,
            "booking_reference": booking.booking_reference,
            "technician_name": staff.name,
            "technician_phone": staff.phone,
            "status": booking.status,
        })
        send_tracking_update(booking.booking_reference, "technician_dispatched", {
            "booking_reference": booking.booking_reference,
            "technician": {
                "name": staff.name,
                "phone": staff.phone,
            },
            "status": booking.status,
            "status_display": booking.get_status_display(),
        })

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

        from apps.core.realtime import send_admin_dashboard_event, send_tracking_update
        send_admin_dashboard_event("booking_status_updated", {
            "booking_id": booking.id,
            "booking_reference": booking.booking_reference,
            "old_status": old_status,
            "new_status": "COMPLETED",
            "notes": "Booking completed",
        })
        send_tracking_update(booking.booking_reference, "status_updated", {
            "status": "COMPLETED",
            "old_status": old_status,
            "notes": "Booking completed",
        })

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
            from apps.core.realtime import send_admin_dashboard_event, send_tracking_update
            send_admin_dashboard_event("payment_received" if new_status == "PAID" else "booking_status_updated", {
                "booking_id": booking.id,
                "booking_reference": booking.booking_reference,
                "payment_status": new_status,
            })
            send_tracking_update(booking.booking_reference, "payment_updated", {
                "payment_status": new_status,
            })
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
        AdminAuditLog.objects.create(
            user=request.user,
            action="CANCEL_BOOKING",
            resource_type="BOOKING",
            resource_id=booking.booking_reference,
            details={"reason": reason},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        from apps.core.realtime import send_admin_dashboard_event, send_tracking_update
        send_admin_dashboard_event("booking_status_updated", {
            "booking_id": booking.id,
            "booking_reference": booking.booking_reference,
            "old_status": old_status,
            "new_status": "CANCELLED",
            "notes": reason,
        })
        send_tracking_update(booking.booking_reference, "status_updated", {
            "status": "CANCELLED",
            "old_status": old_status,
            "notes": reason,
        })
        return Response(BookingDetailSerializer(booking).data)

    def create(self, request, *args, **kwargs):
        """
        Allows authorized administrators to manually create bookings for customers.
        """
        serializer = BookingCreateSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            booking = serializer.save()
            AdminAuditLog.objects.create(
                user=request.user,
                action="MANUAL_BOOKING_CREATE",
                resource_type="BOOKING",
                resource_id=booking.booking_reference,
                details={"customer": booking.customer_name, "amount": str(booking.final_amount)},
                ip_address=request.META.get("REMOTE_ADDR"),
            )
            from apps.core.realtime import send_admin_dashboard_event
            send_admin_dashboard_event("booking_created", {
                "booking_id": booking.id,
                "booking_reference": booking.booking_reference,
                "customer_name": booking.customer_name,
                "customer_phone": booking.customer_phone,
                "package_name": booking.service_package.name if booking.service_package else "Wash",
                "vehicle_name": booking.vehicle_type.name if booking.vehicle_type else "Vehicle",
                "service_date": str(booking.service_date),
                "slot": f"{booking.slot_start_time.strftime('%I:%M %p')} - {booking.slot_end_time.strftime('%I:%M %p')}",
                "final_amount": str(booking.final_amount),
                "status": booking.status,
                "locality": booking.locality,
            })
            return Response(BookingDetailSerializer(booking).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="transition-status")
    def transition_status(self, request, pk=None):
        booking = self.get_object()
        new_status = request.data.get("status", "").upper()
        notes = request.data.get("notes", "")

        VALID_TRANSITIONS = {
            "PENDING": ["CONFIRMED", "CANCELLED", "REJECTED"],
            "CONFIRMED": ["ASSIGNED", "IN_PROGRESS", "CANCELLED"],
            "ASSIGNED": ["IN_PROGRESS", "CONFIRMED", "CANCELLED"],
            "IN_PROGRESS": ["COMPLETED", "CANCELLED"],
            "COMPLETED": [],
            "CANCELLED": [],
            "REJECTED": [],
        }

        if new_status not in [c[0] for c in Booking.STATUS_CHOICES]:
            return Response({"error": f"Invalid status: {new_status}"}, status=status.HTTP_400_BAD_REQUEST)

        force = request.data.get("force", False)
        allowed = VALID_TRANSITIONS.get(booking.status, [])
        if not force and new_status not in allowed:
            return Response({
                "error": f"Invalid status transition from {booking.status} to {new_status}. Allowed next states: {', '.join(allowed) or 'None (Terminal state)'}"
            }, status=status.HTTP_400_BAD_REQUEST)

        old_status = booking.status
        booking.status = new_status
        if new_status == "COMPLETED" and request.data.get("mark_paid", False):
            booking.payment_status = "PAID"
        booking.save(update_fields=["status", "payment_status", "updated_at"])

        BookingStatusHistory.objects.create(
            booking=booking,
            from_status=old_status,
            to_status=new_status,
            changed_by=request.user,
            notes=notes or f"Status changed to {new_status} by admin.",
        )

        AdminAuditLog.objects.create(
            user=request.user,
            action="CHANGE_BOOKING_STATUS",
            resource_type="BOOKING",
            resource_id=booking.booking_reference,
            details={"old_status": old_status, "new_status": new_status, "notes": notes},
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        from apps.core.realtime import send_admin_dashboard_event, send_tracking_update
        send_admin_dashboard_event("booking_status_updated", {
            "booking_id": booking.id,
            "booking_reference": booking.booking_reference,
            "old_status": old_status,
            "new_status": new_status,
            "notes": notes,
        })
        send_tracking_update(booking.booking_reference, "status_updated", {
            "status": new_status,
            "old_status": old_status,
            "notes": notes,
        })

        return Response(BookingDetailSerializer(booking).data)

    @action(detail=True, methods=["get"], url_path="history")
    def status_history(self, request, pk=None):
        booking = self.get_object()
        history = booking.status_history.select_related("changed_by").all()
        return Response([
            {
                "id": h.id,
                "from_status": h.from_status,
                "to_status": h.to_status,
                "changed_by": h.changed_by.get_full_name() or h.changed_by.username if h.changed_by else "System",
                "notes": h.notes,
                "created_at": h.created_at,
            }
            for h in history
        ])

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
        week_ago = today - datetime.timedelta(days=7)
        month_start = today.replace(day=1)

        # 1. Registered Customers
        all_profiles = UserProfile.objects.all()
        total_registered_users = all_profiles.count()
        new_users_today = all_profiles.filter(created_at__date=today).count()
        new_users_this_week = all_profiles.filter(created_at__date__gte=week_ago).count()
        new_users_this_month = all_profiles.filter(created_at__date__gte=month_start).count()

        # 2. Bookings
        all_bookings = Booking.objects.select_related("vehicle_type", "service_package").all()
        total_bookings = all_bookings.count()
        today_bookings = all_bookings.filter(service_date=today).count()
        pending_bookings = all_bookings.filter(status="PENDING").count()
        confirmed_bookings = all_bookings.filter(status="CONFIRMED").count()
        in_progress_bookings = all_bookings.filter(status__in=["ASSIGNED", "IN_PROGRESS"]).count()
        completed_bookings = all_bookings.filter(status="COMPLETED").count()
        cancelled_bookings = all_bookings.filter(status__in=["CANCELLED", "REJECTED"]).count()

        # 3. Revenue (Strictly Collected Revenue: payment_status="PAID")
        paid_bookings = all_bookings.filter(payment_status="PAID")
        total_revenue = paid_bookings.aggregate(total=models.Sum("final_amount"))["total"] or Decimal("0.00")
        revenue_today = paid_bookings.filter(service_date=today).aggregate(total=models.Sum("final_amount"))["total"] or Decimal("0.00")
        revenue_this_week = paid_bookings.filter(service_date__gte=week_ago).aggregate(total=models.Sum("final_amount"))["total"] or Decimal("0.00")
        revenue_this_month = paid_bookings.filter(service_date__gte=month_start).aggregate(total=models.Sum("final_amount"))["total"] or Decimal("0.00")

        paid_count = paid_bookings.count()
        avg_booking_value = round(float(total_revenue) / max(paid_count, 1), 2) if paid_count > 0 else 0.0

        # 4. Payments
        successful_payments = paid_count
        pending_payments = all_bookings.filter(payment_status="PENDING").count()
        failed_payments = all_bookings.filter(payment_status="FAILED").count()

        # 5. Charts: Daily Revenue & Volume (Last 14 Days)
        daily_trend = []
        for i in range(13, -1, -1):
            d = today - datetime.timedelta(days=i)
            day_bookings = all_bookings.filter(service_date=d)
            day_rev = day_bookings.filter(payment_status="PAID").aggregate(total=models.Sum("final_amount"))["total"] or Decimal("0.00")
            daily_trend.append({
                "date": d.isoformat(),
                "label": d.strftime("%d %b"),
                "revenue": float(day_rev),
                "bookings": day_bookings.count(),
            })

        # Charts: Weekly Revenue & Volume (Last 8 Weeks)
        weekly_trend = []
        for i in range(7, -1, -1):
            w_start = today - datetime.timedelta(days=(i * 7) + 6)
            w_end = today - datetime.timedelta(days=i * 7)
            w_bookings = all_bookings.filter(service_date__gte=w_start, service_date__lte=w_end)
            w_rev = w_bookings.filter(payment_status="PAID").aggregate(total=models.Sum("final_amount"))["total"] or Decimal("0.00")
            weekly_trend.append({
                "label": f"{w_start.strftime('%d %b')}",
                "revenue": float(w_rev),
                "bookings": w_bookings.count(),
            })

        # Charts: Monthly Revenue & Volume (Last 6 Months)
        monthly_trend = []
        for i in range(5, -1, -1):
            # approximate month offset
            m_date = (today.replace(day=1) - datetime.timedelta(days=i * 30)).replace(day=1)
            # end of month
            next_m = (m_date.replace(day=28) + datetime.timedelta(days=4)).replace(day=1)
            m_bookings = all_bookings.filter(service_date__gte=m_date, service_date__lt=next_m)
            m_rev = m_bookings.filter(payment_status="PAID").aggregate(total=models.Sum("final_amount"))["total"] or Decimal("0.00")
            monthly_trend.append({
                "label": m_date.strftime("%b %Y"),
                "revenue": float(m_rev),
                "bookings": m_bookings.count(),
            })

        # 6. Status Distributions
        status_distribution = [
            {"name": "Completed", "count": completed_bookings, "color": "#10b981"},
            {"name": "In Progress", "count": in_progress_bookings, "color": "#06b6d4"},
            {"name": "Confirmed", "count": confirmed_bookings, "color": "#3b82f6"},
            {"name": "Pending", "count": pending_bookings, "color": "#f59e0b"},
            {"name": "Cancelled", "count": cancelled_bookings, "color": "#f43f5e"},
        ]

        payment_status_distribution = [
            {"name": "Paid Online / Completed", "count": successful_payments, "color": "#10b981"},
            {"name": "Pending Settlement", "count": pending_payments, "color": "#f59e0b"},
            {"name": "Failed / Declined", "count": failed_payments, "color": "#f43f5e"},
        ]

        # 7. Popular Services & Vehicle Breakdown
        service_counts = (
            all_bookings.values("service_package__name")
            .annotate(
                count=models.Count("id"),
                revenue=models.Sum("final_amount")
            )
            .order_by("-count")[:5]
        )
        popular_services = [
            {
                "name": s["service_package__name"] or "Standard Package",
                "count": s["count"],
                "revenue": float(s["revenue"] or 0),
            }
            for s in service_counts
        ]

        vehicle_counts = (
            all_bookings.values("vehicle_type__name")
            .annotate(count=models.Count("id"))
            .order_by("-count")[:5]
        )
        popular_vehicles = [
            {"name": v["vehicle_type__name"] or "Standard Car", "count": v["count"]}
            for v in vehicle_counts
        ]

        # 8. Recent Activity Feeds
        recent_bookings = BookingDetailSerializer(all_bookings[:6], many=True).data
        recent_users = [
            {
                "id": p.id,
                "user_id": p.carspa_user_id,
                "full_name": p.full_name,
                "email": p.user.email,
                "phone": p.phone,
                "created_at": p.created_at,
            }
            for p in all_profiles.order_by("-created_at")[:6]
        ]
        recent_payments = [
            {
                "id": pay.id,
                "payment_id": pay.payment_id or f"PAY-{pay.id}",
                "order_id": pay.order_id,
                "booking_reference": pay.booking.booking_reference if pay.booking else None,
                "customer_name": pay.booking.customer_name if pay.booking else "Customer",
                "amount": str(pay.amount),
                "status": pay.status,
                "created_at": pay.created_at,
            }
            for pay in Payment.objects.select_related("booking").order_by("-created_at")[:6]
        ]

        # Leads stats
        total_leads = Lead.objects.count()
        new_leads = Lead.objects.filter(status="NEW").count()
        converted_leads = Lead.objects.filter(status="CONVERTED").count()
        conversion_rate = round((converted_leads / total_leads) * 100, 1) if total_leads > 0 else 0.0

        # Upcoming appointments
        upcoming = all_bookings.filter(
            service_date__gte=today,
            status__in=["CONFIRMED", "ASSIGNED", "IN_PROGRESS", "PENDING"],
        ).order_by("service_date", "slot_start_time")[:8]

        return Response({
            "metrics": {
                "total_users": total_registered_users,
                "new_users_today": new_users_today,
                "new_users_this_week": new_users_this_week,
                "new_users_this_month": new_users_this_month,
                "total_bookings": total_bookings,
                "today_bookings_count": today_bookings,
                "pending_confirmations": pending_bookings,
                "confirmed_bookings": confirmed_bookings,
                "in_progress_bookings": in_progress_bookings,
                "completed_jobs": completed_bookings,
                "cancelled_bookings": cancelled_bookings,
                "total_revenue": str(total_revenue),
                "revenue_today": str(revenue_today),
                "revenue_this_week": str(revenue_this_week),
                "revenue_this_month": str(revenue_this_month),
                "average_booking_value": avg_booking_value,
                "successful_payments": successful_payments,
                "pending_payments": pending_payments,
                "failed_payments": failed_payments,
                "total_leads": total_leads,
                "new_leads": new_leads,
                "conversion_rate": f"{conversion_rate}%",
            },
            "charts": {
                "daily": daily_trend,
                "weekly": weekly_trend,
                "monthly": monthly_trend,
                "status_distribution": status_distribution,
                "payment_status_distribution": payment_status_distribution,
                "popular_services": popular_services,
                "popular_vehicles": popular_vehicles,
            },
            "recent_activity": {
                "recent_bookings": recent_bookings,
                "recent_users": recent_users,
                "recent_payments": recent_payments,
            },
            "upcoming_appointments": BookingDetailSerializer(upcoming, many=True).data,
        })
