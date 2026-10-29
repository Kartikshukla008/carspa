from rest_framework import serializers
from apps.payments.models import Payment

class RazorpayConfigSerializer(serializers.Serializer):
    enabled = serializers.BooleanField()
    key_id = serializers.CharField()
    currency = serializers.CharField(default="INR")

class RazorpayCreateOrderSerializer(serializers.Serializer):
    booking_reference = serializers.CharField(max_length=50)

class RazorpayVerifySerializer(serializers.Serializer):
    booking_reference = serializers.CharField(max_length=50)
    razorpay_order_id = serializers.CharField(max_length=100)
    razorpay_payment_id = serializers.CharField(max_length=100)
    razorpay_signature = serializers.CharField(max_length=255)

class RazorpayFailedSerializer(serializers.Serializer):
    booking_reference = serializers.CharField(max_length=50)
    razorpay_order_id = serializers.CharField(max_length=100)
    error_code = serializers.CharField(required=False, allow_blank=True, default="")
    error_description = serializers.CharField(required=False, allow_blank=True, default="")
    error_metadata = serializers.DictField(required=False, default=dict)

class PaymentModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "provider",
            "amount",
            "currency",
            "order_id",
            "payment_id",
            "status",
            "created_at",
            "updated_at",
        ]
