"""
Unified Security Event Pipeline for Adaptive Zero Trust AI Framework
Coordinates:
User Action -> Auth / MFA -> Telemetry -> Risk Evaluation -> XAI Explanation ->
Zero-Trust Policy -> Hybrid Cloud Gateway -> ALLOW / CHALLENGE / DENY ->
Policy Audit -> Threat Intelligence -> Dashboard / Monitoring
"""

import uuid
import json
from datetime import datetime
from typing import Dict, Any, Optional, List


class SecurityEventPipeline:
    """Unified pipeline orchestrator enforcing end-to-end security consistency"""

    def __init__(self, db_connect_func, trust_risk_engine, xai_service, policy_engine, hybrid_cloud_service):
        self.db_connect = db_connect_func
        self.trust_risk = trust_risk_engine
        self.xai = xai_service
        self.policy = policy_engine
        self.hybrid_cloud = hybrid_cloud_service

    async def evaluate_pipeline_event(
        self,
        user_id: str,
        session_id: Optional[int],
        action_type: str,
        resource_id: str = "core-service",
        destination_environment: str = "public",
        telemetry: Optional[Dict[str, Any]] = None,
        device_info: Optional[Dict[str, Any]] = None,
        location_info: Optional[Dict[str, Any]] = None,
        mfa_status: str = "VERIFIED",
        is_simulation: bool = False
    ) -> Dict[str, Any]:
        """
        Executes the full unified pipeline for an authentication or protected access action.
        """
        telemetry = telemetry or {}
        device_info = device_info or {}
        location_info = location_info or {}
        now_iso = datetime.utcnow().isoformat()
        event_id = f"evt-{uuid.uuid4().hex[:12]}"

        # 1. Fetch current user context
        async with self.db_connect() as conn:
            user_res = await conn.execute(
                "SELECT id, email, name, role, secure_pin_configured, mfa_enabled FROM users WHERE id = %s",
                (user_id,)
            )
            user_row = await user_res.fetchone()
            db_user_id = user_row[0] if user_row else None
            user_email = str(user_row[1]) if user_row else "unknown@zerotrust.ai"
            user_role = str(user_row[3] or "operator") if user_row else "operator"

            # 2. Risk Evaluation Signals
            is_new_device = bool(device_info.get("is_new_device", False))
            failed_attempts = int(telemetry.get("failed_attempts", 0))
            idle_seconds = int(telemetry.get("idle_seconds", 0))
            ai_anomaly_score = float(telemetry.get("ai_anomaly_score", 0.0))
            keystroke_anomaly = bool(telemetry.get("keystroke_anomaly", False))
            mouse_anomaly = bool(telemetry.get("mouse_anomaly", False))

            risk_factors = {
                "is_new_device": is_new_device,
                "browser_changed": bool(device_info.get("browser_changed", False)),
                "location_changed": bool(location_info.get("location_changed", False)),
                "ip_changed": bool(telemetry.get("ip_changed", False)),
                "keystroke_anomaly": keystroke_anomaly,
                "mouse_anomaly": mouse_anomaly,
                "ai_anomaly_score": ai_anomaly_score,
                "recent_failed_attempts": failed_attempts,
                "idle_time_seconds": idle_seconds,
                "vpn_detected": bool(location_info.get("vpn_detected", False)),
                "impossible_travel_detected": bool(location_info.get("impossible_travel_detected", False)),
                "pin_verified": mfa_status in ("VERIFIED", "COMPLETED")
            }

            trust_factors = {
                "recent_successful_logins": 2 if failed_attempts == 0 else 0,
                "device_trust_score": float(device_info.get("device_trust_score", 85.0 if not is_new_device else 45.0)),
                "behavior_consistency_score": float(telemetry.get("behavior_score", 75.0 if not keystroke_anomaly else 35.0)),
                "session_duration_minutes": float(telemetry.get("session_duration_minutes", 2.0)),
                "pin_verified": mfa_status in ("VERIFIED", "COMPLETED")
            }

            # Calculate scores
            risk_res = await self.trust_risk.calculate_risk_score(user_id, session_id or 1, None, risk_factors)
            trust_res = await self.trust_risk.calculate_trust_score(user_id, session_id or 1, None, trust_factors)

            risk_score = risk_res["risk_score"]
            risk_level = risk_res["risk_level"]
            trust_score = trust_res["trust_score"]
            confidence_score = self.trust_risk.calculate_confidence_score(trust_score, risk_score)

            # 3. Explainable AI (XAI)
            xai_features = {
                "keystroke_speed": telemetry.get("keystroke_speed", 3.8),
                "mouse_speed": telemetry.get("mouse_speed", 450.0),
                "device_trust": trust_factors["device_trust_score"],
                "browser_changed": risk_factors["browser_changed"],
                "location_changed": risk_factors["location_changed"],
                "ai_anomaly_score": ai_anomaly_score,
                "failed_attempts": failed_attempts,
                "idle_seconds": idle_seconds,
                "vpn_detected": risk_factors["vpn_detected"]
            }

            xai_contributions = self.xai.compute_feature_contributions(xai_features, risk_score=risk_score)
            dominant_factor = xai_contributions[0]["feature"] if xai_contributions else "baseline_behavior"

            # 4. Zero-Trust Policy Decision
            is_private = destination_environment.lower() == "private"
            policy_version = "v2.0.0"

            if risk_score >= 80.0 or risk_factors["impossible_travel_detected"] or failed_attempts >= 5:
                gateway_decision = "DENY"
                reason = f"Critical risk ({risk_score:.1f}/100) or severe security anomaly detected."
                recommended_action = "TERMINATE_SESSION_AND_ALERT"
            elif risk_score >= (40.0 if is_private else 60.0) or is_new_device or mfa_status != "VERIFIED":
                gateway_decision = "CHALLENGE"
                reason = f"Elevated risk ({risk_score:.1f}/100) or unverified device requires Step-Up Secret PIN."
                recommended_action = "REQUIRE_STEP_UP_PIN"
            else:
                gateway_decision = "ALLOW"
                reason = f"Normal risk ({risk_score:.1f}/100) and healthy trust ({trust_score:.1f}/100) satisfied Zero-Trust requirements."
                recommended_action = "CONTINUE_MONITORING"

            # Explanation object
            explanation_payload = {
                "decision": gateway_decision,
                "risk_score": risk_score,
                "trust_score": trust_score,
                "confidence_score": confidence_score,
                "dominant_risk_factor": dominant_factor,
                "contributing_factors": [
                    {
                        "feature": c["feature"],
                        "contribution_percent": c["contribution_percent"],
                        "direction": c["direction"],
                        "shap_value": c["shap_value"],
                        "observed_value": c["observed_value"]
                    }
                    for c in xai_contributions[:4]
                ],
                "recommended_action": recommended_action,
                "ai_model_version": "XAI-IsolationForest-GBM-v2.1",
                "policy_version": policy_version,
                "architecture_layer": f"Hybrid Gateway ({destination_environment.upper()})"
            }

            # 5. Store XAI Decision Record
            xai_id = str(uuid.uuid4())
            await conn.execute(
                """INSERT INTO xai_decision_records
                   (id, event_id, user_id, session_id, model_version, input_features,
                    risk_score, confidence_score, prediction, explanation, decision,
                    dominant_risk_factor, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())""",
                (xai_id, event_id, user_id, session_id, "XAI-IsolationForest-GBM-v2.1",
                 xai_features, risk_score, confidence_score,
                 "ANOMALOUS" if risk_score >= 60 else "NORMAL",
                 explanation_payload, gateway_decision, dominant_factor)
            )

            # 6. Store Hybrid Cloud Gateway Request Record
            gw_id = str(uuid.uuid4())
            endpoint_url = f"https://{resource_id}.internal" if is_private else f"https://{resource_id}.cloud.zerotrust.io"
            await conn.execute(
                """INSERT INTO gateway_requests
                   (id, user_id, session_id, resource_id, resource_name,
                    destination_environment, endpoint_url, identity_verified,
                    mfa_status, device_trust_score, risk_score, policy_result,
                    gateway_decision, latency_ms, status_code, is_simulation, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())""",
                (gw_id, user_id, session_id, resource_id, resource_id.replace('-', ' ').title(),
                 destination_environment, endpoint_url, True, mfa_status,
                 trust_factors["device_trust_score"], risk_score, gateway_decision,
                 gateway_decision, 24.5 if is_private else 46.2,
                 200 if gateway_decision == "ALLOW" else (403 if gateway_decision == "CHALLENGE" else 401),
                 is_simulation)
            )

            # 7. Store Policy Audit Log (Auditing Integrity)
            audit_id = str(uuid.uuid4())
            await conn.execute(
                """INSERT INTO policy_audit_logs
                   (id, timestamp, user_id, session_id, requested_resource,
                    policy_id, policy_name, policy_version, input_context,
                    risk_score, decision, reason, mfa_status, device_status,
                    gateway_environment, result, created_at)
                   VALUES (%s, NOW(), %s, %s, %s, 1, 'Default Zero Trust Access Policy',
                           %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())""",
                (audit_id, user_id, session_id, resource_id, policy_version,
                 {"action": action_type, "signals": risk_factors},
                 risk_score, gateway_decision, reason, mfa_status,
                 "TRUSTED" if not is_new_device else "UNRECOGNIZED",
                 destination_environment, gateway_decision)
            )

            # 8. Standard Audit Log
            await conn.execute(
                """INSERT INTO audit_logs
                   (id, user_id, action_type, resource_type, resource_id,
                    details, status, risk_level, trust_level, ip_address, is_simulation, created_at)
                   VALUES (%s, %s, %s, 'RESOURCE', %s, %s, %s, %s, %s, %s, %s, NOW())""",
                (str(uuid.uuid4()), db_user_id, action_type, resource_id,
                 {
                     "gateway_decision": gateway_decision,
                     "risk_score": risk_score,
                     "trust_score": trust_score,
                     "destination": destination_environment,
                     "mfa_status": mfa_status,
                     "reason": reason,
                     "is_simulation": is_simulation
                 },
                 "SUCCESS" if gateway_decision == "ALLOW" else ("CHALLENGED" if gateway_decision == "CHALLENGE" else "DENIED"),
                 risk_level, trust_res["trust_level"],
                 telemetry.get("ip_address", "127.0.0.1"),
                 is_simulation)
            )

            # 9. Threat Intelligence tracking (if anomalous or high-risk)
            if risk_score >= 60.0 or gateway_decision in ("CHALLENGE", "DENY") or failed_attempts >= 3:
                threat_id = str(uuid.uuid4())
                indicator_type = (
                    "IMPOSSIBLE_TRAVEL" if risk_factors["impossible_travel_detected"] else
                    ("BRUTE_FORCE_SUSPECT" if failed_attempts >= 3 else
                     ("BEHAVIORAL_ANOMALY" if (keystroke_anomaly or mouse_anomaly or ai_anomaly_score > 50) else
                      "UNRECOGNIZED_DEVICE_STEP_UP"))
                )
                await conn.execute(
                    """INSERT INTO threat_indicators
                       (id, indicator_type, severity, user_id, session_id, source_ip, details, status, detected_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, 'ACTIVE', NOW())""",
                    (threat_id, indicator_type, risk_level, user_id, session_id,
                     telemetry.get("ip_address", "127.0.0.1"),
                     {"reason": reason, "dominant_factor": dominant_factor, "risk_score": risk_score})
                )

            await conn.commit()

        return {
            "event_id": event_id,
            "user_id": user_id,
            "session_id": session_id,
            "action_type": action_type,
            "requested_resource": resource_id,
            "destination_environment": destination_environment,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "trust_score": trust_score,
            "trust_level": trust_res["trust_level"],
            "confidence_score": confidence_score,
            "gateway_decision": gateway_decision,
            "decision": gateway_decision,
            "recommended_action": recommended_action,
            "reason": reason,
            "mfa_status": mfa_status,
            "explanation": explanation_payload,
            "audit_id": audit_id,
            "is_simulation": is_simulation,
            "timestamp": now_iso
        }
