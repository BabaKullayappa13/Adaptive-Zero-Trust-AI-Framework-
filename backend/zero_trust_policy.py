"""
Zero Trust Policy Engine for Adaptive Zero Trust AI Framework
Enforces continuous, fine-grained access policies following 'Never Trust, Always Verify'.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime


class ZeroTrustPolicyEngine:
    """Evaluates and enforces dynamic Zero Trust policies and rules"""

    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func

    async def get_active_policies(self) -> List[Dict[str, Any]]:
        """Get all enabled policies with their associated rules"""
        async with self.db_connect() as conn:
            res = await conn.execute(
                """SELECT id, name, description, policy_type, priority, enabled, created_at 
                   FROM trust_policies 
                   WHERE enabled = 1 OR enabled = TRUE
                   ORDER BY priority ASC, id ASC"""
            )
            policies = await res.fetchall()

            result = []
            for p in policies:
                p_id = int(p[0])
                # Fetch rules
                r_res = await conn.execute(
                    """SELECT id, rule_name, condition_type, condition_value, action, severity 
                       FROM policy_rules 
                       WHERE policy_id = %s""",
                    (p_id,)
                )
                rules = await r_res.fetchall()

                result.append({
                    "policy_id": p_id,
                    "name": str(p[1]),
                    "description": str(p[2] or ""),
                    "policy_type": str(p[3] or "adaptive_mfa"),
                    "priority": int(p[4] or 10),
                    "enabled": bool(p[5]),
                    "created_at": str(p[6]),
                    "rules": [
                        {
                            "rule_id": int(r[0]),
                            "rule_name": str(r[1]),
                            "condition_type": str(r[2]),
                            "condition_value": str(r[3]),
                            "action": str(r[4]),
                            "severity": str(r[5])
                        }
                        for r in rules
                    ]
                })

            return result

    async def evaluate_policy(
        self,
        user_id: str,
        policy_id: int,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Evaluate a specific policy against contextual security signals"""
        async with self.db_connect() as conn:
            res = await conn.execute(
                "SELECT id, rule_name, condition_type, condition_value, action, severity FROM policy_rules WHERE policy_id = %s",
                (policy_id,)
            )
            rules = await res.fetchall()

            triggered_rules = []
            risk_score = float(context.get("risk_score", 30.0))
            trust_score = float(context.get("trust_score", 70.0))
            behavior_score = float(context.get("behavior_score", 70.0))
            is_new_device = bool(context.get("is_new_device", False))

            for r in rules:
                rule_id, rule_name, cond_type, cond_val, action, severity = r

                triggered = False
                if cond_type == "risk_score_threshold":
                    thresh = float(cond_val)
                    if risk_score >= thresh:
                        triggered = True
                elif cond_type == "behavioral" and behavior_score < float(cond_val or 50.0):
                    triggered = True
                elif cond_type == "device_mismatch" and is_new_device:
                    triggered = True

                if triggered:
                    triggered_rules.append({
                        "rule_id": int(rule_id),
                        "rule_name": str(rule_name),
                        "condition_type": str(cond_type),
                        "action": str(action),
                        "severity": str(severity)
                    })

            # Determine decision
            if any(r["severity"] == "critical" for r in triggered_rules):
                decision = "RESTRICT"
            elif any(r["severity"] == "high" for r in triggered_rules):
                decision = "STEP_UP_MFA"
            elif any(r["severity"] == "medium" for r in triggered_rules):
                decision = "ALLOW_WITH_MONITORING"
            else:
                decision = "ALLOW"

            # Record evaluation
            await conn.execute(
                """INSERT INTO policy_evaluations 
                   (user_id, policy_id, trust_score, decision, evaluated_at, reason)
                   VALUES (%s, %s, %s, %s, NOW(), %s)""",
                (user_id, policy_id, trust_score, decision, f"Triggered {len(triggered_rules)} policy rules")
            )
            await conn.commit()

            return {
                "policy_id": policy_id,
                "decision": decision,
                "trust_score": trust_score,
                "risk_score": risk_score,
                "triggered_rules": triggered_rules,
                "evaluated_at": datetime.utcnow().isoformat()
            }
