from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from apps.core.models import BusinessConfig
from rest_framework import serializers

class BusinessConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessConfig
        fields = "__all__"

class AdminLoginAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response(
                {"error": "Please provide both username and password."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, username=username, password=password)
        if user is not None:
            if not user.is_staff:
                return Response(
                    {"error": "Access denied. Administrator privileges required."},
                    status=status.HTTP_403_FORBIDDEN
                )
            login(request, user)
            return Response({
                "message": "Login successful.",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "is_superuser": user.is_superuser,
                }
            })
        return Response(
            {"error": "Invalid username or password."},
            status=status.HTTP_401_UNAUTHORIZED
        )

class AdminLogoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({"message": "Logged out successfully."})

class AdminMeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
        })

class AdminBusinessConfigAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        config = BusinessConfig.get_config()
        return Response(BusinessConfigSerializer(config).data)

    def patch(self, request):
        config = BusinessConfig.get_config()
        serializer = BusinessConfigSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
