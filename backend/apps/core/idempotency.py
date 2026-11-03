import hashlib
import json
import datetime
from django.utils import timezone
from django.db import transaction
from apps.core.models import IdempotencyRecord


def compute_payload_hash(data) -> str:
    """
    Computes a deterministic SHA-256 hash of request payload data.
    """
    try:
        if isinstance(data, (dict, list)):
            canonical = json.dumps(data, sort_keys=True, separators=(",", ":"), default=str)
        elif isinstance(data, (bytes, bytearray)):
            canonical = data.decode("utf-8", errors="ignore")
        elif data is None:
            canonical = ""
        else:
            canonical = str(data)
    except Exception:
        canonical = str(data)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class IdempotencyService:
    """
    Enterprise Idempotency Manager for transactional write operations.
    Follows Stripe/IETF draft specifications for idempotency keys.
    """

    DEFAULT_TTL_HOURS = 24

    @classmethod
    def check_or_claim(cls, key: str, request, timeout_hours: int = None):
        """
        Validates or claims an idempotency key.
        Returns a tuple:
        - state: "REPLAYED" | "PROCESSING" | "CLAIMED" | "MISMATCH"
        - record: IdempotencyRecord instance
        - response_data: dict | None
        - status_code: int | None
        """
        if not key or not str(key).strip():
            return "NO_KEY", None, None, None

        key = str(key).strip()
        payload_hash = compute_payload_hash(getattr(request, "data", None) or getattr(request, "POST", None))
        user = request.user if getattr(request, "user", None) and request.user.is_authenticated else None
        ttl_hours = timeout_hours or cls.DEFAULT_TTL_HOURS
        expires_at = timezone.now() + datetime.timedelta(hours=ttl_hours)

        with transaction.atomic():
            # Check existing record
            existing = IdempotencyRecord.objects.select_for_update().filter(idempotency_key=key).first()

            if existing:
                # Check expiration
                if existing.expires_at and existing.expires_at < timezone.now():
                    # Expired record can be recycled
                    existing.delete()
                else:
                    # Payload tamper check: make sure the client didn't reuse the same key for completely different request parameters
                    if existing.payload_hash != payload_hash:
                        return "MISMATCH", existing, {
                            "error": "Idempotency key conflict",
                            "detail": "The provided Idempotency-Key has already been used with different request parameters."
                        }, 422

                    if existing.is_processing:
                        return "PROCESSING", existing, {
                            "error": "Concurrent request in-flight",
                            "detail": "A request with this Idempotency-Key is currently being processed. Please retry in a few moments."
                        }, 409

                    # Return cached replayed response
                    return "REPLAYED", existing, existing.response_data, existing.status_code

            # Claim new key
            record = IdempotencyRecord.objects.create(
                idempotency_key=key,
                user=user,
                request_path=request.path,
                request_method=request.method,
                payload_hash=payload_hash,
                is_processing=True,
                expires_at=expires_at,
            )
            return "CLAIMED", record, None, None

    @classmethod
    def record_completion(cls, key: str, status_code: int, response_data: dict):
        """
        Persists the final response for an idempotency key and marks processing completed.
        """
        if not key:
            return

        try:
            with transaction.atomic():
                record = IdempotencyRecord.objects.select_for_update().filter(idempotency_key=key).first()
                if record:
                    record.status_code = status_code
                    record.response_data = response_data
                    record.is_processing = False
                    record.save(update_fields=["status_code", "response_data", "is_processing"])
        except Exception:
            pass

    @classmethod
    def record_failure(cls, key: str):
        """
        Releases the idempotency key if an unhandled fatal error happens during execution.
        """
        if not key:
            return
        try:
            IdempotencyRecord.objects.filter(idempotency_key=key, is_processing=True).delete()
        except Exception:
            pass
