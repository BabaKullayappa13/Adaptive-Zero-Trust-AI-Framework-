"""
Continuous Authentication Orchestrator
Coordinates all continuous authentication components
"""

from typing import Dict, Optional
from datetime import datetime, timedelta
import uuid
import psycopg

from behavioral_analysis import BehavioralAnalysisEngine
from device_fingerprint import DeviceFingerprintEngine
from trust_risk_engine import TrustRiskEngine
from location_tracking import LocationTrackingEngine


class ContinuousAuthenticationOrchestrator:
    """Orchestrates continuous authentication system"""

    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func
        self.behavioral = BehavioralAnalysisEngine(db_connect_func)
        self.device = DeviceFingerprintEngine(db_connect_func)
        self.trust_risk = TrustRiskEngine(db_connect_func)
        self.location = LocationTrackingEngine(db_connect_func)

    async def create_session(
        self,
        user_id: str,
        device_info: Dict,
        location_info: Dict,
        ip_address: str
    ) -> Dict:
        """Create new authentication session"""

        # Generate device fingerprint
        device_fingerprint = self.device.generate_fingerprint(
            device_info.get("user_agent", ""),
            device_info.get("screen_width", 1920),
            device_info.get("screen_height", 1080),
            device_info.get("timezone", "UTC"),
            device_info.get("language", "en"),
            device_info.get("platform", "")
        )

        # Register or get device
        device_result = await self.device.register_device(
            user_id,
            device_fingerprint,
            device_info
        )

        device_id = device_result["device_id"]

        # Create session token
        session_token = str(uuid.uuid4())

        # Create session in database
        async with await self.db_connect() as conn:
            result = await conn.execute(
                """INSERT INTO user_sessions 
                   (user_id, session_token, device_id, ip_address, 
                    country, state_region, city, latitude, longitude,
                    trust_score, risk_score, created_at, expires_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), 
                           NOW() + INTERVAL '8 hours')
                   RETURNING id""",
                (user_id, session_token, device_id, ip_address,
                 location_info.get("country"), location_info.get("state"),
                 location_info.get("city"), location_info.get("latitude"),
                 location_info.get("longitude"), 50, 50)
            )
            session_id = (await result.fetchone())[0]

            # Create behavioral pattern record
            await conn.execute(
                """INSERT INTO behavioral_patterns 
                   (user_id, session_id, behavior_score)
                   VALUES (%s, %s, %s)""",
                (user_id, session_id, 50)
            )

            await conn.commit()

        # Record location
        await self.location.record_location(
            user_id, session_id, ip_address,
            location_info.get("country"),
            location_info.get("state"),
            location_info.get("city"),
            location_info.get("latitude"),
            location_info.get("longitude"),
            location_info.get("vpn_detected", False)
        )

        return {
            "session_id": session_id,
            "session_token": session_token,
            "device_id": device_id,
            "is_new_device": device_result["is_new"],
            "device_trust_score": device_result["trust_score"]
        }

    async def update_session_scores(
        self,
        user_id: str,
        session_id: int,
        device_id: int,
        device_info: Dict,
        behavioral_factors: Dict,
        location_info: Dict
    ) -> Dict:
        """Update trust and risk scores for active session"""

        # Get previous session location
        async with await self.db_connect() as conn:
            result = await conn.execute(
                "SELECT country, state_region FROM user_sessions WHERE id = %s",
                (session_id,)
            )
            prev_session = await result.fetchone()

        # Check for location change
        location_changed = (prev_session and
                          (prev_session[0] != location_info.get("country") or
                           prev_session[1] != location_info.get("state")))

        # Check for impossible travel
        impossible_travel = await self.location.detect_impossible_travel(
            user_id,
            location_info
        )

        # Prepare factors for trust calculation
        trust_factors = {
            "recent_successful_logins": behavioral_factors.get("successful_logins", 0),
            "device_trust_score": device_info.get("trust_score", 50),
            "behavior_consistency_score": behavioral_factors.get("behavior_score", 50),
            "session_duration_minutes": behavioral_factors.get("session_duration", 0),
            "browser_changed": device_info.get("browser_changed", False),
            "location_changed": location_changed
        }

        # Prepare factors for risk calculation
        risk_factors = {
            "is_new_device": device_info.get("is_new_device", False),
            "browser_changed": device_info.get("browser_changed", False),
            "ip_changed": behavioral_factors.get("ip_changed", False),
            "location_changed": location_changed,
            "keystroke_anomaly": behavioral_factors.get("keystroke_anomaly", False),
            "navigation_anomaly": behavioral_factors.get("navigation_anomaly", False),
            "recent_failed_attempts": behavioral_factors.get("failed_attempts", 0),
            "idle_time_minutes": behavioral_factors.get("idle_time", 0),
            "vpn_detected": location_info.get("vpn_detected", False),
            "impossible_travel_detected": impossible_travel.get("impossible_travel_detected", False)
        }

        # Calculate scores
        trust_result = await self.trust_risk.calculate_trust_score(
            user_id, session_id, device_id, trust_factors
        )

        risk_result = await self.trust_risk.calculate_risk_score(
            user_id, session_id, device_id, risk_factors
        )

        # Check if MFA should be triggered
        mfa_check = await self.trust_risk.should_trigger_mfa(
            trust_result["trust_score"],
            risk_result["risk_score"],
            device_info.get("is_new_device", False),
            device_info.get("browser_changed", False),
            location_changed
        )

        # Evaluate Zero Trust Policy
        policy_result = await self.trust_risk.evaluate_zero_trust_policy(
            user_id,
            session_id,
            trust_result["trust_score"],
            risk_result["risk_score"]
        )

        # Log authentication event
        await self._log_auth_event(
            user_id, session_id, device_id, "score_update",
            f"Trust: {trust_result['trust_score']}, Risk: {risk_result['risk_score']}"
        )

        return {
            "trust_score": trust_result["trust_score"],
            "risk_score": risk_result["risk_score"],
            "risk_level": risk_result["risk_level"],
            "should_trigger_mfa": mfa_check["should_trigger_mfa"],
            "mfa_reason": mfa_check["reason"],
            "policy_decision": policy_result["policy_decision"],
            "access_level": policy_result["access_level"],
            "action_required": policy_result["action_required"],
            "impossible_travel": impossible_travel
        }

    async def get_session_status(
        self,
        session_id: int
    ) -> Dict:
        """Get current session status"""
        async with await self.db_connect() as conn:
            result = await conn.execute(
                """SELECT user_id, session_token, device_id, trust_score, risk_score,
                          created_at, last_activity, is_active, expires_at
                   FROM user_sessions WHERE id = %s""",
                (session_id,)
            )
            session = await result.fetchone()

            if not session:
                return {"error": "Session not found"}

            return {
                "session_id": session_id,
                "user_id": str(session[0]),
                "device_id": session[2],
                "trust_score": session[3],
                "risk_score": session[4],
                "created_at": session[5].isoformat(),
                "last_activity": session[6].isoformat() if session[6] else None,
                "is_active": session[7],
                "expires_at": session[8].isoformat()
            }

    async def end_session(
        self,
        session_id: int
    ) -> Dict:
        """End authentication session"""
        async with await self.db_connect() as conn:
            await conn.execute(
                "UPDATE user_sessions SET is_active = FALSE WHERE id = %s",
                (session_id,)
            )
            await conn.commit()

        return {"status": "Session ended"}

    async def _log_auth_event(
        self,
        user_id: str,
        session_id: int,
        device_id: int,
        event_type: str,
        event_detail: str,
        success: bool = True
    ) -> None:
        """Log authentication event for audit"""
        async with await self.db_connect() as conn:
            # Get session IP
            result = await conn.execute(
                "SELECT ip_address FROM user_sessions WHERE id = %s",
                (session_id,)
            )
            session = await result.fetchone()
            ip_address = session[0] if session else None

            await conn.execute(
                """INSERT INTO authentication_events 
                   (user_id, event_type, event_detail, ip_address, device_id, session_id, success)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (user_id, event_type, event_detail, ip_address, device_id, session_id, success)
            )
            await conn.commit()
