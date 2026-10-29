from django.urls import path
from apps.payments.views import (
    RazorpayConfigAPIView,
    RazorpayCreateOrderAPIView,
    RazorpayVerifyPaymentAPIView,
    RazorpayPaymentFailedAPIView,
    RazorpayWebhookAPIView,
)

app_name = "payments"

urlpatterns = [
    path("config/", RazorpayConfigAPIView.as_view(), name="razorpay-config"),
    path("create-order/", RazorpayCreateOrderAPIView.as_view(), name="razorpay-create-order"),
    path("verify/", RazorpayVerifyPaymentAPIView.as_view(), name="razorpay-verify"),
    path("failed/", RazorpayPaymentFailedAPIView.as_view(), name="razorpay-failed"),
    path("webhook/", RazorpayWebhookAPIView.as_view(), name="razorpay-webhook"),
]
