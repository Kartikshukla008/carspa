import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

# Predefined realistic coordinates across Tricity
TRICITY_COORDINATES = {
    "DEPOT": {"lat": 30.7082, "lng": 76.8021, "name": "CARSPA Central Depot (Ind. Area Phase 1)"},
    "CHANDIGARH_SEC_17": {"lat": 30.7398, "lng": 76.7827, "name": "Sector 17, Chandigarh"},
    "CHANDIGARH_SEC_35": {"lat": 30.7230, "lng": 76.7663, "name": "Sector 35, Chandigarh"},
    "CHANDIGARH_SEC_43": {"lat": 30.7180, "lng": 76.7530, "name": "Sector 43, Chandigarh"},
    "MOHALI_PHASE_7": {"lat": 30.7046, "lng": 76.7179, "name": "Phase 7, Mohali"},
    "PANCHKULA_SEC_5": {"lat": 30.6942, "lng": 76.8606, "name": "Sector 5, Panchkula"},
    "ZIRAKPUR": {"lat": 30.6425, "lng": 76.8173, "name": "VIP Road, Zirakpur"},
}


def get_destination_coords_for_locality(locality: str) -> dict:
    """Resolve destination coordinates based on customer locality."""
    loc_lower = locality.lower() if locality else ""
    if "mohali" in loc_lower:
        return {"lat": 30.7046, "lng": 76.7179}
    if "panchkula" in loc_lower:
        return {"lat": 30.6942, "lng": 76.8606}
    if "zirakpur" in loc_lower:
        return {"lat": 30.6425, "lng": 76.8173}
    if "35" in loc_lower:
        return {"lat": 30.7230, "lng": 76.7663}
    if "43" in loc_lower or "44" in loc_lower:
        return {"lat": 30.7180, "lng": 76.7530}
    # Default to Chandigarh central sectors
    return {"lat": 30.7333, "lng": 76.7794}


def send_admin_dashboard_event(event_type: str, data: dict):
    """
    Broadcast a real-time event to all connected administrators.
    Groups: 'admin_dashboard'
    """
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        async_to_sync(channel_layer.group_send)(
            "admin_dashboard",
            {
                "type": "dashboard.event",
                "payload": {
                    "event_type": event_type,
                    "data": data,
                },
            },
        )
    except Exception as e:
        logger.warning(f"Failed to send admin dashboard event: {e}")


def send_tracking_update(booking_reference: str, event_type: str, data: dict):
    """
    Broadcast a real-time event to customers tracking a specific booking.
    Groups: 'tracking_<booking_reference>'
    """
    try:
        clean_ref = booking_reference.strip().replace("#", "").upper()
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        async_to_sync(channel_layer.group_send)(
            f"tracking_{clean_ref}",
            {
                "type": "tracking.event",
                "payload": {
                    "event_type": event_type,
                    "booking_reference": clean_ref,
                    "data": data,
                },
            },
        )
    except Exception as e:
        logger.warning(f"Failed to send tracking update for {booking_reference}: {e}")


def broadcast_van_location(booking_reference: str, location_payload: dict):
    """
    Broadcast technician van live GPS coordinates.
    """
    try:
        clean_ref = booking_reference.strip().replace("#", "").upper()
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        async_to_sync(channel_layer.group_send)(
            f"tracking_{clean_ref}",
            {
                "type": "van.location.update",
                "payload": {
                    "booking_reference": clean_ref,
                    "location": location_payload,
                },
            },
        )
    except Exception as e:
        logger.warning(f"Failed to broadcast van location for {booking_reference}: {e}")
