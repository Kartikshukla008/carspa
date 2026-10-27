import hmac
import hashlib
from decimal import Decimal
from django.conf import settings
from apps.payments.models import Payment

class PaymentService:
    @classmethod
    def is_razorpay_enabled(cls):
        return bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET and settings.PAYMENTS_ENABLED)

    @classmethod
    def create_order_for_booking(cls, booking):
        """
        Creates a Razorpay order or returns simulated/pay-on-service order.
        """
        if not cls.is_razorpay_enabled():
            payment = Payment.objects.create(
                booking=booking,
                provider="PAY_ON_SERVICE",
                amount=booking.final_amount,
                currency="INR",
                status="INITIATED",
                raw_response={"mode": "pay_on_service", "message": "Pay upon completion"}
            )
            return {
                "enabled": False,
                "payment_id": payment.id,
                "provider": "PAY_ON_SERVICE",
                "amount": str(booking.final_amount),
            }

        import razorpay
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        amount_paisa = int(booking.final_amount * 100)
        data = {
            "amount": amount_paisa,
            "currency": "INR",
            "receipt": booking.booking_reference,
            "notes": {
                "customer_name": booking.customer_name,
                "service": booking.service_package.name
            }
        }
        order = client.order.create(data=data)
        payment = Payment.objects.create(
            booking=booking,
            provider="RAZORPAY",
            amount=booking.final_amount,
            currency="INR",
            order_id=order["id"],
            status="INITIATED",
            raw_response=order
        )
        return {
            "enabled": True,
            "key_id": settings.RAZORPAY_KEY_ID,
            "order_id": order["id"],
            "amount": amount_paisa,
            "currency": "INR",
            "booking_reference": booking.booking_reference,
            "payment_id": payment.id,
        }

    @classmethod
    def verify_razorpay_signature(cls, order_id, payment_id, signature):
        if not settings.RAZORPAY_KEY_SECRET:
            return False
        generated_signature = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
            f"{order_id}|{payment_id}".encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(generated_signature, signature)
