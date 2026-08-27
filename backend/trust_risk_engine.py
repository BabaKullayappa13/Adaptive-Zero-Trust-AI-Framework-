"""
Trust Score and Risk Score Calculation Engine for Adaptive Zero Trust AI Framework
Dynamically calculates multi-factor Trust Score, Risk Score, Confidence Score, and Zero Trust Decisions.
"""

import os
from typing import Dict, List, Any, Optional
from datetime import datetime

RISK_THRESHOLDS = {
    "low_max": int(os.getenv("RISK_LOW_MAX", "29")),
    "medium_max": int(os.getenv("RISK_MEDIUM_MAX", "59")),
    "high_max": int(os.getenv("RISK_HIGH_MAX", "79")),
}
POLICY_VERSION = os.getenv("ZERO_TRUST_POLICY_VERSION", "2.0")


class TrustRiskEngine:
    """Calculates dynamic trust and risk scores for continuous multi-factor authentication"""

    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func

    async def calculate_trust_score(
        self,
        user_id: str,
        session_id: int,
        device_id: Optional[int],
        factors: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate dynamic Trust Score (0-100) based on positive trust signals"""

        trust_score = 50.0  # Neutral baseline

        # Factor 1: Successful authentication history (max +20)
        recent_logins = factors.get("recent_successful_logins", 1)
        trust_score += min(20.0, float(recent_logins) * 4.0)

        # Factor 2: Device trust score (max +20)
        device_trust = float(factors.get("device_trust_score", 50.0))
        trust_score += (device_trust / 100.0) * 20.0

        # Factor 3: Behavioral consistency (max +20)
        behavior_consistency = float(factors.get("behavior_consistency_score", 60.0))
        trust_score += (behavior_consistency / 100.0) * 20.0

        # Factor 4: Secret PIN / Step-Up verified in session (max +15)
        if factors.get("pin_verified", False) or factors.get("step_up_completed", False):
            trust_score += 15.0

        # Factor 5: Session stability / duration (max +10)
        duration_mins = float(factors.get("session_duration_minutes", 0.0))
        if duration_mins > 3.0:
            trust_score += min(10.0, duration_mins * 1.5)

        # Factor 6: Browser & location consistency (max +15)
        if not factors.get("browser_changed", False):
            trust_score += 7.5
        if not factors.get("location_changed", False):
            trust_score += 7.5

        # Penalties: AI anomaly score deduction (up to -35)
        ai_anomaly = float(factors.get("ai_anomaly_score", 0.0))
        if ai_anomaly > 0:
            trust_score -= (ai_anomaly / 100.0) * 35.0

        # Failed attempt penalty
        failed_attempts = int(factors.get("recent_failed_attempts", 0))
        if failed_attempts > 0:
            trust_score -= min(30.0, failed_attempts * 10.0)

        # Clamp between 0.0 and 100.0
        trust_score = round(min(100.0, max(0.0, trust_score)), 2)

        # Determine trust level category
        if trust_score >= 80.0:
            trust_level = "TRUSTED"
        elif trust_score >= 60.0:
            trust_level = "NORMAL"
        elif trust_score >= 40.0:
            trust_level = "SUSPICIOUS"
        else:
            trust_level = "RESTRICTED"

        contributing_factors = {
            "authentication_history": recent_logins,
            "device_trust": device_trust,
            "behavior_consistency": behavior_consistency,
            "pin_verified": factors.get("pin_verified", False),
            "session_duration_minutes": duration_mins,
            "browser_consistent": not factors.get("browser_changed", False),
            "location_consistent": not factors.get("location_changed", False),
            "ai_anomaly_penalty": ai_anomaly,
            "trust_level": trust_level
        }

        # Store in history
        try:
            async with self.db_connect() as conn:
                await conn.execute(
                    """INSERT INTO trust_score_history 
                       (user_id, session_id, trust_score, contributing_factors, calculated_at)
                       VALUES (%s, %s, %s, %s, NOW())""",
                    (user_id, session_id, trust_score, contributing_factors)
                )
                if session_id:
                    await conn.execute(
                        "UPDATE user_sessions SET trust_score = %s WHERE id = %s",
                        (trust_score, session_id)
                    )
                await conn.commit()
        except Exception as e:
            print(f"[TrustRiskEngine] Error recording trust score history: {e}")

        return {
            "trust_score": trust_score,
            "trust_level": trust_level,
            "contributing_factors": contributing_factors
        }

    async def calculate_risk_score(
        self,
        user_id: str,
        session_id: int,
        device_id: Optional[int],
        factors: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate dynamic Risk Score (0-100) based on anomalies, threats, and contextual deviations"""

        risk_score = 5.0  # Minimum base risk

        # Factor 1: Unrecognized / new device (max +30)
        if factors.get("is_new_device", False):
            risk_score += 25.0

        # Factor 2: Browser mismatch / change (max +15)
        if factors.get("browser_changed", False):
            risk_score += 15.0

        # Factor 3: IP address / network change (max +15)
        if factors.get("ip_changed", False):
            risk_score += 15.0

        # Factor 4: Geolocation anomaly (max +20)
        if factors.get("location_changed", False):
            risk_score += 15.0

        # Factor 5: Keystroke cadence anomaly (max +20)
        if factors.get("keystroke_anomaly", False):
            ks_dev = float(factors.get("keystroke_deviation_percent", 30.0))
            risk_score += min(20.0, (ks_dev / 100.0) * 20.0)

        # Factor 6: Mouse trajectory & dynamics anomaly (max +20)
        if factors.get("mouse_anomaly", False):
            ms_dev = float(factors.get("mouse_deviation_percent", 30.0))
            risk_score += min(20.0, (ms_dev / 100.0) * 20.0)

        # Factor 7: AI Anomaly Detector Output (Isolation Forest) (max +35)
        ai_anomaly_score = float(factors.get("ai_anomaly_score", 0.0))
        if ai_anomaly_score > 0:
            risk_score += min(35.0, (ai_anomaly_score / 100.0) * 35.0)

        # Factor 8: Failed authentication / PIN attempts (max +30)
        failed_attempts = int(factors.get("recent_failed_attempts", 0))
        if failed_attempts > 0:
            risk_score += min(30.0, failed_attempts * 10.0)

        # Factor 9: Extended idle time (max +15)
        idle_seconds = int(factors.get("idle_time_seconds", 0))
        if idle_seconds > 300:  # 5 min idle
            risk_score += min(15.0, (idle_seconds / 60) * 2.0)

        # Factor 10: VPN / Proxy detection (max +15)
        if factors.get("vpn_detected", False):
            risk_score += 15.0

        # Factor 11: Impossible travel (max +35)
        if factors.get("impossible_travel_detected", False):
            risk_score += 35.0

        # Reductions: Secret PIN successfully validated (-25 risk)
        if factors.get("pin_verified", False):
            risk_score = max(0.0, risk_score - 25.0)

        # Clamp between 0.0 and 100.0
        risk_score = round(min(100.0, max(0.0, risk_score)), 2)

        # Determine risk level
        if risk_score <= RISK_THRESHOLDS["low_max"]:
            risk_level = "LOW"
        elif risk_score <= RISK_THRESHOLDS["medium_max"]:
            risk_level = "MEDIUM"
        elif risk_score <= RISK_THRESHOLDS["high_max"]:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"

        risk_factors = {
            "is_new_device": factors.get("is_new_device", False),
            "browser_changed": factors.get("browser_changed", False),
            "ip_changed": factors.get("ip_changed", False),
            "location_changed": factors.get("location_changed", False),
            "keystroke_anomaly": factors.get("keystroke_anomaly", False),
            "mouse_anomaly": factors.get("mouse_anomaly", False),
            "ai_anomaly_score": ai_anomaly_score,
            "failed_attempts": failed_attempts,
            "idle_seconds": idle_seconds,
            "vpn_detected": factors.get("vpn_detected", False),
            "impossible_travel": factors.get("impossible_travel_detected", False),
            "pin_verified": factors.get("pin_verified", False)
        }

        # Store in history
        try:
            async with self.db_connect() as conn:
                await conn.execute(
                    """INSERT INTO risk_score_history 
                       (user_id, session_id, risk_score, risk_level, risk_factors, calculated_at)
                       VALUES (%s, %s, %s, %s, %s, NOW())""",
                    (user_id, session_id, risk_score, risk_level, risk_factors)
                )
                if session_id:
                    await conn.execute(
                        "UPDATE user_sessions SET risk_score = %s WHERE id = %s",
                        (risk_score, session_id)
                    )
                await conn.commit()
        except Exception as e:
            print(f"[TrustRiskEngine] Error recording risk score history: {e}")

        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "risk_factors": risk_factors
        }

    def calculate_confidence_score(
        self,
        trust_score: float,
        risk_score: float,
        data_points_count: int = 5
    ) -> float:
        """Calculate statistical confidence in the security decision (0-100)"""
        # Confidence increases with more interaction signals and clear score separation
        score_separation = abs(trust_score - risk_score)
        data_sufficiency = min(1.0, data_points_count / 8.0)
        confidence = (score_separation * 0.6) + (data_sufficiency * 40.0)
        return round(min(99.5, max(45.0, confidence)), 1)

    async def evaluate_zero_trust_policy(
        self,
        user_id: str,
        session_id: int,
        trust_score: float,
        risk_score: float,
        resource_sensitivity: str = "normal"
    ) -> Dict[str, Any]:
        """Evaluate Zero Trust Policy ('Never Trust, Always Verify')"""

        # Sensitivity modifier: sensitive resources (e.g. admin or private cloud) lower thresholds
        threshold_offset = 10.0 if resource_sensitivity == "high" else 0.0

        if risk_score >= (RISK_THRESHOLDS["high_max"] + 1 - threshold_offset):
            policy_decision = "RESTRICT"
            access_level = "denied"
            action_required = "terminate_session"
            reason = f"Risk score ({risk_score}) reached critical threshold for {resource_sensitivity} resource."
        elif risk_score >= (RISK_THRESHOLDS["medium_max"] + 1 - threshold_offset) or trust_score < 50.0:
            policy_decision = "STEP_UP_MFA"
            access_level = "limited"
            action_required = "require_secret_pin"
            reason = f"Elevated risk score ({risk_score}) or low trust score ({trust_score}) requires Secret PIN verification."
        elif risk_score > RISK_THRESHOLDS["low_max"]:
            policy_decision = "ALLOW_WITH_MONITORING"
            access_level = "monitored"
            action_required = "continuous_monitoring"
            reason = f"Normal risk ({risk_score}) within continuous monitoring bounds."
        else:
            policy_decision = "ALLOW"
            access_level = "full"
            action_required = "continue_monitoring"
            reason = f"Low risk ({risk_score}) and healthy trust ({trust_score}). Access granted."

        # Store policy decision
        try:
            async with self.db_connect() as conn:
                await conn.execute(
                    """INSERT INTO policy_decisions
                       (user_id, session_id, decision, trust_score, risk_score, reason, action_required, created_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())""",
                    (user_id, session_id, policy_decision, trust_score, risk_score, reason, action_required)
                )
                if policy_decision == "STEP_UP_MFA" and session_id:
                    await conn.execute(
                        "UPDATE user_sessions SET step_up_required = TRUE WHERE id = %s",
                        (session_id,)
                    )
                elif policy_decision == "RESTRICT" and session_id:
                    await conn.execute(
                        "UPDATE user_sessions SET is_active = FALSE WHERE id = %s",
                        (session_id,)
                    )
                await conn.commit()
        except Exception as e:
            print(f"[TrustRiskEngine] Error storing policy decision: {e}")

        return {
            "policy_decision": policy_decision,
            "decision": policy_decision,
            "access_level": access_level,
            "action_required": action_required,
            "trust_score": trust_score,
            "risk_score": risk_score,
            "reason": reason,
            "policy_version": POLICY_VERSION,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def get_score_history(
        self,
        user_id: str,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get trust and risk score history for user"""
        async with self.db_connect() as conn:
            trust_result = await conn.execute(
                """SELECT trust_score, calculated_at 
                   FROM trust_score_history 
                   WHERE user_id = %s 
                   ORDER BY id DESC 
                   LIMIT %s""",
                (user_id, limit)
            )
            trust_history = await trust_result.fetchall()

            risk_result = await conn.execute(
                """SELECT risk_score, risk_level, calculated_at 
                   FROM risk_score_history 
                   WHERE user_id = %s 
                   ORDER BY id DESC 
                   LIMIT %s""",
                (user_id, limit)
            )
            risk_history = await risk_result.fetchall()

        return {
            "trust_scores": [
                {
                    "score": float(t[0]),
                    "timestamp": str(t[1])
                }
                for t in trust_history
            ],
            "risk_scores": [
                {
                    "score": float(r[0]),
                    "level": str(r[1]),
                    "timestamp": str(r[2])
                }
                for r in risk_history
            ]
        }
