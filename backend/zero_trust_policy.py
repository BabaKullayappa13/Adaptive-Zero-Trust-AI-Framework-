import asyncio
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import psycopg
from psycopg import AsyncConnection

class ZeroTrustPolicyEngine:
    """Dynamic Zero Trust policy evaluation engine"""
    
    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func
    
    async def create_policy(self, name: str, description: str, policy_type: str,
                           priority: int, created_by: str) -> Dict:
        """Create a new trust policy"""
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                INSERT INTO trust_policies
                (name, description, policy_type, priority, created_by, enabled)
                VALUES (%s, %s, %s, %s, %s, TRUE)
                RETURNING id, name, policy_type, priority, created_at
            """, (name, description, policy_type, priority, created_by))
            
            row = await result.fetchone()
            return {
                "policy_id": row[0],
                "name": row[1],
                "policy_type": row[2],
                "priority": row[3],
                "enabled": True,
                "created_at": row[4].isoformat()
            }
    
    async def add_policy_rule(self, policy_id: int, rule_name: str,
                             condition_type: str, condition_value: str,
                             action: str, severity: str) -> Dict:
        """Add a rule to a policy"""
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                INSERT INTO policy_rules
                (policy_id, rule_name, condition_type, condition_value, action, severity)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, policy_id, rule_name, action, severity
            """, (policy_id, rule_name, condition_type, condition_value, action, severity))
            
            row = await result.fetchone()
            return {
                "rule_id": row[0],
                "policy_id": row[1],
                "rule_name": row[2],
                "action": row[3],
                "severity": row[4]
            }
    
    async def evaluate_policy(self, user_id: str, policy_id: int,
                             device_fingerprint: str, location: str,
                             ip_address: str, behavioral_score: float) -> Dict:
        """Evaluate a policy for a user"""
        async with await self.db_connect() as conn:
            # Get policy rules
            rules_result = await conn.execute("""
                SELECT id, condition_type, condition_value, action, severity
                FROM policy_rules
                WHERE policy_id = %s
            """, (policy_id,))
            
            rules = await rules_result.fetchall()
            
            # Calculate trust score
            trust_score = 100.0
            triggered_rules = []
            
            for rule in rules:
                rule_id, condition_type, condition_value, action, severity = rule
                
                # Evaluate rule conditions
                if condition_type == 'behavioral' and behavioral_score < 0.5:
                    trust_score -= 30
                    triggered_rules.append({
                        "rule_id": rule_id,
                        "condition_type": condition_type,
                        "action": action,
                        "severity": severity
                    })
                elif condition_type == 'device_mismatch' and device_fingerprint != condition_value:
                    trust_score -= 20
                    triggered_rules.append({
                        "rule_id": rule_id,
                        "condition_type": condition_type,
                        "action": action,
                        "severity": severity
                    })
                elif condition_type == 'location_anomaly':
                    # Implement geolocation anomaly detection
                    trust_score -= 15
                    triggered_rules.append({
                        "rule_id": rule_id,
                        "condition_type": condition_type,
                        "action": action,
                        "severity": severity
                    })
            
            # Determine decision
            decision = 'allow'
            if triggered_rules:
                max_severity = max([r['severity'] for r in triggered_rules])
                if max_severity == 'critical':
                    decision = 'deny'
                elif max_severity == 'high':
                    decision = 'challenge'
            
            # Store evaluation
            result = await conn.execute("""
                INSERT INTO policy_evaluations
                (user_id, policy_id, trust_score, decision, evaluated_at, reason)
                VALUES (%s, %s, %s, %s, NOW(), %s)
                RETURNING id, trust_score, decision, evaluated_at
            """, (user_id, policy_id, trust_score, decision, f"Triggered {len(triggered_rules)} rules"))
            
            eval_row = await result.fetchone()
            
            return {
                "evaluation_id": eval_row[0],
                "user_id": user_id,
                "policy_id": policy_id,
                "trust_score": eval_row[1],
                "decision": eval_row[2],
                "triggered_rules": len(triggered_rules),
                "evaluated_at": eval_row[3].isoformat()
            }
    
    async def get_policy_details(self, policy_id: int) -> Dict:
        """Get full policy details with rules"""
        async with await self.db_connect() as conn:
            # Get policy
            policy_result = await conn.execute("""
                SELECT id, name, description, policy_type, priority, enabled, created_by, created_at
                FROM trust_policies
                WHERE id = %s
            """, (policy_id,))
            
            policy_row = await policy_result.fetchone()
            
            # Get rules
            rules_result = await conn.execute("""
                SELECT id, rule_name, condition_type, condition_value, action, severity
                FROM policy_rules
                WHERE policy_id = %s
            """, (policy_id,))
            
            rules = await rules_result.fetchall()
            
            return {
                "policy_id": policy_row[0],
                "name": policy_row[1],
                "description": policy_row[2],
                "policy_type": policy_row[3],
                "priority": policy_row[4],
                "enabled": policy_row[5],
                "created_by": policy_row[6],
                "created_at": policy_row[7].isoformat(),
                "rules": [
                    {
                        "rule_id": rule[0],
                        "rule_name": rule[1],
                        "condition_type": rule[2],
                        "condition_value": rule[3],
                        "action": rule[4],
                        "severity": rule[5]
                    }
                    for rule in rules
                ]
            }
    
    async def get_active_policies(self) -> List[Dict]:
        """Get all active policies"""
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                SELECT id, name, policy_type, priority, enabled, created_at
                FROM trust_policies
                WHERE enabled = TRUE
                ORDER BY priority ASC
            """)
            
            rows = await result.fetchall()
            return [
                {
                    "policy_id": row[0],
                    "name": row[1],
                    "policy_type": row[2],
                    "priority": row[3],
                    "enabled": row[4],
                    "created_at": row[5].isoformat()
                }
                for row in rows
            ]
    
    async def evaluate_session_risk(self, user_id: str, device_id: Optional[int],
                                   session_duration_hours: float,
                                   request_count: int) -> Dict:
        """Evaluate overall session risk"""
        risk_score = 0
        risk_factors = []
        
        # New device risk
        if device_id is None:
            risk_score += 30
            risk_factors.append("new_device")
        
        # Session duration risk
        if session_duration_hours > 8:
            risk_score += 15
            risk_factors.append("long_session_duration")
        
        # Unusual activity
        if request_count > 200:
            risk_score += 20
            risk_factors.append("high_request_volume")
        
        risk_level = 'low'
        if risk_score >= 60:
            risk_level = 'critical'
        elif risk_score >= 40:
            risk_level = 'high'
        elif risk_score >= 20:
            risk_level = 'medium'
        
        return {
            "user_id": user_id,
            "risk_score": min(risk_score, 100),
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "requires_challenge": risk_level in ['high', 'critical']
        }
    
    async def terminate_high_risk_session(self, user_id: str, session_id: str,
                                         reason: str) -> Dict:
        """Terminate a high-risk session"""
        async with await self.db_connect() as conn:
            # Record audit log
            await conn.execute("""
                INSERT INTO audit_logs
                (user_id, action_type, resource_type, resource_id, details, status)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (user_id, 'session_termination', 'session', session_id, reason, 'executed'))
            
            return {
                "session_id": session_id,
                "user_id": user_id,
                "status": "terminated",
                "reason": reason,
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def get_policy_evaluation_history(self, user_id: Optional[str] = None,
                                          hours: int = 24) -> List[Dict]:
        """Get policy evaluation history"""
        async with await self.db_connect() as conn:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            if user_id:
                result = await conn.execute("""
                    SELECT id, user_id, policy_id, trust_score, decision, evaluated_at, reason
                    FROM policy_evaluations
                    WHERE user_id = %s AND evaluated_at >= %s
                    ORDER BY evaluated_at DESC
                """, (user_id, cutoff_time))
            else:
                result = await conn.execute("""
                    SELECT id, user_id, policy_id, trust_score, decision, evaluated_at, reason
                    FROM policy_evaluations
                    WHERE evaluated_at >= %s
                    ORDER BY evaluated_at DESC
                """, (cutoff_time,))
            
            rows = await result.fetchall()
            return [
                {
                    "evaluation_id": row[0],
                    "user_id": row[1],
                    "policy_id": row[2],
                    "trust_score": float(row[3]),
                    "decision": row[4],
                    "evaluated_at": row[5].isoformat(),
                    "reason": row[6]
                }
                for row in rows
            ]
