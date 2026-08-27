import asyncio
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import psycopg
from psycopg import AsyncConnection

class ResearchDashboard:
    """Comprehensive research analytics dashboard"""
    
    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func
    
    async def get_authentication_trends(self, days: int = 30) -> Dict:
        """Get authentication trends over time"""
        async with await self.db_connect() as conn:
            cutoff_time = datetime.utcnow() - timedelta(days=days)
            
            result = await conn.execute("""
                SELECT 
                    DATE_TRUNC('day', created_at) as day,
                    COUNT(*) as total_attempts,
                    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_auths,
                    SUM(CASE WHEN mfa_enabled THEN 1 ELSE 0 END) as mfa_enabled_count
                FROM authentication_events
                WHERE created_at >= %s
                GROUP BY DATE_TRUNC('day', created_at)
                ORDER BY day ASC
            """, (cutoff_time,))
            
            rows = await result.fetchall()
            
            return {
                "period_days": days,
                "trends": [
                    {
                        "date": row[0].isoformat() if row[0] else None,
                        "total_attempts": row[1],
                        "successful_auths": row[2],
                        "mfa_enabled": row[3],
                        "success_rate": (row[2] / row[1] * 100) if row[1] > 0 else 0,
                        "mfa_adoption": (row[3] / row[1] * 100) if row[1] > 0 else 0
                    }
                    for row in rows
                ]
            }
    
    async def get_threat_analytics(self, days: int = 30) -> Dict:
        """Get threat detection analytics"""
        async with await self.db_connect() as conn:
            cutoff_time = datetime.utcnow() - timedelta(days=days)
            
            # Get threat counts by type
            result = await conn.execute("""
                SELECT threat_type, severity, COUNT(*) as count,
                       SUM(CASE WHEN mitigated THEN 1 ELSE 0 END) as mitigated_count
                FROM threat_intelligence
                WHERE created_at >= %s
                GROUP BY threat_type, severity
                ORDER BY count DESC
            """, (cutoff_time,))
            
            threats = await result.fetchall()
            
            threat_data = {
                "period_days": days,
                "total_threats": 0,
                "threats_mitigated": 0,
                "by_type": {},
                "by_severity": {}
            }
            
            for threat in threats:
                threat_type, severity, count, mitigated = threat
                threat_data["total_threats"] += count
                threat_data["threats_mitigated"] += mitigated or 0
                
                if threat_type not in threat_data["by_type"]:
                    threat_data["by_type"][threat_type] = 0
                threat_data["by_type"][threat_type] += count
                
                if severity not in threat_data["by_severity"]:
                    threat_data["by_severity"][severity] = 0
                threat_data["by_severity"][severity] += count
            
            return threat_data
    
    async def get_user_behavior_analysis(self, days: int = 30) -> Dict:
        """Get user behavior patterns"""
        async with await self.db_connect() as conn:
            cutoff_time = datetime.utcnow() - timedelta(days=days)
            
            # Get unique users and their activity patterns
            result = await conn.execute("""
                SELECT 
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(*) as total_events,
                    AVG(duration_ms) as avg_session_duration
                FROM authentication_events
                WHERE created_at >= %s
            """, (cutoff_time,))
            
            stats = await result.fetchone()
            
            # Get top users by activity
            top_result = await conn.execute("""
                SELECT user_id, COUNT(*) as event_count, 
                       SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_events
                FROM authentication_events
                WHERE created_at >= %s AND user_id IS NOT NULL
                GROUP BY user_id
                ORDER BY event_count DESC
                LIMIT 20
            """, (cutoff_time,))
            
            top_users = await top_result.fetchall()
            
            return {
                "period_days": days,
                "unique_users": stats[0],
                "total_events": stats[1],
                "avg_session_duration_ms": float(stats[2]) if stats[2] else 0,
                "top_active_users": [
                    {
                        "user_id": user[0],
                        "event_count": user[1],
                        "successful_events": user[2],
                        "success_rate": (user[2] / user[1] * 100) if user[1] > 0 else 0
                    }
                    for user in top_users
                ]
            }
    
    async def get_device_analytics(self, days: int = 30) -> Dict:
        """Get device-related analytics"""
        async with await self.db_connect() as conn:
            cutoff_time = datetime.utcnow() - timedelta(days=days)
            
            # Get device statistics
            result = await conn.execute("""
                SELECT 
                    COUNT(*) as total_devices,
                    COUNT(CASE WHEN trusted THEN 1 END) as trusted_devices,
                    COUNT(CASE WHEN revoked THEN 1 END) as revoked_devices
                FROM user_devices
                WHERE created_at >= %s
            """, (cutoff_time,))
            
            device_stats = await result.fetchone()
            
            # Get device types distribution
            type_result = await conn.execute("""
                SELECT device_type, COUNT(*) as count,
                       AVG(COALESCE(trust_score, 0)) as avg_trust_score
                FROM user_devices ud
                LEFT JOIN device_trust_scores dts ON ud.id = dts.device_id
                WHERE ud.created_at >= %s
                GROUP BY device_type
                ORDER BY count DESC
            """, (cutoff_time,))
            
            device_types = await type_result.fetchall()
            
            return {
                "period_days": days,
                "total_devices": device_stats[0],
                "trusted_devices": device_stats[1],
                "revoked_devices": device_stats[2],
                "by_device_type": [
                    {
                        "device_type": dtype[0],
                        "count": dtype[1],
                        "avg_trust_score": float(dtype[2]) if dtype[2] else 0
                    }
                    for dtype in device_types
                ]
            }
    
    async def get_geolocation_heatmap(self, days: int = 30) -> Dict:
        """Get geolocation heatmap data"""
        async with await self.db_connect() as conn:
            cutoff_time = datetime.utcnow() - timedelta(days=days)
            
            # Get IP-based location distribution (simulated)
            result = await conn.execute("""
                SELECT SUBSTRING(ip_address, 1, 10) as ip_prefix, COUNT(*) as count
                FROM authentication_events
                WHERE created_at >= %s AND ip_address IS NOT NULL
                GROUP BY SUBSTRING(ip_address, 1, 10)
                ORDER BY count DESC
                LIMIT 30
            """, (cutoff_time,))
            
            locations = await result.fetchall()
            
            return {
                "period_days": days,
                "locations": [
                    {
                        "location": loc[0],
                        "count": loc[1],
                        "percentage": (loc[1] / sum(l[1] for l in locations) * 100) if locations else 0
                    }
                    for loc in locations
                ]
            }
    
    async def get_risk_distribution(self, days: int = 30) -> Dict:
        """Get risk level distribution"""
        async with await self.db_connect() as conn:
            cutoff_time = datetime.utcnow() - timedelta(days=days)
            
            # Get risk score distribution
            result = await conn.execute("""
                SELECT 
                    CASE 
                        WHEN trust_score >= 80 THEN 'low'
                        WHEN trust_score >= 60 THEN 'medium'
                        WHEN trust_score >= 40 THEN 'high'
                        ELSE 'critical'
                    END as risk_level,
                    COUNT(*) as count
                FROM policy_evaluations
                WHERE evaluated_at >= %s
                GROUP BY risk_level
            """, (cutoff_time,))
            
            risk_dist = await result.fetchall()
            
            risk_levels = {'low': 0, 'medium': 0, 'high': 0, 'critical': 0}
            
            for level, count in risk_dist:
                if level in risk_levels:
                    risk_levels[level] = count
            
            total = sum(risk_levels.values())
            
            return {
                "period_days": days,
                "distribution": {
                    level: {
                        "count": count,
                        "percentage": (count / total * 100) if total > 0 else 0
                    }
                    for level, count in risk_levels.items()
                }
            }
    
    async def get_dashboard_summary(self, days: int = 30) -> Dict:
        """Get complete dashboard summary"""
        
        # Fetch all data in parallel
        auth_trends = await self.get_authentication_trends(days)
        threat_analytics = await self.get_threat_analytics(days)
        user_behavior = await self.get_user_behavior_analysis(days)
        device_analytics = await self.get_device_analytics(days)
        risk_dist = await self.get_risk_distribution(days)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "period_days": days,
            "authentication_trends": auth_trends,
            "threat_analytics": threat_analytics,
            "user_behavior": user_behavior,
            "device_analytics": device_analytics,
            "risk_distribution": risk_dist
        }
    
    async def export_dashboard_report(self, days: int = 30, format_type: str = 'json') -> Dict:
        """Export dashboard data for reporting"""
        
        summary = await self.get_dashboard_summary(days)
        
        return {
            "report_type": "research_dashboard",
            "export_format": format_type,
            "generated_at": datetime.utcnow().isoformat(),
            "data": summary
        }
