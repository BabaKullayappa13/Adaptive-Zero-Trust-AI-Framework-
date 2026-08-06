"""Performance tracking and metrics collection."""

import time
import functools
from typing import Optional, Callable, Any
from datetime import datetime, timedelta
import statistics
from aiopg import AsyncConnection


class PerformanceTracker:
    """Tracks and records performance metrics."""

    def __init__(self, conn_provider: Callable):
        self.conn_provider = conn_provider

    async def record_metric(
        self,
        metric_type: str,
        duration_ms: float,
        user_id: Optional[str] = None,
        endpoint: Optional[str] = None,
        status_code: Optional[int] = None,
    ) -> None:
        """Record a performance metric."""
        try:
            conn = await self.conn_provider()
            query = """
                INSERT INTO performance_metrics 
                (user_id, metric_type, endpoint, duration_ms, status_code)
                VALUES (%s, %s, %s, %s, %s)
            """
            await conn.execute(
                query,
                (user_id, metric_type, endpoint, duration_ms, status_code),
            )
            await conn.commit()
        except Exception as e:
            print(f"[v0] Failed to record metric: {e}")

    async def record_auth_event(
        self,
        event_type: str,
        success: bool,
        user_id: Optional[str] = None,
        duration_ms: Optional[float] = None,
        mfa_enabled: bool = False,
        ip_address: Optional[str] = None,
    ) -> None:
        """Record an authentication event."""
        try:
            conn = await self.conn_provider()
            query = """
                INSERT INTO authentication_events 
                (user_id, event_type, success, duration_ms, mfa_enabled, ip_address)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            await conn.execute(
                query,
                (user_id, event_type, success, duration_ms, mfa_enabled, ip_address),
            )
            await conn.commit()
        except Exception as e:
            print(f"[v0] Failed to record auth event: {e}")

    async def get_metrics_summary(
        self, hours: int = 24, metric_type: Optional[str] = None
    ) -> dict:
        """Get performance metrics summary."""
        try:
            conn = await self.conn_provider()
            start_time = datetime.utcnow() - timedelta(hours=hours)

            if metric_type:
                query = """
                    SELECT metric_type, duration_ms FROM performance_metrics
                    WHERE created_at >= %s AND metric_type = %s
                    ORDER BY created_at DESC
                """
                result = await conn.execute(query, (start_time, metric_type))
            else:
                query = """
                    SELECT metric_type, duration_ms FROM performance_metrics
                    WHERE created_at >= %s
                    ORDER BY created_at DESC
                """
                result = await conn.execute(query, (start_time,))

            rows = await result.fetchall()
            metrics_by_type = {}

            for row in rows:
                mtype, duration = row
                if mtype not in metrics_by_type:
                    metrics_by_type[mtype] = []
                metrics_by_type[mtype].append(duration)

            summary = {}
            for mtype, durations in metrics_by_type.items():
                if durations:
                    sorted_durations = sorted(durations)
                    summary[mtype] = {
                        "min": min(durations),
                        "max": max(durations),
                        "avg": statistics.mean(durations),
                        "p95": sorted_durations[int(len(durations) * 0.95)]
                        if len(durations) > 0
                        else 0,
                        "p99": sorted_durations[int(len(durations) * 0.99)]
                        if len(durations) > 0
                        else 0,
                        "count": len(durations),
                    }

            return summary
        except Exception as e:
            print(f"[v0] Failed to get metrics summary: {e}")
            return {}

    async def get_auth_stats(self, hours: int = 24) -> dict:
        """Get authentication statistics."""
        try:
            conn = await self.conn_provider()
            start_time = datetime.utcnow() - timedelta(hours=hours)

            query = """
                SELECT 
                    event_type,
                    COUNT(*) as total,
                    SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
                    SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as fail_count,
                    AVG(duration_ms) as avg_duration
                FROM authentication_events
                WHERE created_at >= %s
                GROUP BY event_type
            """
            result = await conn.execute(query, (start_time,))
            rows = await result.fetchall()

            stats = {}
            for row in rows:
                event_type, total, success_count, fail_count, avg_dur = row
                stats[event_type] = {
                    "total": total,
                    "success": success_count or 0,
                    "failed": fail_count or 0,
                    "success_rate": (success_count / total * 100) if total > 0 else 0,
                    "avg_duration_ms": float(avg_dur) if avg_dur else 0,
                }

            return stats
        except Exception as e:
            print(f"[v0] Failed to get auth stats: {e}")
            return {}

    async def get_timeseries_data(
        self, metric_type: str, hours: int = 24, interval_minutes: int = 60
    ) -> list:
        """Get timeseries data for a metric."""
        try:
            conn = await self.conn_provider()
            start_time = datetime.utcnow() - timedelta(hours=hours)

            query = """
                SELECT 
                    DATE_TRUNC('minute', created_at) as bucket,
                    COUNT(*) as count,
                    AVG(duration_ms) as avg_duration,
                    MIN(duration_ms) as min_duration,
                    MAX(duration_ms) as max_duration
                FROM performance_metrics
                WHERE created_at >= %s AND metric_type = %s
                GROUP BY DATE_TRUNC('minute', created_at)
                ORDER BY bucket ASC
            """
            result = await conn.execute(query, (start_time, metric_type))
            rows = await result.fetchall()

            timeseries = []
            for row in rows:
                bucket, count, avg_dur, min_dur, max_dur = row
                timeseries.append(
                    {
                        "timestamp": bucket.isoformat(),
                        "count": count,
                        "avg": float(avg_dur) if avg_dur else 0,
                        "min": float(min_dur) if min_dur else 0,
                        "max": float(max_dur) if max_dur else 0,
                    }
                )

            return timeseries
        except Exception as e:
            print(f"[v0] Failed to get timeseries data: {e}")
            return []


def timing_decorator(tracker: PerformanceTracker, metric_type: str):
    """Decorator to track function execution time."""

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            start = time.time()
            try:
                result = await func(*args, **kwargs)
                duration_ms = (time.time() - start) * 1000
                # Extract user_id if available from kwargs
                user_id = kwargs.get("user_id")
                await tracker.record_metric(
                    metric_type=metric_type,
                    duration_ms=duration_ms,
                    user_id=user_id,
                )
                return result
            except Exception as e:
                duration_ms = (time.time() - start) * 1000
                await tracker.record_metric(
                    metric_type=metric_type,
                    duration_ms=duration_ms,
                    status_code=500,
                )
                raise

        return wrapper

    return decorator
