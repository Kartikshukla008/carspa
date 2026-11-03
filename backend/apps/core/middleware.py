import logging
from django.http import JsonResponse
from apps.core.ratelimit import RateLimiter, get_client_ip

logger = logging.getLogger(__name__)

class RateLimitMiddleware:
    """
    Enterprise rate limiting middleware protecting critical authentication,
    booking creation, and notification dispatch endpoints.
    """

    # Map of path prefix -> (limit, window_seconds, namespace)
    RATE_LIMIT_RULES = [
        # Customer & Admin Login: 5 attempts / 60s
        ("/api/auth/login/", 5, 60, "login"),
        ("/api/admin/login/", 5, 60, "admin_login"),

        # Registration: 5 attempts / 60s
        ("/api/auth/register/", 5, 60, "register"),

        # Password Reset / OTP / SMS dispatch: 3 requests / 300s (5 mins)
        ("/api/auth/password-reset/", 3, 300, "pwd_reset"),

        # Public Booking Creation: 10 bookings / 60s
        ("/api/bookings/", 10, 60, "booking_create"),

        # Lead capture: 10 / 60s
        ("/api/leads/", 10, 60, "lead_create"),
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path

        # Only rate-limit write / mutating operations (POST, PUT, PATCH, DELETE)
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            for prefix, limit, window_seconds, namespace in self.RATE_LIMIT_RULES:
                if path.startswith(prefix):
                    ip = get_client_ip(request)
                    key = f"{namespace}:{ip}"

                    allowed, remaining, retry_after = RateLimiter.is_allowed(
                        key=key,
                        limit=limit,
                        window_seconds=window_seconds,
                    )

                    if not allowed:
                        logger.warning(
                            "Rate limit exceeded on %s for IP %s. Retry after %ss.",
                            path, ip, retry_after
                        )
                        response = JsonResponse({
                            "error": "Rate limit exceeded",
                            "detail": f"Too many requests. Please wait {retry_after} seconds before trying again.",
                            "retry_after": retry_after,
                        }, status=429)
                        response["Retry-After"] = str(retry_after)
                        response["X-RateLimit-Limit"] = str(limit)
                        response["X-RateLimit-Remaining"] = "0"
                        return response

                    # If allowed, proceed and append headers to response
                    response = self.get_response(request)
                    response["X-RateLimit-Limit"] = str(limit)
                    response["X-RateLimit-Remaining"] = str(remaining)
                    return response

        return self.get_response(request)
