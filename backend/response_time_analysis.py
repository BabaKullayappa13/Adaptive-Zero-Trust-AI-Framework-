import asyncio
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import statistics
import psycopg
from psycopg import AsyncConnection

class ResponseTimeAnalysis:
    """Comprehensive response time tracking and analysis"""
    
    # 12 operation types for tracking
    OPERATION_TYPES = {
        'auth_login': 'User authentication login',
        'auth_totp': 'TOTP MFA verification',
        'auth_logout': 'User logout',
        'policy_evaluation': 'Zero trust policy evaluation',
        'risk_assessment': 'Risk assessment calculation',
        'device_fingerprint': 'Device fingerprinting',
        'db_query': 'Database query execution',
        'ml_prediction': 'ML model prediction',
        'report_generation': 'Report generation',
        'data_sync': 'Data synchronization',
        'api_call': 'API call execution',
        'session_refresh': 'Session token refresh'
    }
    
    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func
    
    async def record_operation_time(self, operation_type: str, duration_ms: float,
                                   user_id: Optional[str] = None,
                                   success: bool = True) -> Dict:
        """Record an operation's response time"""
        if operation_type not in self.OPERATION_TYPES:
            return {"error": f"Unknown operation type: {operation_type}"}
        
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                INSERT INTO performance_metrics
                (metric_type, duration_ms, user_id, status_code, endpoint)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, created_at
            """, (operation_type, duration_ms, user_id, 200 if success else 500, operation_type))
            
            row = await result.fetchone()
            return {
                "metric_id": row[0],
                "operation_type": operation_type,
                "duration_ms": duration_ms,
                "recorded_at": row[1].isoformat()
            }
    
    async def get_operation_statistics(self, operation_type: str,
                                      hours: int = 24) -> Dict:
        """Get statistics for an operation type"""
        async with await self.db_connect() as conn:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            result = await conn.execute("""
                SELECT duration_ms
                FROM performance_metrics
                WHERE metric_type = %s AND created_at >= %s
                ORDER BY duration_ms ASC
            """, (operation_type, cutoff_time))
            
            durations = [row[0] for row in await result.fetchall()]
            
            if not durations:
                return {
                    "operation_type": operation_type,
                    "count": 0,
                    "min_ms": None,
                    "max_ms": None,
                    "avg_ms": None,
                    "median_ms": None,
                    "p95_ms": None,
                    "p99_ms": None,
                    "stddev_ms": None
                }
            
            sorted_durations = sorted(durations)
            count = len(sorted_durations)
            
            # Calculate percentiles
            p95_idx = int(count * 0.95) - 1
            p99_idx = int(count * 0.99) - 1
            
            return {
                "operation_type": operation_type,
                "count": count,
                "min_ms": float(min(sorted_durations)),
                "max_ms": float(max(sorted_durations)),
                "avg_ms": float(statistics.mean(sorted_durations)),
                "median_ms": float(statistics.median(sorted_durations)),
                "p95_ms": float(sorted_durations[max(0, p95_idx)]),
                "p99_ms": float(sorted_durations[max(0, p99_idx)]),
                "stddev_ms": float(statistics.stdev(sorted_durations)) if count > 1 else 0
            }
    
    async def get_all_operations_summary(self, hours: int = 24) -> List[Dict]:
        """Get summary for all operation types"""
        summary = []
        for op_type in self.OPERATION_TYPES.keys():
            stats = await self.get_operation_statistics(op_type, hours)
            if stats['count'] > 0:
                stats['description'] = self.OPERATION_TYPES[op_type]
                summary.append(stats)
        
        return sorted(summary, key=lambda x: x['avg_ms'], reverse=True)
    
    async def get_hourly_aggregates(self, operation_type: Optional[str] = None,
                                   days: int = 7) -> List[Dict]:
        """Get hourly aggregated metrics"""
        async with await self.db_connect() as conn:
            cutoff_time = datetime.utcnow() - timedelta(days=days)
            
            if operation_type:
                result = await conn.execute("""
                    SELECT 
                        DATE_TRUNC('hour', created_at) as hour,
                        AVG(duration_ms) as avg_duration,
                        MIN(duration_ms) as min_duration,
                        MAX(duration_ms) as max_duration,
                        COUNT(*) as count
                    FROM performance_metrics
                    WHERE metric_type = %s AND created_at >= %s
                    GROUP BY DATE_TRUNC('hour', created_at)
                    ORDER BY hour DESC
                """, (operation_type, cutoff_time))
            else:
                result = await conn.execute("""
                    SELECT 
                        DATE_TRUNC('hour', created_at) as hour,
                        AVG(duration_ms) as avg_duration,
                        MIN(duration_ms) as min_duration,
                        MAX(duration_ms) as max_duration,
                        COUNT(*) as count
                    FROM performance_metrics
                    WHERE created_at >= %s
                    GROUP BY DATE_TRUNC('hour', created_at)
                    ORDER BY hour DESC
                """, (cutoff_time,))
            
            rows = await result.fetchall()
            return [
                {
                    "hour": row[0].isoformat() if row[0] else None,
                    "avg_duration_ms": float(row[1]) if row[1] else 0,
                    "min_duration_ms": float(row[2]) if row[2] else 0,
                    "max_duration_ms": float(row[3]) if row[3] else 0,
                    "request_count": row[4]
                }
                for row in rows
            ]
    
    async def get_daily_aggregates(self, operation_type: Optional[str] = None,
                                  days: int = 30) -> List[Dict]:
        """Get daily aggregated metrics"""
        async with await self.db_connect() as conn:
            cutoff_time = datetime.utcnow() - timedelta(days=days)
            
            if operation_type:
                result = await conn.execute("""
                    SELECT 
                        DATE_TRUNC('day', created_at) as day,
                        AVG(duration_ms) as avg_duration,
                        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration,
                        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99_duration,
                        COUNT(*) as count
                    FROM performance_metrics
                    WHERE metric_type = %s AND created_at >= %s
                    GROUP BY DATE_TRUNC('day', created_at)
                    ORDER BY day DESC
                """, (operation_type, cutoff_time))
            else:
                result = await conn.execute("""
                    SELECT 
                        DATE_TRUNC('day', created_at) as day,
                        AVG(duration_ms) as avg_duration,
                        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration,
                        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99_duration,
                        COUNT(*) as count
                    FROM performance_metrics
                    WHERE created_at >= %s
                    GROUP BY DATE_TRUNC('day', created_at)
                    ORDER BY day DESC
                """, (cutoff_time,))
            
            rows = await result.fetchall()
            return [
                {
                    "day": row[0].isoformat() if row[0] else None,
                    "avg_duration_ms": float(row[1]) if row[1] else 0,
                    "p95_duration_ms": float(row[2]) if row[2] else 0,
                    "p99_duration_ms": float(row[3]) if row[3] else 0,
                    "request_count": row[4]
                }
                for row in rows
            ]
    
    async def get_weekly_aggregates(self, days: int = 90) -> List[Dict]:
        """Get weekly aggregated metrics"""
        async with await self.db_connect() as conn:
            cutoff_time = datetime.utcnow() - timedelta(days=days)
            
            result = await conn.execute("""
                SELECT 
                    DATE_TRUNC('week', created_at) as week,
                    AVG(duration_ms) as avg_duration,
                    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration,
                    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99_duration,
                    COUNT(*) as count
                FROM performance_metrics
                WHERE created_at >= %s
                GROUP BY DATE_TRUNC('week', created_at)
                ORDER BY week DESC
            """, (cutoff_time,))
            
            rows = await result.fetchall()
            return [
                {
                    "week_start": row[0].isoformat() if row[0] else None,
                    "avg_duration_ms": float(row[1]) if row[1] else 0,
                    "p95_duration_ms": float(row[2]) if row[2] else 0,
                    "p99_duration_ms": float(row[3]) if row[3] else 0,
                    "request_count": row[4]
                }
                for row in rows
            ]
    
    async def get_slowest_operations(self, limit: int = 20) -> List[Dict]:
        """Get slowest operations recorded"""
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                SELECT id, metric_type, duration_ms, endpoint, created_at
                FROM performance_metrics
                ORDER BY duration_ms DESC
                LIMIT %s
            """, (limit,))
            
            rows = await result.fetchall()
            return [
                {
                    "metric_id": row[0],
                    "operation_type": row[1],
                    "duration_ms": float(row[2]),
                    "endpoint": row[3],
                    "recorded_at": row[4].isoformat()
                }
                for row in rows
            ]
    
    async def get_performance_trend(self, operation_type: str,
                                   hours: int = 48) -> List[Dict]:
        """Get performance trend over time"""
        async with await self.db_connect() as conn:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            result = await conn.execute("""
                SELECT 
                    DATE_TRUNC('30 minutes', created_at) as time_bucket,
                    AVG(duration_ms) as avg_duration,
                    MIN(duration_ms) as min_duration,
                    MAX(duration_ms) as max_duration
                FROM performance_metrics
                WHERE metric_type = %s AND created_at >= %s
                GROUP BY DATE_TRUNC('30 minutes', created_at)
                ORDER BY time_bucket ASC
            """, (operation_type, cutoff_time))
            
            rows = await result.fetchall()
            return [
                {
                    "timestamp": row[0].isoformat() if row[0] else None,
                    "avg_ms": float(row[1]) if row[1] else 0,
                    "min_ms": float(row[2]) if row[2] else 0,
                    "max_ms": float(row[3]) if row[3] else 0
                }
                for row in rows
            ]
    
    async def get_operation_details(self, operation_type: str,
                                   limit: int = 100) -> List[Dict]:
        """Get individual operation records"""
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                SELECT id, metric_type, duration_ms, user_id, endpoint, status_code, created_at
                FROM performance_metrics
                WHERE metric_type = %s
                ORDER BY created_at DESC
                LIMIT %s
            """, (operation_type, limit))
            
            rows = await result.fetchall()
            return [
                {
                    "metric_id": row[0],
                    "operation_type": row[1],
                    "duration_ms": float(row[2]),
                    "user_id": row[3],
                    "endpoint": row[4],
                    "status_code": row[5],
                    "recorded_at": row[6].isoformat()
                }
                for row in rows
            ]
