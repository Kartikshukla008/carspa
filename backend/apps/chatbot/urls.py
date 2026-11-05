from django.urls import path
from apps.chatbot.views import (
    ChatMessageAPIView,
    ChatServicesAPIView,
    ChatPricingAPIView,
    ChatOffersAPIView,
    ChatFAQsAPIView,
    ChatServiceAreaCheckAPIView,
    ChatSessionHistoryAPIView,
    ChatProfileAPIView,
    ChatSlotsAPIView,
    ChatVerifyPaymentAPIView,
    AdminChatbotAnalyticsAPIView,
    AdminChatbotConversationsAPIView,
    AdminChatbotSessionDetailAPIView,
)

urlpatterns = [
    path("message/", ChatMessageAPIView.as_view(), name="chat_message"),
    path("services/", ChatServicesAPIView.as_view(), name="chat_services"),
    path("pricing/", ChatPricingAPIView.as_view(), name="chat_pricing"),
    path("offers/", ChatOffersAPIView.as_view(), name="chat_offers"),
    path("faqs/", ChatFAQsAPIView.as_view(), name="chat_faqs"),
    path("check-service-area/", ChatServiceAreaCheckAPIView.as_view(), name="chat_check_area"),
    path("history/", ChatSessionHistoryAPIView.as_view(), name="chat_history"),
    path("profile/", ChatProfileAPIView.as_view(), name="chat_profile"),
    path("slots/", ChatSlotsAPIView.as_view(), name="chat_slots"),
    path("verify-payment/", ChatVerifyPaymentAPIView.as_view(), name="chat_verify_payment"),
    path("admin/analytics/", AdminChatbotAnalyticsAPIView.as_view(), name="admin_chat_analytics"),
    path("admin/conversations/", AdminChatbotConversationsAPIView.as_view(), name="admin_chat_conversations"),
    path("admin/conversations/<str:session_id>/", AdminChatbotSessionDetailAPIView.as_view(), name="admin_chat_conversation_detail"),
]
