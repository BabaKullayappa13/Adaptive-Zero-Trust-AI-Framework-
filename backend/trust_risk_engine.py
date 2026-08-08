"""
Trust Score and Risk Score Calculation Engine
Dynamically calculates trust and risk scores based on multiple factors
"""

from typing import Dict, List
from datetime import datetime, timedelta
import os
import psycopg


RISK_THRESHOLDS = {
    "low_max": int(os.getenv("RISK_LOW_MAX", "29")),
    "medium_max": int(os.getenv("RISK_MEDIUM_MAX", "59")),
    "high_max": int(os.getenv("RISK_HIGH_MAX", "79")),
}
POLICY_VERSION = os.getenv("ZERO_TRUST_POLICY_VERSION", "1.0")


class TrustRiskEngine:
    """Calculates dynamic trust and risk scores for continuous authentication"""

    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func

    async def calculate_trust_score(
        self,
        user_id: str,
        session_id: int,
        device_id: int,
        factors: Dict
    ) -> Dict:
        """Calculate Trust Score based on multiple factors (0-100)"""

        trust_score = 50  # Baseline

        # Factor 1: Authentication success history (max +20)
        if factors.get("recent_successful_logins", 0) > 0:
            trust_score += min(20, factors["recent_successful_logins"] * 5)

        # Factor 2: Device trust (max +20)
        device_trust = factors.get("device_trust_score", 50)
        trust_score += (device_trust / 100) * 20

        # Factor 3: Behavioral consistency (max +15)
        behavior_score = factors.get("behavior_consistency_score", 50)
        trust_score += (behavior_score / 100) * 15

        # Factor 4: Session activity (max +15)
        if factors.get("session_duration_minutes", 0) > 5:
            trust_score += 15

        # Factor 5: Browser trust (max +10)
        if not factors.get("browser_changed"):
            trust_score += 10

        # Factor 6: Location consistency (max +10)
        if not factors.get("location_changed"):
            trust_score += 10

        # Clamp between 0 and 100
        trust_score = min(100, max(0, trust_score))

        # Store in history
        async with await self.db_connect() as conn:
            contributing_factors = {
                "authentication_history": factors.get("recent_successful_logins", 0),
                "device_trust": device_trust,
                "behavior_consistency": behavior_score,
                "session_duration": factors.get("session_duration_minutes", 0),
                "browser_trust": not factors.get("browser_changed"),
                "location_consistency": not factors.get("location_changed")
            }

            await conn.execute(
                """INSERT INTO trust_score_history 
                   (user_id, session_id, trust_score, contributing_factors, calculated_at)
                   VALUES (%s, %s, %s, %s, NOW())""",
                (user_id, session_id, trust_score, psycopg.Json(contributing_factors))
            )

            await conn.execute(
                "UPDATE user_sessions SET trust_score = %s WHERE id = %s",
                (trust_score, session_id)
            )

            await conn.commit()

        return {
            "trust_score": trust_score,
            "contributing_factors": contributing_factors
        }

    async def calculate_risk_score(
        self,
        user_id: str,
        session_id: int,
        device_id: int,
        factors: Dict
    ) -> Dict:
        """Calculate Risk Score based on anomalies and threats (0-100)"""

        risk_score = 0

        # Factor 1: New device (max +30)
        if factors.get("is_new_device"):
            risk_score += 30

        # Factor 2: New browser (max +15)
        if factors.get("browser_changed"):
            risk_score += 15

        # Factor 3: New IP address (max +20)
        if factors.get("ip_changed"):
            risk_score += 20

        # Factor 4: New location (max +20)
        if factors.get("location_changed"):
            risk_score += 20

        # Factor 5: Abnormal typing behavior (max +15)
        if factors.get("keystroke_anomaly"):
            risk_score += 15

        # Factor 6: Unusual navigation (max +10)
        if factors.get("navigation_anomaly"):
            risk_score += 10

        # Factor 7: Failed login attempts (max +20)
        failed_attempts = factors.get("recent_failed_attempts", 0)
        risk_score += min(20, failed_attempts * 5)

        # Factor 8: Session inactivity (max +15)
        if factors.get("idle_time_minutes", 0) > 30:
            risk_score += 15

        # Factor 9: VPN/Proxy detection (max +10)
        if factors.get("vpn_detected"):
            risk_score += 10

        # Factor 10: Impossible travel (max +25)
        if factors.get("impossible_travel_detected"):
            risk_score += 25

        # Clamp between 0 and 100
        risk_score = min(100, max(0, risk_score))

        # Determine risk level
        if risk_score <= RISK_THRESHOLDS["low_max"]:
            risk_level = "LOW"
        elif risk_score <= RISK_THRESHOLDS["medium_max"]:
            risk_level = "MEDIUM"
        elif risk_score <= RISK_THRESHOLDS["high_max"]:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"

        # Store in history
        async with await self.db_connect() as conn:
            risk_factors = {
                "new_device": factors.get("is_new_device"),
                "browser_changed": factors.get("browser_changed"),
                "ip_changed": factors.get("ip_changed"),
                "location_changed": factors.get("location_changed"),
                "keystroke_anomaly": factors.get("keystroke_anomaly"),
                "navigation_anomaly": factors.get("navigation_anomaly"),
                "failed_attempts": failed_attempts,
                "idle_time": factors.get("idle_time_minutes", 0),
                "vpn_detected": factors.get("vpn_detected"),
                "impossible_travel": factors.get("impossible_travel_detected")
            }

            await conn.execute(
                """INSERT INTO risk_score_history 
                   (user_id, session_id, risk_score, risk_level, risk_factors, calculated_at)
                   VALUES (%s, %s, %s, %s, %s, NOW())""",
                (user_id, session_id, risk_score, risk_level, psycopg.Json(risk_factors))
            )

            await conn.execute(
                "UPDATE user_sessions SET risk_score = %s WHERE id = %s",
                (risk_score, session_id)
            )

            await conn.commit()

        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "risk_factors": risk_factors
        }

    async def should_trigger_mfa(
        self,
        trust_score: float,
        risk_score: float,
        is_new_device: bool,
        is_new_browser: bool,
        is_new_location: bool
    ) -> Dict:
        """Determine if MFA should be triggered"""

        trigger_mfa = False
        reason = ""

        # Always trigger for high-risk situations
        if risk_score > 70:
            trigger_mfa = True
            reason = "High risk score"
        elif trust_score < 40:
            trigger_mfa = True
            reason = "Low trust score"
        elif is_new_device:
            trigger_mfa = True
            reason = "New device detected"
        elif is_new_browser:
            trigger_mfa = True
            reason = "New browser detected"
        elif is_new_location:
            trigger_mfa = True
            reason = "New location detected"

        return {
            "should_trigger_mfa": trigger_mfa,
            "reason": reason
        }

    async def evaluate_zero_trust_policy(
        self,
        user_id: str,
        session_id: int,
        trust_score: float,
        risk_score: float
    ) -> Dict:
        """Evaluate Zero Trust Policy based on scores"""

        # The policy is risk-first and intentionally independent of client claims.
        # Thresholds are centralized above so every evaluation uses one contract.
        if risk_score >= RISK_THRESHOLDS["high_max"] + 1:
            policy_decision = "BLOCK"
            access_level = "denied"
            action_required = "revoke_session"
        elif risk_score >= RISK_THRESHOLDS["medium_max"] + 1 or trust_score < 60:
            policy_decision = "STEP_UP_MFA"
            access_level = "limited"
            action_required = "mfa_required"
        else:
            policy_decision = "ALLOW"
            access_level = "user"
            action_required = "continue_monitoring"

        # Store policy decision
        async with await self.db_connect() as conn:
            reason = (
                "Critical risk exceeded the revocation threshold"
                if policy_decision == "BLOCK"
                else "Risk or trust threshold requires step-up MFA"
                if policy_decision == "STEP_UP_MFA"
                else "Signals remain within the allow thresholds"
            )
            await conn.execute(
                """INSERT INTO policy_decisions
                   (user_id, session_id, decision, trust_score, risk_score, reason, action_required)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (user_id, session_id, policy_decision, trust_score, risk_score,
                 reason, action_required)
            )
            await conn.commit()

        return {
            "policy_decision": policy_decision,
            "decision": policy_decision,
            "access_level": access_level,
            "action_required": action_required,
            "trust_score": trust_score,
            "risk_score": risk_score,
            "reason": reason,
            "rules_triggered": [],
            "policy_version": POLICY_VERSION,
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def get_score_history(
        self,
        user_id: str,
        limit: int = 50
    ) -> Dict:
        """Get trust and risk score history for user"""
        async with await self.db_connect() as conn:
            trust_result = await conn.execute(
                """SELECT trust_score, calculated_at 
                   FROM trust_score_history 
                   WHERE user_id = %s 
                   ORDER BY calculated_at DESC 
                   LIMIT %s""",
                (user_id, limit)
            )
            trust_history = await trust_result.fetchall()

            risk_result = await conn.execute(
                """SELECT risk_score, risk_level, calculated_at 
                   FROM risk_score_history 
                   WHERE user_id = %s 
                   ORDER BY calculated_at DESC 
                   LIMIT %s""",
                (user_id, limit)
            )
            risk_history = await risk_result.fetchall()

        return {
            "trust_scores": [
                {
                    "score": t[0],
                    "timestamp": t[1].isoformat()
                }
                for t in trust_history
            ],
            "risk_scores": [
                {
                    "score": r[0],
                    "level": r[1],
                    "timestamp": r[2].isoformat()
                }
                for r in risk_history
            ]
        }
