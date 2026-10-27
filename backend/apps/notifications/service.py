import json
import logging
from django.conf import settings
from django.core.mail import send_mail
from apps.notifications.models import NotificationLog

logger = logging.getLogger(__name__)

class NotificationService:
    """
    Extensible notification dispatcher supporting WhatsApp Cloud API, Email, and SMS.
    Safely logs and simulates deliveries when external provider keys are not yet configured.
    """

    @classmethod
    def send_booking_created(cls, booking):
        cls._send_customer_confirmation(booking)
        cls._send_admin_alert(booking)

    @classmethod
    def send_booking_confirmed(cls, booking):
        message = (
            f"Dear {booking.customer_name}, your car wash appointment {booking.booking_reference} "
            f"has been CONFIRMED for {booking.service_date.strftime('%A, %d %b %Y')} at {booking.slot_start_time.strftime('%I:%M %p')}. "
            f"Package: {booking.service_package.name} ({booking.vehicle_type.name}). Amount: ₹{booking.final_amount}."
        )
        cls._dispatch(
            booking=booking,
            recipient=booking.customer_phone,
            channel="WHATSAPP",
            event_type="BOOKING_CONFIRMED",
            message=message
        )
        if booking.customer_email:
            cls._dispatch(
                booking=booking,
                recipient=booking.customer_email,
                channel="EMAIL",
                event_type="BOOKING_CONFIRMED",
                message=message,
                subject=f"Booking Confirmed: {booking.booking_reference}"
            )

    @classmethod
    def send_booking_cancelled(cls, booking, reason=""):
        message = (
            f"Your doorstep car wash booking {booking.booking_reference} on {booking.service_date} "
            f"has been cancelled. Reason: {reason or 'Customer request/Schedule adjustment'}."
        )
        cls._dispatch(
            booking=booking,
            recipient=booking.customer_phone,
            channel="WHATSAPP",
            event_type="BOOKING_CANCELLED",
            message=message
        )

    @classmethod
    def send_staff_assigned(cls, booking, staff):
        if staff and staff.phone:
            message = (
                f"New job assigned! Booking {booking.booking_reference} for {booking.customer_name} "
                f"at {booking.address_line}, {booking.locality} on {booking.service_date} at {booking.slot_start_time.strftime('%I:%M %p')}. "
                f"Customer phone: {booking.customer_phone}."
            )
            cls._dispatch(
                booking=booking,
                recipient=staff.phone,
                channel="WHATSAPP",
                event_type="STAFF_ASSIGNED",
                message=message
            )

    @classmethod
    def _send_customer_confirmation(cls, booking):
        message = (
            f"Hello {booking.customer_name}, thank you for booking CARSPA Doorstep Car Wash!\n"
            f"Booking Ref: {booking.booking_reference}\n"
            f"Date: {booking.service_date.strftime('%d %b %Y')}\n"
            f"Time: {booking.slot_start_time.strftime('%I:%M %p')}\n"
            f"Package: {booking.service_package.name}\n"
            f"Vehicle: {booking.vehicle_type.name}\n"
            f"Total: ₹{booking.final_amount}\n"
            f"Status: {booking.get_status_display()}\n\n"
            f"Our team will arrive with professional equipment. Need assistance? Reply to this message!"
        )
        cls._dispatch(
            booking=booking,
            recipient=booking.customer_phone,
            channel="WHATSAPP",
            event_type="BOOKING_CREATED",
            message=message
        )

    @classmethod
    def _send_admin_alert(cls, booking):
        admin_phone = getattr(settings, "ADMIN_NOTIFICATION_PHONE", "")
        admin_email = getattr(settings, "ADMIN_NOTIFICATION_EMAIL", "")
        
        summary = (
            f"[NEW CAR WASH BOOKING]\n"
            f"Ref: {booking.booking_reference}\n"
            f"Customer: {booking.customer_name} ({booking.customer_phone})\n"
            f"Locality: {booking.locality}\n"
            f"Date/Time: {booking.service_date} @ {booking.slot_start_time}\n"
            f"Package: {booking.service_package.name} (₹{booking.final_amount})"
        )

        if admin_phone:
            cls._dispatch(
                booking=booking,
                recipient=admin_phone,
                channel="SMS",
                event_type="ADMIN_ALERT",
                message=summary
            )
        if admin_email:
            cls._dispatch(
                booking=booking,
                recipient=admin_email,
                channel="EMAIL",
                event_type="ADMIN_ALERT",
                message=summary,
                subject=f"New Booking Alert: {booking.booking_reference}"
            )

    @classmethod
    def _dispatch(cls, booking, recipient, channel, event_type, message, subject="Doorstep Car Wash Notification"):
        token = getattr(settings, "WHATSAPP_API_TOKEN", "")
        phone_id = getattr(settings, "WHATSAPP_PHONE_NUMBER_ID", "")
        
        status = "SIMULATED"
        error_msg = ""

        # WhatsApp official API dispatch if credentials supplied
        if channel == "WHATSAPP" and token and phone_id:
            try:
                import requests
                url = f"https://graph.facebook.com/v18.0/{phone_id}/messages"
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }
                data = {
                    "messaging_product": "whatsapp",
                    "to": recipient.replace("+", "").replace(" ", "").replace("-", ""),
                    "type": "text",
                    "text": {"body": message}
                }
                resp = requests.post(url, json=data, headers=headers, timeout=5)
                if resp.status_code in [200, 201]:
                    status = "SENT"
                else:
                    status = "FAILED"
                    error_msg = resp.text
            except Exception as e:
                status = "FAILED"
                error_msg = str(e)
        elif channel == "EMAIL" and getattr(settings, "EMAIL_HOST_USER", None):
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[recipient],
                    fail_silently=False
                )
                status = "SENT"
            except Exception as e:
                status = "FAILED"
                error_msg = str(e)
        else:
            # Simulated delivery recorded for transparency and testing
            status = "SIMULATED"
            logger.info(f"[{channel}] Simulated send to {recipient}: {message[:60]}...")

        NotificationLog.objects.create(
            booking=booking,
            recipient=recipient,
            channel=channel,
            event_type=event_type,
            status=status,
            payload={"message": message, "subject": subject},
            error_message=error_msg
        )
