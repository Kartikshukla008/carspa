from django.urls import path
from apps.chatbot.views import (
    ChatMessageAPIView,
    ChatServicesAPIView,
    ChatPricingAPIView,
    ChatOffersAPIView,
    ChatFAQsAPIView,
    ChatServiceAreaCheckAPIView,
    ChatHistoryAPIView,
)

urlpatterns = [
    path("message/", ChatMessageAPIView.as_view(), name="chat_message"),
    path("services/", ChatServicesAPIView.as_view(), name="chat_services"),
    path("pricing/", ChatPricingAPIView.as_view(), name="chat_pricing"),
    path("offers/", ChatOffersAPIView.as_view(), name="chat_offers"),
    path("faqs/", ChatFAQsAPIView.as_view(), name="chat_faqs"),
    path("check-service-area/", ChatServiceAreaCheckAPIView.as_view(), name="chat_check_area"),
    path("history/", ChatHistoryAPIView.as_view(), name="chat_history"),
]
