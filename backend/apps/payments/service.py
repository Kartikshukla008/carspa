import hmac
import hashlib
import logging
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from apps.payments.models import Payment

logger = logging.getLogger(__name__)

class PaymentService:
    @classmethod
    def is_razorpay_enabled(cls) -> bool:
        """
        Returns True if Razorpay keys are configured and payments are enabled.
        """
        return bool(
            settings.RAZORPAY_KEY_ID
            and settings.RAZORPAY_KEY_SECRET
            and settings.PAYMENTS_ENABLED
        )

    @classmethod
    def get_client(cls):
        """
        Initializes and returns the official Razorpay Client.
        """
        import razorpay
        if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
            raise ValueError("Razorpay credentials are not configured in environment.")
        return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

    @classmethod
    def create_order(cls, booking) -> dict:
        """
        Securely creates a Razorpay order on the server for the given booking.
        The price is calculated strictly from the backend booking record in INR (paise).
        """
        if not cls.is_razorpay_enabled():
            raise ValueError("Razorpay online payments are currently disabled or not configured.")

        # Amount in paise (1 INR = 100 paise)
        amount_paisa = int(Decimal(str(booking.final_amount)) * 100)
        if amount_paisa <= 0:
            raise ValueError("Booking amount must be greater than zero.")

        client = cls.get_client()
        receipt_ref = f"{booking.booking_reference}"[:40]

        order_data = {
            "amount": amount_paisa,
            "currency": "INR",
            "receipt": receipt_ref,
            "notes": {
                "booking_reference": booking.booking_reference,
                "customer_name": booking.customer_name,
                "customer_phone": booking.customer_phone,
                "customer_email": booking.customer_email or "",
                "service_package": booking.service_package.name if booking.service_package else "",
                "vehicle_type": booking.vehicle_type.name if booking.vehicle_type else "",
            },
        }

        try:
            order = client.order.create(data=order_data)
        except Exception as e:
            logger.error(f"Failed to create Razorpay order for {booking.booking_reference}: {str(e)}")
            raise

        # Record payment transaction attempt in database
        payment = Payment.objects.create(
            booking=booking,
            provider="RAZORPAY",
            amount=booking.final_amount,
            currency="INR",
            order_id=order["id"],
            status="INITIATED",
            raw_response=order,
        )

        return {
            "enabled": True,
            "key_id": settings.RAZORPAY_KEY_ID,
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": "INR",
            "booking_reference": booking.booking_reference,
            "customer_name": booking.customer_name,
            "customer_email": booking.customer_email or "",
            "customer_phone": booking.customer_phone,
            "service_name": booking.service_package.name if booking.service_package else "",
            "vehicle_name": booking.vehicle_type.name if booking.vehicle_type else "",
            "payment_id": payment.id,
        }

    @classmethod
    def verify_payment_signature(cls, order_id: str, payment_id: str, signature: str) -> bool:
        """
        Verifies the cryptographic HMAC SHA-256 signature returned by Razorpay Checkout.
        """
        if not settings.RAZORPAY_KEY_SECRET or not order_id or not payment_id or not signature:
            return False

        try:
            client = cls.get_client()
            params_dict = {
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature,
            }
            client.utility.verify_payment_signature(params_dict)
            return True
        except Exception as e:
            # Fallback to direct constant-time HMAC check
            generated_signature = hmac.new(
                settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
                f"{order_id}|{payment_id}".encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
            return hmac.compare_digest(generated_signature, signature)

    @classmethod
    def handle_successful_payment(
        cls, order_id: str, payment_id: str, signature: str, raw_data: dict = None
    ):
        """
        Idempotent server-side payment confirmation.
        Updates payment and booking status to PAID, logs audit history, and sends confirmation notification.
        """
        with transaction.atomic():
            payment = Payment.objects.select_for_update().filter(order_id=order_id).first()
            if not payment:
                raise ValueError(f"No payment record found with order_id: {order_id}")

            # Idempotency check: if already marked SUCCESS, return without double-processing
            if payment.status == "SUCCESS" and payment.booking.payment_status == "PAID":
                return True, payment.booking, payment

            payment.payment_id = payment_id
            payment.signature = signature
            payment.status = "SUCCESS"
            if raw_data:
                payment.raw_response = {**payment.raw_response, **raw_data}
            payment.save(update_fields=["payment_id", "signature", "status", "raw_response", "updated_at"])

            booking = payment.booking
            booking.payment_status = "PAID"
            booking.payment_method = "RAZORPAY"
            if booking.status in ["PENDING", ""]:
                booking.status = "CONFIRMED"
            booking.save(update_fields=["payment_status", "payment_method", "status", "updated_at"])

            from apps.bookings.models import BookingStatusHistory
            BookingStatusHistory.objects.create(
                booking=booking,
                from_status="PENDING",
                to_status=booking.status,
                notes=f"Paid ₹{payment.amount} via Razorpay Online (UPI/Cards/NetBanking). Razorpay Payment ID: {payment_id}, Order ID: {order_id}",
            )

        # Trigger customer and admin notifications outside atomic block
        try:
            from apps.notifications.service import NotificationService
            NotificationService.send_booking_confirmed(booking)
        except Exception as e:
            logger.warning(f"Notification error on booking {booking.booking_reference}: {e}")

        return True, booking, payment

    @classmethod
    def handle_failed_payment(cls, order_id: str, payment_id: str = "", error_data: dict = None):
        """
        Records a failed payment attempt while keeping the booking slot safe for retry.
        """
        with transaction.atomic():
            payment = Payment.objects.select_for_update().filter(order_id=order_id).first()
            if not payment:
                return False, None, None

            # Don't overwrite an already successful payment
            if payment.status == "SUCCESS":
                return True, payment.booking, payment

            payment.status = "FAILED"
            if payment_id:
                payment.payment_id = payment_id
            if error_data:
                payment.raw_response = {**payment.raw_response, "error_details": error_data}
            payment.save(update_fields=["status", "payment_id", "raw_response", "updated_at"])

            booking = payment.booking
            # Mark payment_status as FAILED, but do not cancel the booking so the customer can retry
            if booking.payment_status != "PAID":
                booking.payment_status = "FAILED"
                booking.save(update_fields=["payment_status", "updated_at"])

                from apps.bookings.models import BookingStatusHistory
                desc = error_data.get("description") if isinstance(error_data, dict) else str(error_data)
                BookingStatusHistory.objects.create(
                    booking=booking,
                    from_status=booking.status,
                    to_status=booking.status,
                    notes=f"Razorpay payment failed or cancelled: {desc or 'User cancelled modal'}. Customer may retry.",
                )

        return True, booking, payment

    @classmethod
    def verify_webhook_signature(cls, body_bytes: bytes, signature: str) -> bool:
        """
        Verifies Razorpay webhook signature header using the webhook secret.
        """
        secret = settings.RAZORPAY_WEBHOOK_SECRET
        if not secret or not signature:
            return False

        try:
            client = cls.get_client()
            client.utility.verify_webhook_signature(
                body_bytes.decode("utf-8") if isinstance(body_bytes, bytes) else body_bytes,
                signature,
                secret,
            )
            return True
        except Exception:
            expected_signature = hmac.new(
                secret.encode("utf-8"),
                body_bytes if isinstance(body_bytes, bytes) else body_bytes.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
            return hmac.compare_digest(expected_signature, signature)

    @classmethod
    def process_webhook_event(cls, event: str, payload: dict) -> tuple:
        """
        Processes verified Razorpay webhook events.
        Supported events:
        - order.paid: Marks booking as PAID
        - payment.captured: Marks booking as PAID
        - payment.failed: Marks payment as FAILED
        - refund.created / refund.processed: Marks payment and booking as REFUNDED
        """
        payment_entity = payload.get("payment", {}).get("entity", {})
        order_entity = payload.get("order", {}).get("entity", {})

        order_id = order_entity.get("id") or payment_entity.get("order_id")
        payment_id = payment_entity.get("id")

        if event in ("order.paid", "payment.captured"):
            if not order_id:
                logger.warning(f"Webhook {event} received without order_id: {payload}")
                return False, "Missing order_id"
            return cls.handle_successful_payment(
                order_id=order_id,
                payment_id=payment_id or "WEBHOOK_CAPTURED",
                signature="WEBHOOK_VERIFIED",
                raw_data=payload,
            )

        elif event == "payment.failed":
            if order_id:
                return cls.handle_failed_payment(
                    order_id=order_id,
                    payment_id=payment_id or "",
                    error_data=payment_entity.get("error_description") or payload,
                )

        elif event in ("refund.created", "refund.processed"):
            if order_id:
                with transaction.atomic():
                    payment = Payment.objects.filter(order_id=order_id).first()
                    if payment:
                        payment.status = "REFUNDED"
                        payment.raw_response = {**payment.raw_response, "refund": payload}
                        payment.save(update_fields=["status", "raw_response", "updated_at"])
                        booking = payment.booking
                        booking.payment_status = "REFUNDED"
                        booking.save(update_fields=["payment_status", "updated_at"])
                return True, "Refund recorded", None

        return True, "Event ignored", None
