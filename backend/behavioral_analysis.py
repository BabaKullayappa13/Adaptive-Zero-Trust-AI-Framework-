"""
Behavioral Analysis Engine for Continuous Authentication
Analyzes user behavior patterns including keystroke dynamics, mouse patterns, and navigation
"""

import asyncio
from typing import Optional, Dict, List, Tuple
from datetime import datetime, timedelta
import math
import psycopg


class BehavioralAnalysisEngine:
    """Analyzes behavioral patterns for continuous authentication"""

    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func
        self.keystroke_baseline = {}
        self.mouse_baseline = {}
        self.navigation_baseline = {}

    async def record_keystroke_event(
        self,
        user_id: str,
        session_id: int,
        duration_ms: float,
        character_count: int
    ) -> Dict:
        """Record keystroke event and analyze speed"""
        if character_count == 0:
            return {"error": "Invalid keystroke data"}

        keystroke_speed = character_count / (duration_ms / 1000) if duration_ms > 0 else 0

        # Store keystroke event
        async with await self.db_connect() as conn:
            await conn.execute(
                """UPDATE behavioral_patterns 
                   SET keystroke_speed_avg = COALESCE(keystroke_speed_avg, 0) + %s
                   WHERE session_id = %s""",
                (keystroke_speed, session_id)
            )
            await conn.commit()

        return {
            "keystroke_speed": keystroke_speed,
            "characters_per_second": character_count / (duration_ms / 1000) if duration_ms > 0 else 0
        }

    async def record_mouse_event(
        self,
        user_id: str,
        session_id: int,
        start_x: int,
        start_y: int,
        end_x: int,
        end_y: int,
        duration_ms: float
    ) -> Dict:
        """Record mouse movement and calculate speed"""
        # Calculate distance traveled
        distance = math.sqrt((end_x - start_x) ** 2 + (end_y - start_y) ** 2)
        speed = distance / (duration_ms / 1000) if duration_ms > 0 else 0

        async with await self.db_connect() as conn:
            await conn.execute(
                """UPDATE behavioral_patterns 
                   SET mouse_speed_avg = COALESCE(mouse_speed_avg, 0) + %s,
                       mouse_distance_traveled = COALESCE(mouse_distance_traveled, 0) + %s
                   WHERE session_id = %s""",
                (speed, distance, session_id)
            )
            await conn.commit()

        return {
            "distance_pixels": distance,
            "speed_pixels_per_second": speed
        }

    async def record_click_event(self, user_id: str, session_id: int) -> Dict:
        """Record mouse click"""
        async with await self.db_connect() as conn:
            await conn.execute(
                """UPDATE behavioral_patterns 
                   SET click_frequency = COALESCE(click_frequency, 0) + 1
                   WHERE session_id = %s""",
                (session_id,)
            )
            await conn.commit()

        return {"click_recorded": True}

    async def record_scroll_event(self, user_id: str, session_id: int) -> Dict:
        """Record scroll event"""
        async with await self.db_connect() as conn:
            await conn.execute(
                """UPDATE behavioral_patterns 
                   SET scroll_events = COALESCE(scroll_events, 0) + 1
                   WHERE session_id = %s""",
                (session_id,)
            )
            await conn.commit()

        return {"scroll_recorded": True}

    async def record_page_navigation(
        self,
        user_id: str,
        session_id: int,
        from_page: str,
        to_page: str,
        time_on_page_seconds: float
    ) -> Dict:
        """Record page navigation"""
        async with await self.db_connect() as conn:
            await conn.execute(
                """UPDATE behavioral_patterns 
                   SET navigation_count = COALESCE(navigation_count, 0) + 1,
                       time_on_page_avg = COALESCE(time_on_page_avg, 0) + %s
                   WHERE session_id = %s""",
                (time_on_page_seconds, session_id)
            )
            await conn.commit()

        return {
            "from_page": from_page,
            "to_page": to_page,
            "time_on_page": time_on_page_seconds
        }

    async def detect_idle(
        self,
        user_id: str,
        session_id: int,
        idle_seconds: int
    ) -> Dict:
        """Record idle time detection"""
        async with await self.db_connect() as conn:
            await conn.execute(
                """UPDATE behavioral_patterns 
                   SET idle_time_seconds = COALESCE(idle_time_seconds, 0) + %s
                   WHERE session_id = %s""",
                (idle_seconds, session_id)
            )
            await conn.commit()

        return {
            "idle_detected": True,
            "idle_seconds": idle_seconds
        }

    async def analyze_behavioral_anomaly(
        self,
        user_id: str,
        session_id: int
    ) -> Dict:
        """Analyze current session behavior against user baseline"""
        async with await self.db_connect() as conn:
            # Get current behavior
            result = await conn.execute(
                """SELECT keystroke_speed_avg, mouse_speed_avg, click_frequency, 
                          scroll_events, navigation_count, idle_time_seconds
                   FROM behavioral_patterns WHERE session_id = %s""",
                (session_id,)
            )
            current = await result.fetchone()

            if not current:
                return {"anomaly_score": 0}

            # Get user baseline (average of last 10 sessions)
            baseline_result = await conn.execute(
                """SELECT AVG(keystroke_speed_avg) as ks,
                          AVG(mouse_speed_avg) as ms,
                          AVG(click_frequency) as cf,
                          AVG(scroll_events) as se
                   FROM behavioral_patterns 
                   WHERE user_id = %s 
                   ORDER BY created_at DESC LIMIT 10""",
                (user_id,)
            )
            baseline = await baseline_result.fetchone()

            # Calculate anomaly score (0-100)
            anomaly_score = self._calculate_anomaly_score(current, baseline)

            is_anomalous = anomaly_score > 70

            # Update anomaly detection
            await conn.execute(
                """UPDATE behavioral_patterns 
                   SET behavior_score = %s,
                       pattern_anomaly_detected = %s
                   WHERE session_id = %s""",
                (anomaly_score, is_anomalous, session_id)
            )
            await conn.commit()

            return {
                "anomaly_score": anomaly_score,
                "is_anomalous": is_anomalous,
                "baseline_deviation_percent": (anomaly_score / 100) * 100
            }

    def _calculate_anomaly_score(self, current: Tuple, baseline: Tuple) -> float:
        """Calculate behavioral anomaly score"""
        if not baseline or baseline[0] is None:
            return 0

        # Normalize and compare metrics
        deviations = []

        # Keystroke speed deviation
        if baseline[0] is not None and current[0] is not None:
            ks_dev = abs(current[0] - baseline[0]) / max(baseline[0], 0.1)
            deviations.append(min(ks_dev, 1.0) * 100)

        # Mouse speed deviation
        if baseline[1] is not None and current[1] is not None:
            ms_dev = abs(current[1] - baseline[1]) / max(baseline[1], 0.1)
            deviations.append(min(ms_dev, 1.0) * 100)

        # Average deviation score
        if deviations:
            return sum(deviations) / len(deviations)

        return 0

    async def get_behavioral_profile(self, user_id: str) -> Dict:
        """Get user's behavioral profile"""
        async with await self.db_connect() as conn:
            result = await conn.execute(
                """SELECT 
                       AVG(keystroke_speed_avg) as keystroke_speed,
                       AVG(mouse_speed_avg) as mouse_speed,
                       AVG(click_frequency) as click_frequency,
                       AVG(scroll_events) as scroll_events,
                       COUNT(*) as sessions_analyzed
                   FROM behavioral_patterns 
                   WHERE user_id = %s""",
                (user_id,)
            )
            profile = await result.fetchone()

            return {
                "keystroke_speed_avg": profile[0] or 0,
                "mouse_speed_avg": profile[1] or 0,
                "click_frequency_avg": profile[2] or 0,
                "scroll_events_avg": profile[3] or 0,
                "sessions_analyzed": profile[4] or 0
            }
