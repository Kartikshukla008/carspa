import time
import logging
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Optional direct Redis connection for high-throughput atomic operations
_redis_client = None

def get_redis_client():
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    redis_url = getattr(settings, "REDIS_URL", None)
    if redis_url:
        try:
            import redis
            _redis_client = redis.Redis.from_url(redis_url, decode_responses=True, socket_timeout=2)
            _redis_client.ping()
            return _redis_client
        except Exception as e:
            logger.warning("Redis direct connection failed for rate limiting, falling back to cache: %s", e)
            _redis_client = False
            return None
    return None


def get_client_ip(request) -> str:
    """
    Extracts client IP address respecting X-Forwarded-For headers from reverse proxies (Render, Vercel, Cloudflare).
    """
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
        if ip:
            return ip
    return request.META.get("REMOTE_ADDR", "127.0.0.1")


class RateLimiter:
    """
    Enterprise Redis-backed Sliding Window Rate Limiter with graceful Django Cache fallback.
    Protects high-risk endpoints (Auth, OTP, SMS, Payments, Bookings) from brute force & DDoS.
    """

    @classmethod
    def is_allowed(cls, key: str, limit: int, window_seconds: int) -> tuple[bool, int, int]:
        """
        Evaluates whether a request with the given key is permitted under limit/window.
        Returns:
            (allowed: bool, remaining_tokens: int, retry_after_seconds: int)
        """
        redis_conn = get_redis_client()
        now = time.time()
        namespaced_key = f"ratelimit:{key}"

        if redis_conn:
            try:
                pipeline = redis_conn.pipeline()
                window_start = now - window_seconds

                # 1. Purge expired entries older than the sliding window
                pipeline.zremrangebyscore(namespaced_key, "-inf", window_start)
                # 2. Count active entries in current window
                pipeline.zcard(namespaced_key)
                # 3. Fetch oldest active item score to calculate accurate Retry-After
                pipeline.zrange(namespaced_key, 0, 0, withscores=True)
                
                _, current_count, oldest_items = pipeline.execute()

                if current_count < limit:
                    # Allowed: append new hit with current timestamp score
                    pipeline = redis_conn.pipeline()
                    pipeline.zadd(namespaced_key, {f"{now}": now})
                    pipeline.expire(namespaced_key, window_seconds + 5)
                    pipeline.execute()
                    remaining = max(0, limit - current_count - 1)
                    return True, remaining, 0
                else:
                    # Blocked: calculate retry_after from oldest timestamp in window
                    oldest_ts = oldest_items[0][1] if oldest_items else window_start
                    retry_after = max(1, int(oldest_ts + window_seconds - now))
                    return False, 0, retry_after
            except Exception as e:
                logger.warning("Redis rate limiter query failed, falling back to cache: %s", e)

        # Fallback using Django Cache backend (LocMem or default cache)
        cache_key = f"rl_fb:{key}"
        timestamps = cache.get(cache_key) or []
        window_start = now - window_seconds
        valid_timestamps = [ts for ts in timestamps if ts > window_start]

        if len(valid_timestamps) < limit:
            valid_timestamps.append(now)
            cache.set(cache_key, valid_timestamps, timeout=window_seconds + 5)
            remaining = max(0, limit - len(valid_timestamps))
            return True, remaining, 0
        else:
            oldest_ts = valid_timestamps[0] if valid_timestamps else window_start
            retry_after = max(1, int(oldest_ts + window_seconds - now))
            return False, 0, retry_after
