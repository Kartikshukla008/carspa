from rest_framework.authentication import SessionAuthentication

class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    SessionAuthentication that exempts CSRF validation for REST API calls
    while preserving Django session-based authentication and user verification.
    """
    def enforce_csrf(self, request):
        return
