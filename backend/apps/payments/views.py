import json
import logging
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.bookings.models import Booking
from apps.bookings.serializers import BookingDetailSerializer
from apps.payments.service import PaymentService
from apps.payments.serializers import (
    RazorpayConfigSerializer,
    RazorpayCreateOrderSerializer,
    RazorpayVerifySerializer,
    RazorpayFailedSerializer,
)

logger = logging.getLogger(__name__)

class RazorpayConfigAPIView(APIView):
    """
    Public endpoint providing public Razorpay client configuration (Key ID & Currency).
    Never exposes the Razorpay Secret Key.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        enabled = PaymentService.is_razorpay_enabled()
        data = {
            "enabled": enabled,
            "key_id": settings.RAZORPAY_KEY_ID if enabled else "",
            "currency": "INR",
        }
        return Response(RazorpayConfigSerializer(data).data)

class RazorpayCreateOrderAPIView(APIView):
    """
    Creates a new Razorpay server-side order for a booking.
    Calculates the exact amount securely from backend records in INR.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RazorpayCreateOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        reference = serializer.validated_data["booking_reference"].strip()
        try:
            booking = Booking.objects.select_related(
                "service_package", "vehicle_type"
            ).get(booking_reference__iexact=reference)
        except Booking.DoesNotExist:
            return Response(
                {"error": "Booking reference not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if booking.payment_status == "PAID":
            return Response(
                {"error": "This booking is already marked as paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not PaymentService.is_razorpay_enabled():
            return Response(
                {"error": "Online payments via Razorpay are currently not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            order_data = PaymentService.create_order(booking)
            return Response(order_data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error creating Razorpay order for {reference}: {str(e)}")
            return Response(
                {"error": f"Failed to initialize Razorpay payment order: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class RazorpayVerifyPaymentAPIView(APIView):
    """
    Verifies Razorpay HMAC signature on the server.
    Marks booking as PAID only after cryptographic verification succeeds.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RazorpayVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        reference = serializer.validated_data["booking_reference"].strip()
        order_id = serializer.validated_data["razorpay_order_id"].strip()
        payment_id = serializer.validated_data["razorpay_payment_id"].strip()
        signature = serializer.validated_data["razorpay_signature"].strip()

        # Step 1: Verify cryptographic signature on the backend
        is_valid = PaymentService.verify_payment_signature(
            order_id=order_id,
            payment_id=payment_id,
            signature=signature,
        )

        if not is_valid:
            logger.warning(
                f"Razorpay signature mismatch for ref: {reference}, order: {order_id}, payment: {payment_id}"
            )
            return Response(
                {"error": "Invalid payment signature. Verification failed on server."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Step 2: Idempotently mark booking and payment as SUCCESS
        try:
            success, booking, payment = PaymentService.handle_successful_payment(
                order_id=order_id,
                payment_id=payment_id,
                signature=signature,
                raw_data=request.data,
            )

            # Real-time WebSocket broadcast to Admin Dashboard and Customer Tracking
            from apps.core.realtime import send_admin_dashboard_event, send_tracking_update
            send_admin_dashboard_event("payment_received", {
                "booking_reference": booking.booking_reference,
                "amount": str(booking.final_amount),
                "payment_id": payment_id,
                "order_id": order_id,
                "customer_name": booking.customer_name,
            })
            send_tracking_update(booking.booking_reference, "payment_confirmed", {
                "booking_reference": booking.booking_reference,
                "payment_status": "PAID",
                "payment_id": payment_id,
            })

            return Response({
                "success": True,
                "message": "Payment verified and booking confirmed successfully.",
                "booking": BookingDetailSerializer(booking).data,
                "payment": {
                    "id": payment.id,
                    "payment_id": payment.payment_id,
                    "order_id": payment.order_id,
                    "amount": str(payment.amount),
                    "status": payment.status,
                },
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error processing verified payment for {order_id}: {str(e)}")
            return Response(
                {"error": f"Payment signature verified, but failed to update records: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class RazorpayPaymentFailedAPIView(APIView):
    """
    Records payment failure or modal dismissal so customer can safely retry without losing booking.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RazorpayFailedSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        order_id = serializer.validated_data["razorpay_order_id"].strip()
        error_data = {
            "code": serializer.validated_data.get("error_code", ""),
            "description": serializer.validated_data.get("error_description", ""),
            "metadata": serializer.validated_data.get("error_metadata", {}),
        }

        PaymentService.handle_failed_payment(order_id=order_id, error_data=error_data)
        return Response({
            "status": "recorded",
            "message": "Payment failure recorded. Customer can retry payment anytime.",
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name="dispatch")
class RazorpayWebhookAPIView(APIView):
    """
    Listens for Razorpay asynchronous webhooks.
    Validates X-Razorpay-Signature and guarantees idempotent booking settlement.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        signature = request.headers.get("X-Razorpay-Signature") or request.META.get("HTTP_X_RAZORPAY_SIGNATURE")
        
        # Verify webhook signature if webhook secret is configured
        if settings.RAZORPAY_WEBHOOK_SECRET:
            if not signature or not PaymentService.verify_webhook_signature(request.body, signature):
                logger.warning("Razorpay webhook signature verification failed.")
                return Response(
                    {"error": "Invalid webhook signature"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            payload = json.loads(request.body.decode("utf-8"))
        except Exception as e:
            return Response({"error": "Malformed JSON"}, status=status.HTTP_400_BAD_REQUEST)

        event = payload.get("event", "")
        event_payload = payload.get("payload", {})
        logger.info(f"Received verified Razorpay webhook event: {event}")

        try:
            PaymentService.process_webhook_event(event=event, payload=event_payload)
        except Exception as e:
            logger.error(f"Error processing webhook event {event}: {str(e)}")

        return Response({"status": "received"}, status=status.HTTP_200_OK)


from rest_framework import viewsets, serializers
from rest_framework.decorators import action
from apps.payments.models import Payment
from apps.core.permissions import IsAdminOrManager
from apps.core.models import AdminAuditLog

class AdminPaymentSerializer(serializers.ModelSerializer):
    booking_reference = serializers.CharField(source="booking.booking_reference", read_only=True)
    customer_name = serializers.CharField(source="booking.customer_name", read_only=True)
    customer_phone = serializers.CharField(source="booking.customer_phone", read_only=True)
    customer_user_id = serializers.SerializerMethodField()
    service_package_name = serializers.CharField(source="booking.service_package.name", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "order_id",
            "payment_id",
            "booking_reference",
            "customer_name",
            "customer_phone",
            "customer_user_id",
            "service_package_name",
            "amount",
            "currency",
            "provider",
            "status",
            "created_at",
            "updated_at",
        ]

    def get_customer_user_id(self, obj):
        if obj.user and hasattr(obj.user, "profile"):
            return obj.user.profile.carspa_user_id
        if obj.booking and obj.booking.user and hasattr(obj.booking.user, "profile"):
            return obj.booking.user.profile.carspa_user_id
        return None


class AdminPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminOrManager]
    serializer_class = AdminPaymentSerializer

    def get_queryset(self):
        qs = Payment.objects.select_related("booking", "booking__service_package", "booking__user", "user").all()
        search = self.request.query_params.get("search", "").strip()
        status_filter = self.request.query_params.get("status", "").strip().upper()

        if status_filter and status_filter != "ALL":
            qs = qs.filter(status=status_filter)

        if search:
            qs = qs.filter(
                models.Q(order_id__icontains=search)
                | models.Q(payment_id__icontains=search)
                | models.Q(booking__booking_reference__icontains=search)
                | models.Q(booking__customer_name__icontains=search)
                | models.Q(booking__customer_phone__icontains=search)
            )
        return qs

    @action(detail=True, methods=["post"], url_path="mark-refunded")
    def mark_refunded(self, request, pk=None):
        payment = self.get_object()
        reason = request.data.get("reason", "Refund recorded by administrator.")
        old_status = payment.status
        payment.status = "REFUNDED"
        payment.save(update_fields=["status", "updated_at"])

        if payment.booking:
            payment.booking.payment_status = "REFUNDED"
            payment.booking.save(update_fields=["payment_status", "updated_at"])

        AdminAuditLog.objects.create(
            user=request.user,
            action="REFUND_PAYMENT",
            resource_type="PAYMENT",
            resource_id=str(payment.id),
            details={"booking": payment.booking.booking_reference if payment.booking else None, "amount": str(payment.amount), "reason": reason},
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        return Response({
            "message": "Payment marked as refunded.",
            "payment": AdminPaymentSerializer(payment).data
        })

