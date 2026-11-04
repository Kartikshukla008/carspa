import uuid
from rest_framework import views, status, permissions
from rest_framework.response import Response
from django.utils import timezone

from apps.services.models import ServicePackage, ServicePackagePrice
from apps.chatbot.models import ChatSession, ChatMessage, ChatOffer, ChatFAQ
from apps.chatbot.serializers import (
    ChatMessageSerializer,
    ChatSessionSerializer,
    ChatOfferSerializer,
    ChatFAQSerializer,
)
from apps.chatbot.engine import ChatbotEngine


class ChatMessageAPIView(views.APIView):
    """
    POST /api/chatbot/message/
    Processes customer natural-language query and returns database-grounded reply.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        user_message = request.data.get("message", "").strip()
        session_id = request.data.get("session_id", "").strip() or str(uuid.uuid4())

        if not user_message:
            return Response(
                {"error": "Please provide a message."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = getattr(request, "user", None)
        if user and not user.is_authenticated:
            user = None

        result = ChatbotEngine.process_message(
            session_id=session_id,
            user_text=user_message,
            user=user,
        )

        return Response(result, status=status.HTTP_200_OK)


class ChatServicesAPIView(views.APIView):
    """
    GET /api/chatbot/services/
    Returns active detailing packages with descriptions and features.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        packages = ServicePackage.objects.filter(is_active=True).order_by("sort_order")
        data = [
            {
                "id": p.id,
                "name": p.name,
                "slug": p.slug,
                "short_description": p.short_description,
                "description": p.description,
                "duration_minutes": p.estimated_duration_minutes,
                "features": p.features,
                "is_popular": p.is_popular,
                "badge_text": p.badge_text,
            }
            for p in packages
        ]
        return Response({"services": data}, status=status.HTTP_200_OK)


class ChatPricingAPIView(views.APIView):
    """
    GET /api/chatbot/pricing/
    Returns the real-time pricing matrix across all packages and vehicle types.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        vehicle = request.query_params.get("vehicle", "").strip()
        pricing_data = ChatbotEngine.get_pricing_data(vehicle_query=vehicle)
        return Response({"pricing": pricing_data}, status=status.HTTP_200_OK)


class ChatOffersAPIView(views.APIView):
    """
    GET /api/chatbot/offers/
    Returns strictly active, non-expired promotions and discounts.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        now = timezone.now()
        # Strictly exclude expired coupons
        active_offers = ChatOffer.objects.filter(
            is_active=True,
            valid_from__lte=now,
            valid_until__gte=now
        ).order_by("-discount_value")
        serializer = ChatOfferSerializer(active_offers, many=True)
        return Response({"offers": serializer.data}, status=status.HTTP_200_OK)


class ChatFAQsAPIView(views.APIView):
    """
    GET /api/chatbot/faqs/
    Returns verified FAQs categorized for customer self-service.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        category = request.query_params.get("category", "").strip()
        faqs = ChatFAQ.objects.filter(is_active=True)
        if category:
            faqs = faqs.filter(category__iexact=category)
        serializer = ChatFAQSerializer(faqs, many=True)
        return Response({"faqs": serializer.data}, status=status.HTTP_200_OK)


class ChatServiceAreaCheckAPIView(views.APIView):
    """
    POST /api/chatbot/check-service-area/
    Validates if customer address/pincode is eligible for doorstep wash.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        location_query = request.data.get("location", "").strip() or request.data.get("pincode", "").strip()
        if not location_query:
            return Response(
                {"error": "Please provide a location, sector, or pincode to check."},
                status=status.HTTP_400_BAD_REQUEST
            )

        res = ChatbotEngine.check_location(location_query)
        return Response(res, status=status.HTTP_200_OK)


class ChatHistoryAPIView(views.APIView):
    """
    GET /api/chatbot/history/?session_id=...
    Retrieves message history for the active session.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        session_id = request.query_params.get("session_id", "").strip()
        if not session_id:
            return Response(
                {"error": "session_id parameter is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        session = ChatSession.objects.filter(session_id=session_id).first()
        if not session:
            return Response({"session_id": session_id, "messages": []}, status=status.HTTP_200_OK)

        messages = session.messages.all().order_by("created_at")
        serializer = ChatMessageSerializer(messages, many=True)
        return Response({
            "session_id": session.session_id,
            "messages": serializer.data
        }, status=status.HTTP_200_OK)
