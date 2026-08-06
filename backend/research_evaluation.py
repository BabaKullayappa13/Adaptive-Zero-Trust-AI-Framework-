import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any
import math
import psycopg
from psycopg import AsyncConnection

class ResearchEvaluationModule:
    """Research evaluation metrics and analysis"""
    
    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func
    
    async def record_authentication_metrics(self, true_positives: int, true_negatives: int,
                                           false_positives: int, false_negatives: int) -> Dict:
        """Record authentication accuracy metrics"""
        # Calculate metrics
        total = true_positives + true_negatives + false_positives + false_negatives
        
        if total == 0:
            return {"error": "No samples provided"}
        
        # Basic metrics
        accuracy = (true_positives + true_negatives) / total
        
        # Precision and Recall
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
        
        # F1 Score
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        # Detection rates
        far = false_positives / (false_positives + true_negatives) if (false_positives + true_negatives) > 0 else 0
        frr = false_negatives / (false_negatives + true_positives) if (false_negatives + true_positives) > 0 else 0
        
        # Equal Error Rate (intersection of FAR and FRR curves)
        eer = (far + frr) / 2
        
        # ROC-AUC approximation
        auc_roc = 1 - eer  # Simplified AUC-ROC calculation
        
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                INSERT INTO authentication_accuracy_metrics
                (true_positives, true_negatives, false_positives, false_negatives,
                 precision, recall, f1_score, accuracy, far, frr, eer, auc_roc, evaluation_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                RETURNING id, created_at
            """, (true_positives, true_negatives, false_positives, false_negatives,
                  precision, recall, f1_score, accuracy, far, frr, eer, auc_roc))
            
            row = await result.fetchone()
            
            return {
                "metric_id": row[0],
                "true_positives": true_positives,
                "true_negatives": true_negatives,
                "false_positives": false_positives,
                "false_negatives": false_negatives,
                "accuracy": float(accuracy),
                "precision": float(precision),
                "recall": float(recall),
                "f1_score": float(f1_score),
                "far": float(far),
                "frr": float(frr),
                "eer": float(eer),
                "auc_roc": float(auc_roc),
                "recorded_at": row[1].isoformat()
            }
    
    async def get_authentication_metrics_history(self, days: int = 30) -> List[Dict]:
        """Get authentication metrics history"""
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                SELECT id, accuracy, precision, recall, f1_score, far, frr, eer, auc_roc, evaluation_date
                FROM authentication_accuracy_metrics
                WHERE evaluation_date >= NOW() - INTERVAL '%s days'
                ORDER BY evaluation_date DESC
            """, (days,))
            
            rows = await result.fetchall()
            return [
                {
                    "metric_id": row[0],
                    "accuracy": float(row[1]),
                    "precision": float(row[2]),
                    "recall": float(row[3]),
                    "f1_score": float(row[4]),
                    "far": float(row[5]),
                    "frr": float(row[6]),
                    "eer": float(row[7]),
                    "auc_roc": float(row[8]),
                    "evaluation_date": row[9].isoformat()
                }
                for row in rows
            ]
    
    async def record_roc_curve(self, thresholds: List[float], tpr: List[float],
                              fpr: List[float]) -> Dict:
        """Record ROC curve data for analysis"""
        # Calculate area under curve
        auc = 0
        for i in range(len(fpr) - 1):
            auc += (fpr[i + 1] - fpr[i]) * (tpr[i] + tpr[i + 1]) / 2
        
        async with await self.db_connect() as conn:
            # Store as JSON in research_metrics
            await conn.execute("""
                INSERT INTO research_metrics
                (metric_name, metric_value, metric_type, evaluation_period)
                VALUES (%s, %s, %s, %s)
            """, ('roc_auc', auc, 'roc_curve', 'current'))
            
            return {
                "auc": float(auc),
                "thresholds": thresholds,
                "tpr": tpr,
                "fpr": fpr,
                "recorded_at": datetime.utcnow().isoformat()
            }
    
    async def get_confusion_matrix(self, tp: int, tn: int, fp: int, fn: int) -> Dict:
        """Get confusion matrix with derived metrics"""
        return {
            "true_positives": tp,
            "true_negatives": tn,
            "false_positives": fp,
            "false_negatives": fn,
            "sensitivity": tp / (tp + fn) if (tp + fn) > 0 else 0,
            "specificity": tn / (tn + fp) if (tn + fp) > 0 else 0,
            "ppv": tp / (tp + fp) if (tp + fp) > 0 else 0,  # Positive Predictive Value
            "npv": tn / (tn + fn) if (tn + fn) > 0 else 0   # Negative Predictive Value
        }
    
    async def record_research_metric(self, metric_name: str, metric_value: float,
                                    metric_type: str, evaluation_period: str) -> Dict:
        """Record a research metric"""
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                INSERT INTO research_metrics
                (metric_name, metric_value, metric_type, evaluation_period, created_at)
                VALUES (%s, %s, %s, %s, NOW())
                RETURNING id, created_at
            """, (metric_name, metric_value, metric_type, evaluation_period))
            
            row = await result.fetchone()
            return {
                "metric_id": row[0],
                "metric_name": metric_name,
                "metric_value": float(metric_value),
                "metric_type": metric_type,
                "evaluation_period": evaluation_period,
                "recorded_at": row[1].isoformat()
            }
    
    async def get_research_metrics(self, metric_type: Optional[str] = None) -> List[Dict]:
        """Get research metrics"""
        async with await self.db_connect() as conn:
            if metric_type:
                result = await conn.execute("""
                    SELECT id, metric_name, metric_value, metric_type, evaluation_period, created_at
                    FROM research_metrics
                    WHERE metric_type = %s
                    ORDER BY created_at DESC
                """, (metric_type,))
            else:
                result = await conn.execute("""
                    SELECT id, metric_name, metric_value, metric_type, evaluation_period, created_at
                    FROM research_metrics
                    ORDER BY created_at DESC
                """)
            
            rows = await result.fetchall()
            return [
                {
                    "metric_id": row[0],
                    "metric_name": row[1],
                    "metric_value": float(row[2]),
                    "metric_type": row[3],
                    "evaluation_period": row[4],
                    "recorded_at": row[5].isoformat()
                }
                for row in rows
            ]
    
    async def get_latest_auth_metrics(self) -> Dict:
        """Get latest authentication metrics"""
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                SELECT id, accuracy, precision, recall, f1_score, far, frr, eer, auc_roc, evaluation_date
                FROM authentication_accuracy_metrics
                ORDER BY evaluation_date DESC
                LIMIT 1
            """)
            
            row = await result.fetchone()
            if not row:
                return {}
            
            return {
                "metric_id": row[0],
                "accuracy": float(row[1]),
                "precision": float(row[2]),
                "recall": float(row[3]),
                "f1_score": float(row[4]),
                "far": float(row[5]),
                "frr": float(row[6]),
                "eer": float(row[7]),
                "auc_roc": float(row[8]),
                "evaluation_date": row[9].isoformat()
            }
    
    async def get_threat_intelligence_summary(self) -> Dict:
        """Get threat intelligence summary"""
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                SELECT threat_type, severity, COUNT(*) as count, 
                       SUM(CASE WHEN mitigated THEN 1 ELSE 0 END) as mitigated
                FROM threat_intelligence
                GROUP BY threat_type, severity
                ORDER BY count DESC
            """)
            
            rows = await result.fetchall()
            
            summary = {
                "total_threats": 0,
                "threats_by_type": {},
                "threats_by_severity": {}
            }
            
            for row in rows:
                threat_type, severity, count, mitigated = row
                summary["total_threats"] += count
                
                if threat_type not in summary["threats_by_type"]:
                    summary["threats_by_type"][threat_type] = {"count": 0, "mitigated": 0}
                
                summary["threats_by_type"][threat_type]["count"] += count
                summary["threats_by_type"][threat_type]["mitigated"] += mitigated or 0
                
                if severity not in summary["threats_by_severity"]:
                    summary["threats_by_severity"][severity] = 0
                
                summary["threats_by_severity"][severity] += count
            
            return summary
