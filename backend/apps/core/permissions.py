from rest_framework import permissions

def get_user_role(user):
    if not user or not user.is_authenticated:
        return "ANONYMOUS"
    if user.is_superuser:
        return "SUPER_ADMIN"
    profile = getattr(user, "profile", None)
    if profile and profile.role:
        return profile.role
    if user.is_staff:
        return "ADMIN"
    return "CUSTOMER"


class IsSuperAdmin(permissions.BasePermission):
    """
    Allows access only to Super Admins.
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_superuser or get_user_role(request.user) == "SUPER_ADMIN")
        )


class IsAdminOrManager(permissions.BasePermission):
    """
    Allows access to Super Admin, Admin, and Manager roles.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = get_user_role(request.user)
        return role in ["SUPER_ADMIN", "ADMIN", "MANAGER"] or request.user.is_staff


class IsAdminStaffOrAbove(permissions.BasePermission):
    """
    Allows access to Super Admin, Admin, Manager, and Staff/Service Executives.
    Strictly denies customers and guests.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = get_user_role(request.user)
        return role in ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"] or request.user.is_staff


class CanManageBookingsPermission(permissions.BasePermission):
    """
    Super Admin, Admin, and Manager can perform all actions.
    Staff can view bookings, reschedule, and update status.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = get_user_role(request.user)
        return role in ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"] or request.user.is_staff


class CanManageTeamPermission(permissions.BasePermission):
    """
    Only Super Admin can manage admin accounts and roles.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.is_superuser or get_user_role(request.user) == "SUPER_ADMIN"
