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
from apps.chatbot.tools import get_customer_profile, get_available_slots
from apps.payments.service import PaymentService


class ChatMessageAPIView(views.APIView):
    """
    POST /api/chatbot/message/
    Processes customer natural-language query and returns database-grounded reply.
    Supports authenticated users and guest sessions.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user_message = request.data.get("message", "").strip()
        session_id = request.data.get("session_id", "").strip() or str(uuid.uuid4())
        action = request.data.get("action")
        payment_data = request.data.get("payment_data")

        if not user_message and not action:
            return Response(
                {"error": "Please provide a message or action."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = getattr(request, "user", None)
        if user and not user.is_authenticated:
            user = None

        result = ChatbotEngine.process_message(
            session_id=session_id,
            user_text=user_message or str(action),
            user=user,
            action=action,
            payment_data=payment_data,
        )

        return Response(result, status=status.HTTP_200_OK)


class ChatProfileAPIView(views.APIView):
    """
    GET /api/chatbot/profile/
    Returns authenticated user's profile, saved vehicles, saved addresses, and recent bookings.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user = getattr(request, "user", None)
        profile_data = get_customer_profile(user)
        return Response(profile_data, status=status.HTTP_200_OK)


class ChatSlotsAPIView(views.APIView):
    """
    GET /api/chatbot/slots/?date=YYYY-MM-DD&service_id=1&vehicle_id=2&area_id=3
    Returns available time slots for booking.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        date_str = request.query_params.get("date")
        service_id = request.query_params.get("service_id")
        vehicle_id = request.query_params.get("vehicle_id")
        area_id = request.query_params.get("area_id")

        if not date_str or not service_id:
            return Response(
                {"error": "date and service_id query parameters are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        slots_data = get_available_slots(
            target_date=date_str,
            service_package_id=int(service_id),
            vehicle_type_id=int(vehicle_id) if vehicle_id else None,
            service_area_id=int(area_id) if area_id else None,
        )
        return Response(slots_data, status=status.HTTP_200_OK)


class ChatVerifyPaymentAPIView(views.APIView):
    """
    POST /api/chatbot/verify-payment/
    Verifies Razorpay payment signature server-side and marks booking as PAID.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        order_id = request.data.get("razorpay_order_id")
        payment_id = request.data.get("razorpay_payment_id")
        signature = request.data.get("razorpay_signature")
        session_id = request.data.get("session_id", "").strip() or str(uuid.uuid4())

        if not order_id or not payment_id or not signature:
            return Response(
                {"error": "Missing razorpay_order_id, razorpay_payment_id, or razorpay_signature."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = getattr(request, "user", None)
        if user and not user.is_authenticated:
            user = None

        result = ChatbotEngine._handle_payment_success(
            session=ChatbotEngine.get_or_create_session(session_id, user),
            payment_data=request.data,
            user=user,
        )
        return Response(result, status=status.HTTP_200_OK)


class ChatServicesAPIView(views.APIView):
    """
    GET /api/chatbot/services/
    Returns active detailing packages with descriptions and features.
    """
    permission_classes = [permissions.AllowAny]

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

    def get(self, request):
        pricing = ChatbotEngine.get_pricing_data()
        return Response({"pricing": pricing}, status=status.HTTP_200_OK)


class ChatOffersAPIView(views.APIView):
    """
    GET /api/chatbot/offers/
    Returns currently active, unexpired promo codes and discount offers.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        offers = ChatbotEngine.get_active_offers_data()
        return Response({"offers": offers}, status=status.HTTP_200_OK)


class ChatFAQsAPIView(views.APIView):
    """
    GET /api/chatbot/faqs/
    Returns curated CARSPA business FAQs and doorstep detailing policies.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        faqs = ChatFAQ.objects.filter(is_active=True)
        serializer = ChatFAQSerializer(faqs, many=True)
        return Response({"faqs": serializer.data}, status=status.HTTP_200_OK)


class ChatServiceAreaCheckAPIView(views.APIView):
    """
    POST /api/chatbot/check-service-area/
    Validates whether a given pincode or area name is eligible for doorstep detailing.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        query = request.data.get("query", "").strip()
        if not query:
            return Response(
                {"error": "Please provide a pincode or locality name."},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = ChatbotEngine.check_location(query)
        return Response(result, status=status.HTTP_200_OK)


class ChatSessionHistoryAPIView(views.APIView):
    """
    GET /api/chatbot/history/?session_id=<session_id>
    Fetches prior conversation history for a given session.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        session_id = request.query_params.get("session_id", "").strip()
        if not session_id:
            return Response(
                {"error": "session_id parameter is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            session = ChatSession.objects.get(session_id=session_id)
        except ChatSession.DoesNotExist:
            return Response({"messages": []}, status=status.HTTP_200_OK)

        messages = session.messages.all().order_by("created_at")
        serializer = ChatMessageSerializer(messages, many=True)
        return Response({"messages": serializer.data}, status=status.HTTP_200_OK)
