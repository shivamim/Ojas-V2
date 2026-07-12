"""
Redis client wrapper for distributed caching.
Falls back to in-memory cache if REDIS_URL is not configured.
"""
import json
import asyncio
from typing import Any, Optional
from functools import wraps

try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

from app.core.config import settings

_redis_client: Optional[redis.Redis] = None
_in_memory_cache: dict[str, dict[str, Any]] = {}
_lock = asyncio.Lock()


def get_redis_client() -> Optional[redis.Redis]:
    """Get Redis client instance, initializing if needed."""
    global _redis_client
    
    if not settings.REDIS_URL:
        return None
    
    if _redis_client is None and REDIS_AVAILABLE:
        try:
            _redis_client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
        except Exception:
            return None
    
    return _redis_client


def cache_result(ttl_seconds: int = 60):
    """
    Decorator to cache async function results.
    Uses Redis if available, falls back to in-memory cache.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            key_parts = [func.__name__]
            
            for arg in args:
                try:
                    key_parts.append(str(arg))
                except Exception:
                    pass
            
            for k in sorted(kwargs.keys()):
                try:
                    key_parts.append(f"{k}={kwargs[k]}")
                except Exception:
                    pass
            
            cache_key = ":".join(key_parts)
            
            # Try Redis first
            client = get_redis_client()
            if client:
                try:
                    cached = await client.get(cache_key)
                    if cached:
                        return json.loads(cached)
                except Exception:
                    pass
            
            # Fall back to in-memory
            async with _lock:
                cached = _in_memory_cache.get(cache_key)
                if cached and cached['expires'] > asyncio.get_event_loop().time():
                    return cached['value']
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Cache result
            if client:
                try:
                    await client.setex(
                        cache_key,
                        ttl_seconds,
                        json.dumps(result)
                    )
                except Exception:
                    pass
            
            async with _lock:
                _in_memory_cache[cache_key] = {
                    'value': result,
                    'expires': asyncio.get_event_loop().time() + ttl_seconds
                }
            
            return result
        
        return wrapper
    return decorator


async def invalidate_cache(pattern: Optional[str] = None) -> int:
    """Invalidate cache entries matching a pattern. Async version."""
    count = 0
    client = get_redis_client()
    
    if client and pattern:
        try:
            keys = await client.keys(f"*{pattern}*")
            if keys:
                count = len(keys)
                await client.delete(*keys)
        except Exception:
            pass
    elif client:
        try:
            keys = await client.keys("*")
            if keys:
                count = len(keys)
                await client.delete(*keys)
        except Exception:
            pass
    
    # Also clear in-memory cache
    global _in_memory_cache
    if pattern is None:
        count += len(_in_memory_cache)
        _in_memory_cache.clear()
    else:
        keys_to_remove = [k for k in _in_memory_cache if pattern in k]
        for k in keys_to_remove:
            del _in_memory_cache[k]
        count += len(keys_to_remove)
    
    return count


async def get_cache_stats() -> dict:
    """Get cache statistics for monitoring"""
    stats = {
        "backend": "redis" if get_redis_client() else "memory",
        "total_keys": 0,
        "active_keys": 0,
        "expired_keys": 0,
    }
    
    client = get_redis_client()
    if client:
        try:
            db_size = await client.dbsize()
            stats["total_keys"] = db_size
            stats["active_keys"] = db_size
        except Exception:
            pass
    
    now = asyncio.get_event_loop().time()
    total = len(_in_memory_cache)
    expired = sum(1 for v in _in_memory_cache.values() if v['expires'] <= now)
    active = total - expired
    
    stats["memory_entries"] = len(_in_memory_cache)
    stats["memory_active"] = active
    stats["memory_expired"] = expired
    
    return stats


async def start_cache_cleanup_task(interval_seconds: int = 300):
    """Start a background task to periodically clean expired cache entries"""
    while True:
        await asyncio.sleep(interval_seconds)
        now = asyncio.get_event_loop().time()
        global _in_memory_cache
        _in_memory_cache = {
            k: v for k, v in _in_memory_cache.items() 
            if v['expires'] > now
        }
