import asyncio
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import json
import psycopg
from psycopg import AsyncConnection

class AutomaticReportsService:
    """Generate and schedule automated reports"""
    
    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func
    
    async def create_report_template(self, template_name: str, report_type: str,
                                    sections: List[str], format_type: str) -> Dict:
        """Create a report template"""
        
        return {
            "template_name": template_name,
            "report_type": report_type,
            "format_type": format_type,
            "sections": sections,
            "created_at": datetime.utcnow().isoformat()
        }
    
    async def generate_pdf_report(self, report_type: str, data: Dict,
                                 title: str = "Security Report") -> Dict:
        """Generate PDF report"""
        
        async with await self.db_connect() as conn:
            # Store report metadata
            result = await conn.execute("""
                INSERT INTO generated_reports
                (report_type, report_format, report_path, status, generated_at)
                VALUES (%s, %s, %s, %s, NOW())
                RETURNING id, generated_at
            """, (report_type, 'pdf', f'/reports/{report_type}_{datetime.utcnow().timestamp()}.pdf', 'generated'))
            
            row = await result.fetchone()
            
            return {
                "report_id": row[0],
                "report_type": report_type,
                "format": "pdf",
                "title": title,
                "generated_at": row[1].isoformat(),
                "download_url": f"/api/reports/{row[0]}/download",
                "status": "ready"
            }
    
    async def generate_csv_report(self, report_type: str, data: List[Dict],
                                 filename: str = "report.csv") -> Dict:
        """Generate CSV export"""
        
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                INSERT INTO generated_reports
                (report_type, report_format, report_path, status, generated_at)
                VALUES (%s, %s, %s, %s, NOW())
                RETURNING id, generated_at
            """, (report_type, 'csv', f'/reports/{filename}', 'generated'))
            
            row = await result.fetchone()
            
            return {
                "report_id": row[0],
                "report_type": report_type,
                "format": "csv",
                "filename": filename,
                "records": len(data),
                "generated_at": row[1].isoformat(),
                "download_url": f"/api/reports/{row[0]}/download"
            }
    
    async def schedule_report(self, report_type: str, schedule_frequency: str,
                             recipients: List[str]) -> Dict:
        """Schedule automatic report generation"""
        
        async with await self.db_connect() as conn:
            recipients_str = ','.join(recipients)
            
            result = await conn.execute("""
                INSERT INTO report_schedules
                (report_type, schedule_frequency, recipients, enabled, created_at)
                VALUES (%s, %s, %s, TRUE, NOW())
                RETURNING id, report_type, schedule_frequency, created_at
            """, (report_type, schedule_frequency, recipients_str))
            
            row = await result.fetchone()
            
            return {
                "schedule_id": row[0],
                "report_type": row[1],
                "frequency": row[2],
                "recipients": recipients,
                "enabled": True,
                "created_at": row[3].isoformat()
            }
    
    async def get_report_schedules(self, enabled_only: bool = True) -> List[Dict]:
        """Get scheduled reports"""
        
        async with await self.db_connect() as conn:
            if enabled_only:
                result = await conn.execute("""
                    SELECT id, report_type, schedule_frequency, recipients, enabled, last_generated_at
                    FROM report_schedules
                    WHERE enabled = TRUE
                    ORDER BY report_type
                """)
            else:
                result = await conn.execute("""
                    SELECT id, report_type, schedule_frequency, recipients, enabled, last_generated_at
                    FROM report_schedules
                    ORDER BY report_type
                """)
            
            rows = await result.fetchall()
            
            return [
                {
                    "schedule_id": row[0],
                    "report_type": row[1],
                    "frequency": row[2],
                    "recipients": row[3].split(',') if row[3] else [],
                    "enabled": row[4],
                    "last_generated_at": row[5].isoformat() if row[5] else None
                }
                for row in rows
            ]
    
    async def get_generated_reports(self, report_type: Optional[str] = None,
                                   days: int = 30) -> List[Dict]:
        """Get generated reports"""
        
        async with await self.db_connect() as conn:
            cutoff_time = datetime.utcnow() - timedelta(days=days)
            
            if report_type:
                result = await conn.execute("""
                    SELECT id, report_type, report_format, generated_at, status, file_size_bytes
                    FROM generated_reports
                    WHERE report_type = %s AND generated_at >= %s
                    ORDER BY generated_at DESC
                """, (report_type, cutoff_time))
            else:
                result = await conn.execute("""
                    SELECT id, report_type, report_format, generated_at, status, file_size_bytes
                    FROM generated_reports
                    WHERE generated_at >= %s
                    ORDER BY generated_at DESC
                """, (cutoff_time,))
            
            rows = await result.fetchall()
            
            return [
                {
                    "report_id": row[0],
                    "report_type": row[1],
                    "format": row[2],
                    "generated_at": row[3].isoformat(),
                    "status": row[4],
                    "file_size_bytes": row[5],
                    "download_url": f"/api/reports/{row[0]}/download"
                }
                for row in rows
            ]
    
    async def generate_daily_summary(self, report_date: Optional[str] = None) -> Dict:
        """Generate daily summary report"""
        
        if not report_date:
            report_date = datetime.utcnow().strftime("%Y-%m-%d")
        
        async with await self.db_connect() as conn:
            # Get daily statistics
            start_time = datetime.strptime(report_date, "%Y-%m-%d")
            end_time = start_time + timedelta(days=1)
            
            # Auth events
            auth_result = await conn.execute("""
                SELECT COUNT(*) as total, 
                       SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful
                FROM authentication_events
                WHERE created_at >= %s AND created_at < %s
            """, (start_time, end_time))
            
            auth_stats = await auth_result.fetchone()
            
            # Threats
            threat_result = await conn.execute("""
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN mitigated THEN 1 ELSE 0 END) as mitigated
                FROM threat_intelligence
                WHERE created_at >= %s AND created_at < %s
            """, (start_time, end_time))
            
            threat_stats = await threat_result.fetchone()
            
            return {
                "report_date": report_date,
                "summary": {
                    "authentication_events": {
                        "total": auth_stats[0],
                        "successful": auth_stats[1],
                        "success_rate": (auth_stats[1] / auth_stats[0] * 100) if auth_stats[0] > 0 else 0
                    },
                    "threat_events": {
                        "total": threat_stats[0],
                        "mitigated": threat_stats[1],
                        "mitigation_rate": (threat_stats[1] / threat_stats[0] * 100) if threat_stats[0] > 0 else 0
                    }
                },
                "generated_at": datetime.utcnow().isoformat()
            }
    
    async def generate_weekly_summary(self, week_start_date: Optional[str] = None) -> Dict:
        """Generate weekly summary report"""
        
        if not week_start_date:
            # Get Monday of current week
            today = datetime.utcnow()
            week_start_date = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")
        
        week_start = datetime.strptime(week_start_date, "%Y-%m-%d")
        week_end = week_start + timedelta(days=7)
        
        async with await self.db_connect() as conn:
            # Get metrics by day
            result = await conn.execute("""
                SELECT DATE_TRUNC('day', created_at) as day,
                       COUNT(*) as auth_count,
                       SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_auth
                FROM authentication_events
                WHERE created_at >= %s AND created_at < %s
                GROUP BY DATE_TRUNC('day', created_at)
                ORDER BY day ASC
            """, (week_start, week_end))
            
            daily_data = await result.fetchall()
            
            return {
                "period": f"{week_start_date} to {(week_end - timedelta(days=1)).strftime('%Y-%m-%d')}",
                "daily_metrics": [
                    {
                        "date": row[0].strftime("%Y-%m-%d") if row[0] else None,
                        "auth_events": row[1],
                        "successful_auth": row[2],
                        "success_rate": (row[2] / row[1] * 100) if row[1] > 0 else 0
                    }
                    for row in daily_data
                ],
                "week_total": sum(row[1] for row in daily_data),
                "generated_at": datetime.utcnow().isoformat()
            }
    
    async def generate_monthly_summary(self, year_month: Optional[str] = None) -> Dict:
        """Generate monthly summary report"""
        
        if not year_month:
            year_month = datetime.utcnow().strftime("%Y-%m")
        
        year, month = year_month.split('-')
        month_start = datetime(int(year), int(month), 1)
        
        # Get next month for range
        if int(month) == 12:
            month_end = datetime(int(year) + 1, 1, 1)
        else:
            month_end = datetime(int(year), int(month) + 1, 1)
        
        async with await self.db_connect() as conn:
            # Authentication metrics
            auth_result = await conn.execute("""
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
                       AVG(duration_ms) as avg_duration
                FROM authentication_events
                WHERE created_at >= %s AND created_at < %s
            """, (month_start, month_end))
            
            auth_stats = await auth_result.fetchone()
            
            # Threat metrics
            threat_result = await conn.execute("""
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN mitigated THEN 1 ELSE 0 END) as mitigated
                FROM threat_intelligence
                WHERE created_at >= %s AND created_at < %s
            """, (month_start, month_end))
            
            threat_stats = await threat_result.fetchone()
            
            return {
                "period": year_month,
                "authentication_summary": {
                    "total_events": auth_stats[0],
                    "successful_events": auth_stats[1],
                    "success_rate": (auth_stats[1] / auth_stats[0] * 100) if auth_stats[0] > 0 else 0,
                    "avg_duration_ms": float(auth_stats[2]) if auth_stats[2] else 0
                },
                "threat_summary": {
                    "total_detected": threat_stats[0],
                    "total_mitigated": threat_stats[1],
                    "mitigation_rate": (threat_stats[1] / threat_stats[0] * 100) if threat_stats[0] > 0 else 0
                },
                "generated_at": datetime.utcnow().isoformat()
            }
