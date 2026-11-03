from django.urls import re_path
from apps.core.consumers import AdminDashboardConsumer, LiveTrackingConsumer

websocket_urlpatterns = [
    re_path(r"^ws/admin/dashboard/$", AdminDashboardConsumer.as_asgi()),
    re_path(r"^ws/tracking/(?P<booking_reference>[\w-]+)/$", LiveTrackingConsumer.as_asgi()),
]
