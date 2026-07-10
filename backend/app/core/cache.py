"""
Lightweight in-memory cache for hot API paths.
For production with multiple instances, replace with Redis (Upstash has a free tier).

Usage:
    from app.core.cache import cache_result
    
    @cache_result(ttl_seconds=300)
    async def get_current_user(...):
        ...
"""

import time
import asyncio
from functools import wraps
from typing import Any, Optional

# In-memory cache store: {key: {'value': Any, 'expires': float}}
_cache: dict[str, dict[str, Any]] = {}
_lock = asyncio.Lock()


def cache_result(ttl_seconds: int = 60):
    """
    Decorator to cache async function results.
    
    Args:
        ttl_seconds: Time-to-live in seconds (default: 60)
    
    Example:
        @cache_result(ttl_seconds=300)
        async def get_user_profile(user_id: str):
            return await db.fetch_user(user_id)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key from function name + arguments
            key_parts = [func.__name__]
            
            # Add positional args (skip non-serializable objects like db sessions)
            for arg in args:
                try:
                    key_parts.append(str(arg))
                except Exception:
                    pass
            
            # Add keyword args (sorted for consistency)
            for k in sorted(kwargs.keys()):
                try:
                    key_parts.append(f"{k}={kwargs[k]}")
                except Exception:
                    pass
            
            cache_key = ":".join(key_parts)
            
            # Check cache
            cached = _cache.get(cache_key)
            if cached and cached['expires'] > time.time():
                return cached['value']
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            
            # Store with TTL
            _cache[cache_key] = {
                'value': result,
                'expires': time.time() + ttl_seconds
            }
            
            return result
        
        return wrapper
    return decorator


def invalidate_cache(pattern: Optional[str] = None) -> int:
    """
    Invalidate cache entries matching a pattern.
    
    Args:
        pattern: If provided, only invalidate keys containing this string.
                 If None, clear ALL cache entries.
    
    Returns:
        Number of entries invalidated
    """
    global _cache
    
    if pattern is None:
        count = len(_cache)
        _cache.clear()
        return count
    
    keys_to_remove = [k for k in _cache if pattern in k]
    for k in keys_to_remove:
        del _cache[k]
    
    return len(keys_to_remove)


def get_cache_stats() -> dict:
    """Get cache statistics for monitoring"""
    now = time.time()
    total = len(_cache)
    expired = sum(1 for v in _cache.values() if v['expires'] <= now)
    active = total - expired
    
    # Clean up expired entries
    global _cache
    _cache = {k: v for k, v in _cache.items() if v['expires'] > now}
    
    return {
        "total_keys": total,
        "active_keys": active,
        "expired_keys": expired,
        "memory_entries": len(_cache),
    }


# Optional: Periodic cache cleanup task
async def start_cache_cleanup_task(interval_seconds: int = 300):
    """Start a background task to periodically clean expired cache entries"""
    while True:
        await asyncio.sleep(interval_seconds)
        now = time.time()
        expired_keys = [k for k, v in _cache.items() if v['expires'] <= now]
        for k in expired_keys:
            del _cache[k]
