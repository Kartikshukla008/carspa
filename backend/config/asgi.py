"""
ASGI config for CARSPA project with Django Channels support.
Handles both HTTP and WebSocket protocol routers.
"""

import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import OriginValidator
from apps.core.routing import websocket_urlpatterns

# Allow cross-origin WebSocket connections from Vercel frontend, localhost, and custom domains
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": OriginValidator(
        AuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        ),
        allowed_origins=["*"]
    ),
})
