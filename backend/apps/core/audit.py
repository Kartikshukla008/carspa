import logging
from django.db import models
from django.forms.models import model_to_dict
from apps.core.models import AdminAuditLog

logger = logging.getLogger(__name__)

IGNORED_DIFF_FIELDS = {
    "created_at",
    "updated_at",
    "password",
    "last_login",
    "otp_hash",
}


def serialize_value_for_diff(val):
    if val is None:
        return None
    if isinstance(val, (int, float, bool, str)):
        return val
    if hasattr(val, "isoformat"):
        return val.isoformat()
    return str(val)


def compute_model_diff(before: dict, after: dict, ignored_fields: set = None) -> dict:
    """
    Computes a cryptographic/structural diff between two model state dictionaries.
    Returns:
        {
            "has_changes": bool,
            "changed_fields": ["status", "assigned_staff"],
            "changes": {
                "status": {"old": "PENDING", "new": "CONFIRMED"},
                ...
            }
        }
    """
    ignored = IGNORED_DIFF_FIELDS.union(ignored_fields or set())
    changes = {}
    changed_fields = []

    all_keys = set(before.keys()).union(set(after.keys()))

    for key in all_keys:
        if key in ignored:
            continue
        old_val = serialize_value_for_diff(before.get(key))
        new_val = serialize_value_for_diff(after.get(key))

        if old_val != new_val:
            changed_fields.append(key)
            changes[key] = {
                "old": old_val,
                "new": new_val,
            }

    return {
        "has_changes": len(changed_fields) > 0,
        "changed_fields": changed_fields,
        "changes": changes,
    }


def record_audit_log(
    user=None,
    action: str = "UPDATE",
    resource_type: str = "",
    resource_id: str = "",
    details: dict = None,
    before: dict = None,
    after: dict = None,
    diff: dict = None,
    ip_address: str = None,
):
    """
    Centrally logs administrative actions and model mutations with audit diffs.
    """
    computed_diff = diff or {}
    if before is not None and after is not None and not computed_diff:
        computed_diff = compute_model_diff(before, after)

    log_details = details or {}
    if computed_diff and "diff" not in log_details:
        log_details["diff"] = computed_diff

    try:
        return AdminAuditLog.objects.create(
            user=user if user and getattr(user, "is_authenticated", False) else None,
            action=action.upper(),
            resource_type=resource_type,
            resource_id=str(resource_id),
            details=log_details,
            diff=computed_diff,
            ip_address=ip_address,
        )
    except Exception as e:
        logger.error("Failed to record AdminAuditLog: %s", e)
        return None
