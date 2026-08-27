"""
Behavioral Analysis Engine for Continuous Authentication
Analyzes user behavioral patterns including keystroke dynamics, mouse kinematics, and session activity.
"""

import math
from typing import Optional, Dict, List, Tuple, Any
from datetime import datetime


class BehavioralAnalysisEngine:
    """Analyzes software-based behavioral signals for continuous Zero Trust authentication"""

    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func

    async def ingest_behavior_batch(
        self,
        user_id: str,
        session_id: int,
        telemetry: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process a comprehensive batch of real-time behavioral telemetry"""

        keystroke_speed = float(telemetry.get("keystroke_speed", 0.0))
        keystroke_variance = float(telemetry.get("keystroke_variance", 0.0))
        mouse_speed = float(telemetry.get("mouse_speed", 0.0))
        mouse_distance = float(telemetry.get("mouse_distance", 0.0))
        click_count = int(telemetry.get("click_count", 0))
        scroll_count = int(telemetry.get("scroll_count", 0))
        idle_seconds = int(telemetry.get("idle_seconds", 0))
        time_on_page = float(telemetry.get("time_on_page", 15.0))

        async with self.db_connect() as conn:
            # Check if behavioral pattern row exists for this session
            res = await conn.execute(
                "SELECT id, keystroke_speed_avg, mouse_speed_avg, click_frequency, scroll_events FROM behavioral_patterns WHERE session_id = %s",
                (session_id,)
            )
            existing = await res.fetchone()

            if existing:
                # Update existing session averages
                await conn.execute(
                    """UPDATE behavioral_patterns
                       SET keystroke_speed_avg = (%s + COALESCE(keystroke_speed_avg, 0)) / 2.0,
                           keystroke_speed_variance = %s,
                           mouse_speed_avg = (%s + COALESCE(mouse_speed_avg, 0)) / 2.0,
                           mouse_distance_traveled = COALESCE(mouse_distance_traveled, 0) + %s,
                           click_frequency = COALESCE(click_frequency, 0) + %s,
                           scroll_events = COALESCE(scroll_events, 0) + %s,
                           idle_time_seconds = %s,
                           time_on_page_avg = COALESCE(time_on_page_avg, 0) + %s
                       WHERE session_id = %s""",
                    (keystroke_speed, keystroke_variance, mouse_speed, mouse_distance,
                     click_count, scroll_count, idle_seconds, time_on_page, session_id)
                )
            else:
                # Create initial pattern row
                await conn.execute(
                    """INSERT INTO behavioral_patterns
                       (user_id, session_id, keystroke_speed_avg, keystroke_speed_variance,
                        mouse_speed_avg, mouse_distance_traveled, click_frequency, scroll_events,
                        idle_time_seconds, time_on_page_avg, behavior_score)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 50.0)""",
                    (user_id, session_id, keystroke_speed, keystroke_variance,
                     mouse_speed, mouse_distance, click_count, scroll_count,
                     idle_seconds, time_on_page)
                )
            await conn.commit()

        # Run anomaly analysis against user baseline
        analysis = await self.analyze_behavioral_anomaly(user_id, session_id)
        return analysis

    async def analyze_behavioral_anomaly(
        self,
        user_id: str,
        session_id: int
    ) -> Dict[str, Any]:
        """Analyze current session behavior against user historical baseline"""
        async with self.db_connect() as conn:
            # 1. Get current session metrics
            result = await conn.execute(
                """SELECT keystroke_speed_avg, keystroke_speed_variance, mouse_speed_avg, 
                          mouse_distance_traveled, click_frequency, scroll_events, idle_time_seconds
                   FROM behavioral_patterns WHERE session_id = %s""",
                (session_id,)
            )
            current = await result.fetchone()

            if not current:
                return {
                    "anomaly_score": 0.0,
                    "is_anomalous": False,
                    "keystroke_anomaly": False,
                    "mouse_anomaly": False,
                    "deviations": {}
                }

            # 2. Get user baseline (average of past 10 sessions)
            baseline_result = await conn.execute(
                """SELECT AVG(keystroke_speed_avg), AVG(mouse_speed_avg), 
                          AVG(click_frequency), AVG(scroll_events)
                   FROM (
                       SELECT keystroke_speed_avg, mouse_speed_avg, click_frequency, scroll_events
                       FROM behavioral_patterns 
                       WHERE user_id = %s AND session_id != %s
                       ORDER BY id DESC LIMIT 10
                   ) sub_query""",
                (user_id, session_id)
            )
            baseline = await baseline_result.fetchone()

            # If no prior baseline exists, use sensible dynamic system defaults
            base_ks = float(baseline[0]) if baseline and baseline[0] is not None else 3.5  # chars/sec
            base_ms = float(baseline[1]) if baseline and baseline[1] is not None else 450.0  # px/sec
            base_cf = float(baseline[2]) if baseline and baseline[2] is not None else 12.0  # clicks/min
            base_se = float(baseline[3]) if baseline and baseline[3] is not None else 8.0   # scrolls/min

            cur_ks = float(current[0] or 0.0)
            cur_ms = float(current[2] or 0.0)
            cur_cf = float(current[4] or 0.0)
            cur_se = float(current[5] or 0.0)
            cur_idle = int(current[6] or 0)

            # Compute metric deviations (percentage difference from baseline)
            ks_dev = (abs(cur_ks - base_ks) / max(base_ks, 0.5)) * 100.0 if cur_ks > 0 else 0.0
            ms_dev = (abs(cur_ms - base_ms) / max(base_ms, 50.0)) * 100.0 if cur_ms > 0 else 0.0
            cf_dev = (abs(cur_cf - base_cf) / max(base_cf, 1.0)) * 100.0 if cur_cf > 0 else 0.0
            se_dev = (abs(cur_se - base_se) / max(base_se, 1.0)) * 100.0 if cur_se > 0 else 0.0

            # Identify specific anomalies
            keystroke_anomaly = ks_dev > 65.0 and cur_ks > 0
            mouse_anomaly = ms_dev > 75.0 and cur_ms > 0

            # Composite anomaly score (0-100)
            deviations_list = [d for d in [ks_dev, ms_dev, cf_dev, se_dev] if d > 0]
            if deviations_list:
                composite_dev = sum(deviations_list) / len(deviations_list)
            else:
                composite_dev = 10.0  # Normal baseline noise

            # Idle time impact
            if cur_idle > 600:  # 10 min idle
                composite_dev += min(30.0, (cur_idle / 60) * 2.0)

            anomaly_score = round(min(100.0, max(0.0, composite_dev)), 1)
            is_anomalous = anomaly_score > 60.0
            behavior_score = round(max(0.0, 100.0 - anomaly_score), 1)

            # Update behavioral pattern record
            await conn.execute(
                """UPDATE behavioral_patterns 
                   SET behavior_score = %s,
                       pattern_anomaly_detected = %s
                   WHERE session_id = %s""",
                (behavior_score, is_anomalous, session_id)
            )
            await conn.commit()

            return {
                "anomaly_score": anomaly_score,
                "behavior_score": behavior_score,
                "is_anomalous": is_anomalous,
                "keystroke_anomaly": keystroke_anomaly,
                "mouse_anomaly": mouse_anomaly,
                "deviations": {
                    "keystroke_deviation_percent": round(ks_dev, 1),
                    "mouse_deviation_percent": round(ms_dev, 1),
                    "click_deviation_percent": round(cf_dev, 1),
                    "scroll_deviation_percent": round(se_dev, 1)
                },
                "current_metrics": {
                    "keystroke_speed": cur_ks,
                    "mouse_speed": cur_ms,
                    "click_count": cur_cf,
                    "idle_seconds": cur_idle
                },
                "baseline_metrics": {
                    "keystroke_speed": round(base_ks, 2),
                    "mouse_speed": round(base_ms, 2),
                    "click_count": round(base_cf, 1)
                }
            }

    async def get_behavioral_profile(self, user_id: str) -> Dict[str, Any]:
        """Get summarized behavioral profile for a user"""
        async with self.db_connect() as conn:
            result = await conn.execute(
                """SELECT 
                       AVG(keystroke_speed_avg),
                       AVG(mouse_speed_avg),
                       AVG(click_frequency),
                       AVG(scroll_events),
                       COUNT(*)
                   FROM behavioral_patterns 
                   WHERE user_id = %s""",
                (user_id,)
            )
            profile = await result.fetchone()

            return {
                "keystroke_speed_avg": round(float(profile[0] or 3.2), 2),
                "mouse_speed_avg": round(float(profile[1] or 420.0), 2),
                "click_frequency_avg": round(float(profile[2] or 10.0), 1),
                "scroll_events_avg": round(float(profile[3] or 6.0), 1),
                "sessions_analyzed": int(profile[4] or 0)
            }
