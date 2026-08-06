"""Rate limiting middleware for FastAPI"""

from time import time
from typing import Dict, Tuple
from collections import defaultdict
import asyncio

class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self):
        self.requests: Dict[str, list] = defaultdict(list)
        self.lock = asyncio.Lock()
    
    async def is_allowed(self, key: str, max_requests: int = 100, window_seconds: int = 60) -> bool:
        """Check if request is allowed under rate limit"""
        async with self.lock:
            now = time()
            
            # Clean old requests outside the window
            self.requests[key] = [
                req_time for req_time in self.requests[key]
                if now - req_time < window_seconds
            ]
            
            # Check if under limit
            if len(self.requests[key]) >= max_requests:
                return False
            
            # Add current request
            self.requests[key].append(now)
            return True

# Global rate limiter instance
rate_limiter = RateLimiter()

# Rate limit configs
LIMITS = {
    'auth': (5, 60),  # 5 requests per 60 seconds
    'login': (5, 60),  # 5 login attempts per 60 seconds
    'register': (3, 3600),  # 3 registrations per hour
    'api': (100, 60),  # 100 requests per 60 seconds
    'policy_eval': (50, 60),  # 50 policy evals per 60 seconds
}

async def check_rate_limit(key: str, limit_type: str = 'api') -> bool:
    """Check if request is within rate limits"""
    max_requests, window = LIMITS.get(limit_type, (100, 60))
    return await rate_limiter.is_allowed(key, max_requests, window)
