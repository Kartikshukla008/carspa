import json
import asyncio
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework.authtoken.models import Token
from apps.bookings.models import Booking
from apps.core.realtime import TRICITY_COORDINATES, get_destination_coords_for_locality


class AdminDashboardConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time Admin Operations Dashboard.
    Streams new bookings, status updates, payments, and system alerts.
    """

    async def connect(self):
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)
        token_key = query_params.get("token", [None])[0]

        user = await self.get_user_from_token_or_session(token_key)

        # Only allow staff or admin accounts
        is_authorized = await self.is_authorized_admin(user)
        if not is_authorized:
            await self.close(code=4003)
            return

        self.user = user
        self.group_name = "admin_dashboard"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self.send_json({
            "type": "connection_established",
            "message": "Connected to CARSPA Real-time Operations Stream",
            "user": user.username,
            "role": getattr(user, "role", "STAFF"),
        })

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        msg_type = content.get("type")
        if msg_type == "ping":
            await self.send_json({"type": "pong", "timestamp": content.get("timestamp")})
        elif msg_type == "echo":
            await self.send_json({"type": "echo_reply", "payload": content})

    async def dashboard_event(self, event):
        """Handler for events sent via channel_layer.group_send('admin_dashboard')"""
        payload = event.get("payload", {})
        event_name = payload.get("event") or payload.get("event_type", "operational_event")
        await self.send_json({
            "type": "dashboard_event",
            "event": event_name,
            "event_type": event_name,
            **payload,
        })

    @database_sync_to_async
    def get_user_from_token_or_session(self, token_key):
        if token_key:
            try:
                token = Token.objects.select_related("user").get(key=token_key)
                return token.user
            except Token.DoesNotExist:
                pass
        return self.scope.get("user", AnonymousUser())

    @database_sync_to_async
    def is_authorized_admin(self, user):
        if not user or not user.is_authenticated:
            return False
        if user.is_staff or user.is_superuser:
            return True
        profile = getattr(user, "profile", None)
        if profile and profile.role in ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"]:
            return True
        return False


class LiveTrackingConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for customer live van tracking (/track).
    Streams live GPS coordinates, ETA, technician details, and status updates.
    """

    async def connect(self):
        self.booking_reference = self.scope["url_route"]["kwargs"].get("booking_reference", "").strip().upper()
        self.group_name = f"tracking_{self.booking_reference}"

        booking_data = await self.get_booking_data(self.booking_reference)
        if not booking_data:
            await self.close(code=4004)
            return

        self.booking_info = booking_data
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        depot = TRICITY_COORDINATES["DEPOT"]
        destination = get_destination_coords_for_locality(booking_data.get("locality", ""))

        # Initial location response
        await self.send_json({
            "type": "tracking_snapshot",
            "booking_reference": self.booking_reference,
            "status": booking_data["status"],
            "status_display": booking_data["status_display"],
            "customer_name": booking_data["customer_name"],
            "service_package": booking_data["package_name"],
            "vehicle_type": booking_data["vehicle_name"],
            "service_date": booking_data["service_date"],
            "slot_window": f"{booking_data['slot_start']} - {booking_data['slot_end']}",
            "address": booking_data["address"],
            "locality": booking_data["locality"],
            "technician": booking_data["technician"],
            "route": {
                "depot": depot,
                "destination": {
                    **destination,
                    "name": f"Customer Location ({booking_data['locality']})",
                },
            },
            "van_location": {
                "lat": depot["lat"],
                "lng": depot["lng"],
                "speed_kmh": 0 if booking_data["status"] == "COMPLETED" else 32.4,
                "heading_deg": 45,
                "eta_minutes": 15 if booking_data["status"] != "COMPLETED" else 0,
                "van_plate": "CH-01-CS-7087",
                "label": "CARSPA Mobile Detailing Van #1",
            },
        })

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        msg_type = content.get("type")
        if msg_type == "ping":
            await self.send_json({"type": "pong"})
        elif msg_type == "request_location":
            depot = TRICITY_COORDINATES["DEPOT"]
            destination = get_destination_coords_for_locality(self.booking_info.get("locality", ""))
            await self.send_json({
                "type": "van_location_update",
                "van_location": {
                    "lat": depot["lat"],
                    "lng": depot["lng"],
                    "destination": destination,
                    "speed_kmh": 28.0,
                    "eta_minutes": 12,
                },
            })
        elif msg_type == "start_simulation":
            # Asynchronously simulate driving movement for learning/demo demonstration
            asyncio.create_task(self.simulate_driving_loop())

    async def simulate_driving_loop(self):
        """Generates realistic incremental GPS waypoints moving toward customer doorstep."""
        depot = TRICITY_COORDINATES["DEPOT"]
        dest = get_destination_coords_for_locality(self.booking_info.get("locality", ""))

        steps = 10
        for i in range(1, steps + 1):
            fraction = i / steps
            current_lat = round(depot["lat"] + (dest["lat"] - depot["lat"]) * fraction, 5)
            current_lng = round(depot["lng"] + (dest["lng"] - depot["lng"]) * fraction, 5)
            eta = max(int(15 * (1 - fraction)), 1) if i < steps else 0

            update_payload = {
                "booking_reference": self.booking_reference,
                "location": {
                    "lat": current_lat,
                    "lng": current_lng,
                    "speed_kmh": 36.5 if i < steps else 0,
                    "heading_deg": 65,
                    "eta_minutes": eta,
                    "step": i,
                    "total_steps": steps,
                    "is_arrived": i == steps,
                    "van_plate": "CH-01-CS-7087",
                    "status_note": "Arrived at customer doorstep! Preparing equipment." if i == steps else f"In Transit — {eta} mins away",
                },
            }

            # Broadcast to all viewers of this tracking reference
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "van.location.update",
                    "payload": update_payload,
                },
            )
            await asyncio.sleep(2.5)

    async def tracking_event(self, event):
        await self.send_json({
            "type": "tracking_event",
            **event["payload"],
        })

    async def van_location_update(self, event):
        await self.send_json({
            "type": "van_location_update",
            **event["payload"],
        })

    @database_sync_to_async
    def get_booking_data(self, reference):
        try:
            b = Booking.objects.select_related(
                "vehicle_type", "service_package", "assigned_staff"
            ).get(booking_reference__iexact=reference)
            return {
                "id": b.id,
                "reference": b.booking_reference,
                "status": b.status,
                "status_display": b.get_status_display(),
                "customer_name": b.customer_name,
                "package_name": b.service_package.name if b.service_package else "Wash",
                "vehicle_name": b.vehicle_type.name if b.vehicle_type else "Vehicle",
                "service_date": str(b.service_date),
                "slot_start": str(b.slot_start_time)[:5],
                "slot_end": str(b.slot_end_time)[:5],
                "address": b.address_line,
                "locality": b.locality,
                "technician": {
                    "name": b.assigned_staff.name if b.assigned_staff else "Assigned Van Crew",
                    "phone": b.assigned_staff.phone if b.assigned_staff else "7087811881",
                },
            }
        except Booking.DoesNotExist:
            return None
