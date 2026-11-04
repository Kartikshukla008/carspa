from rest_framework import serializers
from apps.chatbot.models import ChatSession, ChatMessage, ChatOffer, ChatFAQ


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "sender",
            "message",
            "intent",
            "quick_replies",
            "action_type",
            "action_payload",
            "created_at",
        ]


class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatSession
        fields = [
            "id",
            "session_id",
            "user",
            "messages",
            "created_at",
            "updated_at",
        ]


class ChatOfferSerializer(serializers.ModelSerializer):
    valid_until_formatted = serializers.SerializerMethodField()

    class Meta:
        model = ChatOffer
        fields = [
            "id",
            "code",
            "title",
            "description",
            "discount_type",
            "discount_value",
            "min_order_amount",
            "valid_from",
            "valid_until",
            "valid_until_formatted",
            "is_active",
        ]

    def get_valid_until_formatted(self, obj):
        return obj.valid_until.strftime("%d %b %Y")


class ChatFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatFAQ
        fields = [
            "id",
            "question",
            "answer",
            "category",
            "keywords",
            "sort_order",
        ]
