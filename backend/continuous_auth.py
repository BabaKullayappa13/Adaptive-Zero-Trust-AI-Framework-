"""
Continuous Authentication Orchestrator for Adaptive Zero Trust AI Framework
Coordinates real-time behavioral monitoring, device trust, adaptive risk scoring, and step-up challenges.
"""

from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta
import uuid

from behavioral_analysis import BehavioralAnalysisEngine
from device_fingerprint import DeviceFingerprintEngine
from trust_risk_engine import TrustRiskEngine
from location_tracking import LocationTrackingEngine


class ContinuousAuthenticationOrchestrator:
    """Coordinates real-time continuous authentication and dynamic Zero Trust evaluation"""

    def __init__(self, db_connect_func, anomaly_detector=None):
        self.db_connect = db_connect_func
        self.behavioral = BehavioralAnalysisEngine(db_connect_func)
        self.device = DeviceFingerprintEngine(db_connect_func)
        self.trust_risk = TrustRiskEngine(db_connect_func)
        self.location = LocationTrackingEngine(db_connect_func)
        self.anomaly_detector = anomaly_detector

    async def create_session(
        self,
        user_id: str,
        device_info: Dict[str, Any],
        location_info: Dict[str, Any],
        ip_address: str
    ) -> Dict[str, Any]:
        """Create a new continuous authentication session"""

        # 1. Generate device profile fingerprint
        device_fingerprint = self.device.generate_fingerprint(
            user_agent=device_info.get("user_agent", ""),
            screen_width=device_info.get("screen_width", 1920),
            screen_height=device_info.get("screen_height", 1080),
            timezone=device_info.get("timezone", "UTC"),
            language=device_info.get("language", "en"),
            platform=device_info.get("platform", "")
        )

        # 2. Register or retrieve device
        device_result = await self.device.register_device(
            user_id=user_id,
            device_fingerprint=device_fingerprint,
            device_info=device_info
        )
        device_id = device_result["device_id"]

        # 3. Create session in database
        session_token = str(uuid.uuid4())
        initial_trust = 75.0 if not device_result["is_new"] else 55.0
        initial_risk = 15.0 if not device_result["is_new"] else 30.0

        async with self.db_connect() as conn:
            await conn.execute(
                """INSERT INTO user_sessions 
                   (user_id, session_token, device_id, ip_address, 
                    country, state_region, city, latitude, longitude,
                    trust_score, risk_score, is_active, step_up_required, created_at, last_activity)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, FALSE, NOW(), NOW())""",
                (user_id, session_token, device_id, ip_address,
                 location_info.get("country", "United States"),
                 location_info.get("state", "California"),
                 location_info.get("city", "San Francisco"),
                 location_info.get("latitude", 37.7749),
                 location_info.get("longitude", -122.4194),
                 initial_trust, initial_risk)
            )

            # Get session ID
            res = await conn.execute(
                "SELECT id FROM user_sessions WHERE session_token = %s",
                (session_token,)
            )
            row = await res.fetchone()
            session_id = int(row[0]) if row else 1

            # Initialize initial behavioral pattern record
            await conn.execute(
                """INSERT INTO behavioral_patterns 
                   (user_id, session_id, behavior_score, created_at)
                   VALUES (%s, %s, 70.0, NOW())""",
                (user_id, session_id)
            )
            await conn.commit()

        # Record location
        await self.location.record_location(
            user_id=user_id,
            session_id=session_id,
            ip_address=ip_address,
            country=location_info.get("country", "United States"),
            state_region=location_info.get("state", "California"),
            city=location_info.get("city", "San Francisco"),
            latitude=location_info.get("latitude", 37.7749),
            longitude=location_info.get("longitude", -122.4194),
            is_vpn=location_info.get("vpn_detected", False)
        )

        return {
            "session_id": session_id,
            "session_token": session_token,
            "device_id": device_id,
            "is_new_device": device_result["is_new"],
            "trust_score": initial_trust,
            "risk_score": initial_risk,
            "step_up_required": False
        }

    async def process_continuous_telemetry(
        self,
        user_id: str,
        session_id: int,
        telemetry: Dict[str, Any],
        device_info: Dict[str, Any],
        location_info: Dict[str, Any],
        ip_address: str
    ) -> Dict[str, Any]:
        """Process incoming client behavioral telemetry batch and re-evaluate session trust/risk"""

        # 1. Behavioral Analysis
        behavior_analysis = await self.behavioral.ingest_behavior_batch(
            user_id=user_id,
            session_id=session_id,
            telemetry=telemetry
        )

        # 2. Check Device & Location
        device_fingerprint = self.device.generate_fingerprint(
            user_agent=device_info.get("user_agent", ""),
            screen_width=device_info.get("screen_width", 1920),
            screen_height=device_info.get("screen_height", 1080),
            timezone=device_info.get("timezone", "UTC"),
            language=device_info.get("language", "en"),
            platform=device_info.get("platform", "")
        )
        device_record = await self.device.register_device(user_id, device_fingerprint, device_info)
        device_id = device_record["device_id"]

        # Check impossible travel
        travel_check = await self.location.detect_impossible_travel(user_id, location_info)

        # 3. AI / ML Anomaly Detection (Isolation Forest)
        ai_anomaly_score = 0.0
        if self.anomaly_detector is not None:
            try:
                import numpy as np
                feature_vector = np.array([
                    float(telemetry.get("keystroke_speed", 3.5)),
                    float(telemetry.get("keystroke_variance", 0.1)),
                    float(telemetry.get("mouse_speed", 450.0)),
                    float(telemetry.get("mouse_distance", 300.0)),
                    float(telemetry.get("click_count", 5)),
                    float(telemetry.get("scroll_count", 3)),
                    float(telemetry.get("idle_seconds", 0)),
                    float(device_record.get("trust_score", 50.0)),
                    10.0 if not travel_check.get("impossible_travel") else 95.0
                ])
                detector_res = self.anomaly_detector.predict_anomaly(feature_vector)
                ai_anomaly_score = float(detector_res.get("anomaly_score", 0.0))
            except Exception as e:
                print(f"[ContinuousAuth] ML prediction error: {e}")

        # 4. Prepare factors for dynamic trust & risk engines
        risk_factors = {
            "is_new_device": device_record.get("is_new", False),
            "browser_changed": device_info.get("browser_changed", False),
            "ip_changed": telemetry.get("ip_changed", False),
            "location_changed": location_info.get("location_changed", False),
            "keystroke_anomaly": behavior_analysis.get("keystroke_anomaly", False),
            "keystroke_deviation_percent": behavior_analysis.get("deviations", {}).get("keystroke_deviation_percent", 0.0),
            "mouse_anomaly": behavior_analysis.get("mouse_anomaly", False),
            "mouse_deviation_percent": behavior_analysis.get("deviations", {}).get("mouse_deviation_percent", 0.0),
            "ai_anomaly_score": ai_anomaly_score,
            "idle_time_seconds": telemetry.get("idle_seconds", 0),
            "vpn_detected": location_info.get("vpn_detected", False),
            "impossible_travel_detected": travel_check.get("impossible_travel", False),
            "recent_failed_attempts": 0
        }

        trust_factors = {
            "recent_successful_logins": 2,
            "device_trust_score": device_record.get("trust_score", 50.0),
            "behavior_consistency_score": behavior_analysis.get("behavior_score", 60.0),
            "session_duration_minutes": float(telemetry.get("session_duration_minutes", 1.0)),
            "browser_changed": device_info.get("browser_changed", False),
            "location_changed": location_info.get("location_changed", False),
            "ai_anomaly_score": ai_anomaly_score,
            "pin_verified": False
        }

        # 5. Compute scores
        risk_res = await self.trust_risk.calculate_risk_score(user_id, session_id, device_id, risk_factors)
        trust_res = await self.trust_risk.calculate_trust_score(user_id, session_id, device_id, trust_factors)

        risk_score = risk_res["risk_score"]
        trust_score = trust_res["trust_score"]

        # 6. Evaluate Zero Trust Policy
        policy_res = await self.trust_risk.evaluate_zero_trust_policy(
            user_id=user_id,
            session_id=session_id,
            trust_score=trust_score,
            risk_score=risk_score
        )

        confidence_score = self.trust_risk.calculate_confidence_score(trust_score, risk_score)
        step_up_required = policy_res["action_required"] == "require_secret_pin" or risk_score >= 60.0
        session_terminated = policy_res["action_required"] == "terminate_session" or risk_score >= 80.0

        # Update session activity timestamp
        async with self.db_connect() as conn:
            await conn.execute(
                """UPDATE user_sessions 
                   SET trust_score = %s, risk_score = %s, step_up_required = %s,
                       is_active = %s, last_activity = NOW()
                   WHERE id = %s""",
                (trust_score, risk_score, bool(step_up_required),
                 bool(not session_terminated), session_id)
            )
            await conn.commit()

        return {
            "session_id": session_id,
            "trust_score": trust_score,
            "trust_level": trust_res["trust_level"],
            "risk_score": risk_score,
            "risk_level": risk_res["risk_level"],
            "confidence_score": confidence_score,
            "policy_decision": policy_res["decision"],
            "step_up_required": step_up_required,
            "session_terminated": session_terminated,
            "behavior_summary": behavior_analysis,
            "ai_anomaly_score": ai_anomaly_score,
            "contributing_factors": risk_factors
        }

    async def verify_step_up(
        self,
        user_id: str,
        session_id: int,
        secret_pin: Optional[str] = None,
        totp_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """Verify Secret PIN or TOTP for step-up authentication during an active session"""
        from security import verify_secret_pin, verify_totp

        async with self.db_connect() as conn:
            res = await conn.execute(
                "SELECT pin_hash, mfa_secret, mfa_enabled, email FROM users WHERE id = %s",
                (user_id,)
            )
            user_row = await res.fetchone()
            if not user_row:
                return {"success": False, "detail": "User not found"}

            pin_hash, mfa_secret, mfa_enabled, email = user_row
            verified = False

            if secret_pin and pin_hash:
                verified = verify_secret_pin(secret_pin, pin_hash)
            elif totp_code and mfa_secret:
                verified = verify_totp(mfa_secret, totp_code)

            if not verified:
                # Log failed step-up
                import uuid
                await conn.execute(
                    """INSERT INTO audit_logs 
                       (id, user_id, action_type, status, risk_level, trust_level, created_at)
                       VALUES (%s, %s, %s, %s, %s, %s, NOW())""",
                    (str(uuid.uuid4()), user_id, "STEP_UP_VERIFICATION_FAILED", "FAILURE", "HIGH", "SUSPICIOUS")
                )
                await conn.commit()
                return {"success": False, "detail": "Incorrect Secret PIN or MFA code"}

            # Success: clear step-up requirement and restore healthy trust score
            await conn.execute(
                """UPDATE user_sessions 
                   SET step_up_required = FALSE, trust_score = 85.0, risk_score = 15.0, last_activity = NOW()
                   WHERE id = %s""",
                (session_id,)
            )

            # Log audit record
            import uuid
            await conn.execute(
                """INSERT INTO audit_logs 
                   (id, user_id, action_type, status, risk_level, trust_level, details, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())""",
                (str(uuid.uuid4()), user_id, "STEP_UP_VERIFICATION_SUCCESS", "SUCCESS", "LOW", "TRUSTED",
                 {"method": "SECRET_PIN" if secret_pin else "TOTP", "session_id": session_id})
            )
            await conn.commit()

            return {
                "success": True,
                "detail": "Step-up authentication successful. Trust restored.",
                "trust_score": 85.0,
                "risk_score": 15.0,
                "step_up_required": False
            }

    async def get_session_status(self, user_id: str, session_id: int) -> Dict[str, Any]:
        """Get live continuous authentication status for a user session"""
        async with self.db_connect() as conn:
            res = await conn.execute(
                """SELECT trust_score, risk_score, is_active, step_up_required, last_activity, ip_address 
                   FROM user_sessions 
                   WHERE id = %s AND user_id = %s""",
                (session_id, user_id)
            )
            row = await res.fetchone()
            if not row:
                return {"active": False, "detail": "Session not found"}

            trust_score = float(row[0] or 50.0)
            risk_score = float(row[1] or 50.0)
            is_active = bool(row[2])
            step_up_required = bool(row[3])
            last_activity = str(row[4] or "")
            ip_address = str(row[5] or "")

            # Get recent behavioral profile
            b_res = await conn.execute(
                """SELECT keystroke_speed_avg, mouse_speed_avg, click_frequency, scroll_events, behavior_score 
                   FROM behavioral_patterns 
                   WHERE session_id = %s""",
                (session_id,)
            )
            b_row = await b_res.fetchone()

            behavior_data = {
                "keystroke_speed": float(b_row[0] or 0.0) if b_row else 0.0,
                "mouse_speed": float(b_row[1] or 0.0) if b_row else 0.0,
                "click_frequency": int(b_row[2] or 0) if b_row else 0,
                "scroll_events": int(b_row[3] or 0) if b_row else 0,
                "behavior_score": float(b_row[4] or 50.0) if b_row else 50.0
            }

            confidence = self.trust_risk.calculate_confidence_score(trust_score, risk_score)

            return {
                "session_id": session_id,
                "is_active": is_active,
                "step_up_required": step_up_required,
                "trust_score": trust_score,
                "risk_score": risk_score,
                "confidence_score": confidence,
                "last_activity": last_activity,
                "ip_address": ip_address,
                "behavior": behavior_data
            }
