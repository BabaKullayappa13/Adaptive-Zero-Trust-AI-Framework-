import asyncio
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import json
import psycopg
from psycopg import AsyncConnection

class HybridCloudService:
    """Multi-cloud management with failover and health monitoring"""
    
    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func
    
    async def register_cloud_provider(self, name: str, cloud_type: str, 
                                     provider: str, region: str, endpoint: str,
                                     api_key: str, is_primary: bool = False) -> Dict:
        """Register a cloud provider configuration"""
        async with await self.db_connect() as conn:
            # If marking as primary, unset other primaries
            if is_primary:
                await conn.execute(
                    "UPDATE cloud_configurations SET is_primary = FALSE WHERE cloud_type = %s",
                    (cloud_type,)
                )
            
            result = await conn.execute("""
                INSERT INTO cloud_configurations
                (name, cloud_type, provider, region, endpoint, api_key_encrypted, is_primary, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'active')
                RETURNING id, name, cloud_type, provider, region, created_at
            """, (name, cloud_type, provider, region, endpoint, api_key, is_primary))
            
            row = await result.fetchone()
            return {
                "cloud_id": row[0],
                "name": row[1],
                "cloud_type": row[2],
                "provider": row[3],
                "region": row[4],
                "status": "active",
                "created_at": row[5].isoformat()
            }
    
    async def get_active_clouds(self, cloud_type: Optional[str] = None) -> List[Dict]:
        """Get active cloud configurations"""
        async with await self.db_connect() as conn:
            if cloud_type:
                result = await conn.execute("""
                    SELECT id, name, cloud_type, provider, region, status, is_primary
                    FROM cloud_configurations
                    WHERE status = 'active' AND cloud_type = %s
                    ORDER BY is_primary DESC
                """, (cloud_type,))
            else:
                result = await conn.execute("""
                    SELECT id, name, cloud_type, provider, region, status, is_primary
                    FROM cloud_configurations
                    WHERE status = 'active'
                    ORDER BY cloud_type, is_primary DESC
                """)
            
            rows = await result.fetchall()
            return [
                {
                    "cloud_id": row[0],
                    "name": row[1],
                    "cloud_type": row[2],
                    "provider": row[3],
                    "region": row[4],
                    "status": row[5],
                    "is_primary": row[6]
                }
                for row in rows
            ]
    
    async def record_sync(self, cloud_id: int, sync_type: str, 
                         status: str, records_synced: int, duration_ms: float) -> Dict:
        """Record a synchronization event"""
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                INSERT INTO cloud_sync_logs
                (cloud_id, sync_type, status, records_synced, duration_ms, last_synced_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                RETURNING id, cloud_id, sync_type, status, created_at
            """, (cloud_id, sync_type, status, records_synced, duration_ms))
            
            row = await result.fetchone()
            return {
                "sync_id": row[0],
                "cloud_id": row[1],
                "sync_type": row[2],
                "status": row[3],
                "records_synced": records_synced,
                "duration_ms": duration_ms,
                "created_at": row[4].isoformat()
            }
    
    async def record_health_check(self, cloud_id: int, latency_ms: float,
                                 availability_percent: float, throughput_mbps: float,
                                 error_rate: float) -> Dict:
        """Record cloud health metrics"""
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                INSERT INTO cloud_health_metrics
                (cloud_id, latency_ms, availability_percent, throughput_mbps, error_rate, last_check_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                RETURNING id, cloud_id, latency_ms, availability_percent, created_at
            """, (cloud_id, latency_ms, availability_percent, throughput_mbps, error_rate))
            
            row = await result.fetchone()
            return {
                "metric_id": row[0],
                "cloud_id": row[1],
                "latency_ms": latency_ms,
                "availability_percent": availability_percent,
                "throughput_mbps": throughput_mbps,
                "error_rate": error_rate,
                "recorded_at": row[4].isoformat()
            }
    
    async def get_cloud_health(self, cloud_id: int) -> Dict:
        """Get latest health status for a cloud"""
        async with await self.db_connect() as conn:
            # Get cloud info
            cloud_result = await conn.execute(
                "SELECT name, cloud_type, provider, region, status FROM cloud_configurations WHERE id = %s",
                (cloud_id,)
            )
            cloud_row = await cloud_result.fetchone()
            
            # Get latest health metrics
            health_result = await conn.execute("""
                SELECT latency_ms, availability_percent, throughput_mbps, error_rate, last_check_at
                FROM cloud_health_metrics
                WHERE cloud_id = %s
                ORDER BY last_check_at DESC
                LIMIT 1
            """, (cloud_id,))
            
            health_row = await health_result.fetchone()
            
            # Get recent sync logs
            sync_result = await conn.execute("""
                SELECT sync_type, status, records_synced, duration_ms, last_synced_at
                FROM cloud_sync_logs
                WHERE cloud_id = %s
                ORDER BY last_synced_at DESC
                LIMIT 5
            """, (cloud_id,))
            
            sync_rows = await sync_result.fetchall()
            
            return {
                "cloud_id": cloud_id,
                "name": cloud_row[0],
                "cloud_type": cloud_row[1],
                "provider": cloud_row[2],
                "region": cloud_row[3],
                "status": cloud_row[4],
                "health": {
                    "latency_ms": health_row[0] if health_row else None,
                    "availability_percent": health_row[1] if health_row else None,
                    "throughput_mbps": health_row[2] if health_row else None,
                    "error_rate": health_row[3] if health_row else None,
                    "last_check_at": health_row[4].isoformat() if health_row else None
                },
                "recent_syncs": [
                    {
                        "sync_type": row[0],
                        "status": row[1],
                        "records_synced": row[2],
                        "duration_ms": row[3],
                        "last_synced_at": row[4].isoformat()
                    }
                    for row in sync_rows
                ]
            }
    
    async def get_cloud_topology(self) -> Dict:
        """Get overall cloud topology and status"""
        async with await self.db_connect() as conn:
            clouds = await conn.execute("""
                SELECT id, name, cloud_type, provider, region, status, is_primary
                FROM cloud_configurations
                WHERE status = 'active'
                ORDER BY cloud_type, is_primary DESC
            """)
            
            cloud_rows = await clouds.fetchall()
            
            topology = {
                "public": [],
                "private": [],
                "hybrid": []
            }
            
            for row in cloud_rows:
                cloud_info = {
                    "cloud_id": row[0],
                    "name": row[1],
                    "cloud_type": row[2],
                    "provider": row[3],
                    "region": row[4],
                    "status": row[5],
                    "is_primary": row[6]
                }
                
                if row[2] in topology:
                    topology[row[2]].append(cloud_info)
            
            return {
                "topology": topology,
                "total_clouds": len(cloud_rows),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def simulate_failover(self, cloud_type: str) -> Dict:
        """Simulate failover to backup cloud"""
        async with await self.db_connect() as conn:
            # Get primary cloud
            primary = await conn.execute("""
                SELECT id FROM cloud_configurations
                WHERE cloud_type = %s AND is_primary = TRUE AND status = 'active'
            """, (cloud_type,))
            
            primary_row = await primary.fetchone()
            
            # Get backup cloud
            backup = await conn.execute("""
                SELECT id FROM cloud_configurations
                WHERE cloud_type = %s AND is_primary = FALSE AND status = 'active'
                LIMIT 1
            """, (cloud_type,))
            
            backup_row = await backup.fetchone()
            
            if not primary_row or not backup_row:
                return {"error": "Primary or backup cloud not available"}
            
            # Simulate failover
            await conn.execute(
                "UPDATE cloud_configurations SET is_primary = FALSE WHERE id = %s",
                (primary_row[0],)
            )
            await conn.execute(
                "UPDATE cloud_configurations SET is_primary = TRUE WHERE id = %s",
                (backup_row[0],)
            )
            
            return {
                "failover_type": cloud_type,
                "from_cloud_id": primary_row[0],
                "to_cloud_id": backup_row[0],
                "status": "completed",
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def get_sync_history(self, cloud_id: Optional[int] = None, hours: int = 24) -> List[Dict]:
        """Get synchronization history"""
        async with await self.db_connect() as conn:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            if cloud_id:
                result = await conn.execute("""
                    SELECT cloud_id, sync_type, status, records_synced, duration_ms, last_synced_at
                    FROM cloud_sync_logs
                    WHERE cloud_id = %s AND last_synced_at >= %s
                    ORDER BY last_synced_at DESC
                """, (cloud_id, cutoff_time))
            else:
                result = await conn.execute("""
                    SELECT cloud_id, sync_type, status, records_synced, duration_ms, last_synced_at
                    FROM cloud_sync_logs
                    WHERE last_synced_at >= %s
                    ORDER BY last_synced_at DESC
                """, (cutoff_time,))
            
            rows = await result.fetchall()
            return [
                {
                    "cloud_id": row[0],
                    "sync_type": row[1],
                    "status": row[2],
                    "records_synced": row[3],
                    "duration_ms": row[4],
                    "last_synced_at": row[5].isoformat()
                }
                for row in rows
            ]
