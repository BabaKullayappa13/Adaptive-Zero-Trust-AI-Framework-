import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any
import psycopg
from psycopg import AsyncConnection

class IEEEBaselineComparison:
    """Compare metrics against IEEE baseline standards"""
    
    # IEEE baseline metrics for Zero-Trust Authentication Systems
    IEEE_BASELINES = {
        'authentication_accuracy': {
            'value': 0.92,
            'unit': '%',
            'description': 'IEEE 802.1X Authentication Accuracy'
        },
        'false_acceptance_rate': {
            'value': 0.02,
            'unit': '%',
            'description': 'Acceptable FAR threshold'
        },
        'false_rejection_rate': {
            'value': 0.05,
            'unit': '%',
            'description': 'Acceptable FRR threshold'
        },
        'response_time_p99': {
            'value': 500,
            'unit': 'ms',
            'description': 'P99 response time for auth operations'
        },
        'availability': {
            'value': 0.99,
            'unit': '%',
            'description': '99% uptime requirement'
        },
        'device_trust_accuracy': {
            'value': 0.95,
            'unit': '%',
            'description': 'Device trust evaluation accuracy'
        },
        'policy_enforcement_latency': {
            'value': 100,
            'unit': 'ms',
            'description': 'Zero-Trust policy enforcement latency'
        },
        'session_anomaly_detection': {
            'value': 0.88,
            'unit': '%',
            'description': 'Session anomaly detection rate'
        }
    }
    
    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func
    
    async def record_comparison(self, metric_name: str, our_value: float,
                               gap_analysis: Optional[str] = None) -> Dict:
        """Record a metric comparison against IEEE baseline"""
        
        baseline = self.IEEE_BASELINES.get(metric_name)
        if not baseline:
            return {"error": f"Unknown metric: {metric_name}"}
        
        baseline_value = baseline['value']
        improvement_percent = ((our_value - baseline_value) / baseline_value) * 100 if baseline_value != 0 else 0
        
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                INSERT INTO ieee_baseline_comparison
                (metric_name, our_value, ieee_baseline, improvement_percent, gap_analysis, evaluated_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                RETURNING id, evaluated_at
            """, (metric_name, our_value, baseline_value, improvement_percent, gap_analysis))
            
            row = await result.fetchone()
            
            return {
                "comparison_id": row[0],
                "metric_name": metric_name,
                "metric_description": baseline['description'],
                "our_value": float(our_value),
                "our_unit": baseline['unit'],
                "ieee_baseline": float(baseline_value),
                "baseline_unit": baseline['unit'],
                "improvement_percent": float(improvement_percent),
                "status": "exceeds" if improvement_percent > 0 else "below",
                "gap_analysis": gap_analysis,
                "evaluated_at": row[1].isoformat()
            }
    
    async def get_comparison_report(self) -> Dict:
        """Get comprehensive comparison report"""
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                SELECT 
                    metric_name, 
                    our_value, 
                    ieee_baseline, 
                    improvement_percent,
                    evaluated_at
                FROM ieee_baseline_comparison
                WHERE evaluated_at = (
                    SELECT MAX(evaluated_at) FROM ieee_baseline_comparison
                    WHERE metric_name = ieee_baseline_comparison.metric_name
                )
                ORDER BY improvement_percent DESC
            """)
            
            rows = await result.fetchall()
            
            report = {
                "total_metrics": len(rows),
                "metrics_exceeding": 0,
                "metrics_below": 0,
                "overall_improvement": 0,
                "comparisons": []
            }
            
            total_improvement = 0
            
            for row in rows:
                comparison = {
                    "metric_name": row[0],
                    "our_value": float(row[1]),
                    "ieee_baseline": float(row[2]),
                    "improvement_percent": float(row[3]),
                    "status": "exceeds" if row[3] > 0 else "below",
                    "evaluated_at": row[4].isoformat()
                }
                
                report["comparisons"].append(comparison)
                
                if row[3] > 0:
                    report["metrics_exceeding"] += 1
                else:
                    report["metrics_below"] += 1
                
                total_improvement += row[3]
            
            if len(rows) > 0:
                report["overall_improvement"] = total_improvement / len(rows)
            
            return report
    
    async def get_metric_comparison(self, metric_name: str) -> Dict:
        """Get detailed comparison for specific metric"""
        baseline = self.IEEE_BASELINES.get(metric_name)
        if not baseline:
            return {"error": f"Unknown metric: {metric_name}"}
        
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                SELECT our_value, ieee_baseline, improvement_percent, gap_analysis, evaluated_at
                FROM ieee_baseline_comparison
                WHERE metric_name = %s
                ORDER BY evaluated_at DESC
                LIMIT 1
            """, (metric_name,))
            
            row = await result.fetchone()
            
            if not row:
                # Return baseline with no current data
                return {
                    "metric_name": metric_name,
                    "metric_description": baseline['description'],
                    "ieee_baseline": float(baseline['value']),
                    "baseline_unit": baseline['unit'],
                    "our_value": None,
                    "status": "not_evaluated"
                }
            
            return {
                "metric_name": metric_name,
                "metric_description": baseline['description'],
                "ieee_baseline": float(row[1]),
                "baseline_unit": baseline['unit'],
                "our_value": float(row[0]),
                "improvement_percent": float(row[2]),
                "status": "exceeds" if row[2] > 0 else "below",
                "gap_analysis": row[3],
                "evaluated_at": row[4].isoformat()
            }
    
    async def get_baseline_standards(self) -> Dict:
        """Get all IEEE baseline standards"""
        return {
            "standards": self.IEEE_BASELINES,
            "version": "IEEE 802.1X / Zero-Trust Authentication",
            "last_updated": "2024"
        }
    
    async def get_comparison_history(self, metric_name: Optional[str] = None,
                                    days: int = 90) -> List[Dict]:
        """Get comparison history over time"""
        async with await self.db_connect() as conn:
            if metric_name:
                result = await conn.execute("""
                    SELECT metric_name, our_value, ieee_baseline, improvement_percent, evaluated_at
                    FROM ieee_baseline_comparison
                    WHERE metric_name = %s AND evaluated_at >= NOW() - INTERVAL '%s days'
                    ORDER BY evaluated_at ASC
                """, (metric_name, days))
            else:
                result = await conn.execute("""
                    SELECT metric_name, our_value, ieee_baseline, improvement_percent, evaluated_at
                    FROM ieee_baseline_comparison
                    WHERE evaluated_at >= NOW() - INTERVAL '%s days'
                    ORDER BY evaluated_at ASC
                """, (days,))
            
            rows = await result.fetchall()
            return [
                {
                    "metric_name": row[0],
                    "our_value": float(row[1]),
                    "ieee_baseline": float(row[2]),
                    "improvement_percent": float(row[3]),
                    "evaluated_at": row[4].isoformat()
                }
                for row in rows
            ]
    
    async def generate_compliance_score(self) -> Dict:
        """Generate overall IEEE compliance score"""
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                SELECT metric_name, improvement_percent
                FROM ieee_baseline_comparison
                WHERE evaluated_at = (
                    SELECT MAX(evaluated_at) FROM ieee_baseline_comparison
                    WHERE metric_name = ieee_baseline_comparison.metric_name
                )
            """)
            
            rows = await result.fetchall()
            
            if not rows:
                return {"compliance_score": 0, "status": "not_evaluated"}
            
            compliance_scores = []
            for row in rows:
                # Each metric contributes to overall compliance
                metric_score = min(100, max(0, 50 + (row[1] * 5)))  # Baseline 50% + improvements
                compliance_scores.append(metric_score)
            
            average_compliance = sum(compliance_scores) / len(compliance_scores)
            
            return {
                "compliance_score": float(average_compliance),
                "compliance_percentage": f"{average_compliance:.1f}%",
                "status": "exceeds" if average_compliance > 80 else "meets" if average_compliance > 50 else "below",
                "metrics_evaluated": len(rows),
                "recommendation": (
                    "Excellent compliance with IEEE standards" if average_compliance > 90 else
                    "Good compliance, some areas for improvement" if average_compliance > 75 else
                    "Meets baseline requirements" if average_compliance > 50 else
                    "Below IEEE standards, improvement needed"
                )
            }
