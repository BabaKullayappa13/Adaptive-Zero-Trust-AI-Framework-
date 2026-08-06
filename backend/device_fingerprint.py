"""
Device Fingerprinting Engine for Continuous Authentication
Identifies and tracks unique device characteristics
"""

import hashlib
import json
from typing import Optional, Dict
import psycopg


class DeviceFingerprintEngine:
    """Manages device fingerprinting and tracking"""

    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func

    def generate_fingerprint(
        self,
        user_agent: str,
        screen_width: int,
        screen_height: int,
        timezone: str,
        language: str,
        platform: str,
        plugins: str = ""
    ) -> str:
        """Generate unique device fingerprint from browser/device characteristics"""
        fingerprint_data = {
            "user_agent": user_agent,
            "screen": f"{screen_width}x{screen_height}",
            "timezone": timezone,
            "language": language,
            "platform": platform,
            "plugins": plugins
        }

        fingerprint_str = json.dumps(fingerprint_data, sort_keys=True)
        fingerprint_hash = hashlib.sha256(fingerprint_str.encode()).hexdigest()

        return fingerprint_hash

    async def register_device(
        self,
        user_id: str,
        device_fingerprint: str,
        device_info: Dict
    ) -> Dict:
        """Register a new device for user"""
        async with await self.db_connect() as conn:
            # Check if device already exists
            existing = await conn.execute(
                "SELECT id, trust_score FROM user_devices WHERE device_fingerprint = %s",
                (device_fingerprint,)
            )
            device = await existing.fetchone()

            if device:
                return {
                    "device_id": device[0],
                    "is_new": False,
                    "trust_score": device[1]
                }

            # Insert new device
            result = await conn.execute(
                """INSERT INTO user_devices 
                   (user_id, device_fingerprint, browser_name, browser_version, 
                    os_name, os_version, screen_resolution, language_setting, timezone)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                   RETURNING id""",
                (
                    user_id,
                    device_fingerprint,
                    device_info.get("browser_name"),
                    device_info.get("browser_version"),
                    device_info.get("os_name"),
                    device_info.get("os_version"),
                    device_info.get("screen_resolution"),
                    device_info.get("language_setting"),
                    device_info.get("timezone")
                )
            )
            device_id = (await result.fetchone())[0]
            await conn.commit()

            return {
                "device_id": device_id,
                "is_new": True,
                "trust_score": 30
            }

    async def get_user_devices(self, user_id: str) -> list:
        """Get all devices registered for user"""
        async with await self.db_connect() as conn:
            result = await conn.execute(
                """SELECT id, device_fingerprint, browser_name, os_name, 
                          is_trusted, trust_score, last_seen
                   FROM user_devices 
                   WHERE user_id = %s 
                   ORDER BY last_seen DESC""",
                (user_id,)
            )
            devices = await result.fetchall()

            return [
                {
                    "id": d[0],
                    "fingerprint": d[1],
                    "browser": d[2],
                    "os": d[3],
                    "is_trusted": d[4],
                    "trust_score": d[5],
                    "last_seen": d[6].isoformat() if d[6] else None
                }
                for d in devices
            ]

    async def update_device_trust_score(
        self,
        device_id: int,
        trust_score_delta: float
    ) -> float:
        """Update device trust score based on activity"""
        async with await self.db_connect() as conn:
            # Clamp trust score between 0 and 100
            result = await conn.execute(
                """UPDATE user_devices 
                   SET trust_score = GREATEST(0, LEAST(100, trust_score + %s)),
                       last_seen = NOW()
                   WHERE id = %s
                   RETURNING trust_score""",
                (trust_score_delta, device_id)
            )
            new_score = (await result.fetchone())[0]
            await conn.commit()

            return new_score

    async def mark_device_as_trusted(self, device_id: int) -> Dict:
        """Mark device as trusted by user"""
        async with await self.db_connect() as conn:
            await conn.execute(
                """UPDATE user_devices 
                   SET is_trusted = TRUE, trust_score = 85
                   WHERE id = %s""",
                (device_id,)
            )
            await conn.commit()

            return {"status": "Device marked as trusted", "trust_score": 85}

    async def remove_device(self, user_id: str, device_id: int) -> Dict:
        """Remove a trusted device"""
        async with await self.db_connect() as conn:
            result = await conn.execute(
                "DELETE FROM user_devices WHERE id = %s AND user_id = %s",
                (device_id, user_id)
            )
            await conn.commit()

            return {"status": "Device removed"}

    async def get_device_by_fingerprint(
        self,
        device_fingerprint: str
    ) -> Optional[Dict]:
        """Get device information by fingerprint"""
        async with await self.db_connect() as conn:
            result = await conn.execute(
                """SELECT id, user_id, browser_name, os_name, is_trusted, trust_score
                   FROM user_devices 
                   WHERE device_fingerprint = %s""",
                (device_fingerprint,)
            )
            device = await result.fetchone()

            if not device:
                return None

            return {
                "id": device[0],
                "user_id": str(device[1]),
                "browser": device[2],
                "os": device[3],
                "is_trusted": device[4],
                "trust_score": device[5]
            }

    async def calculate_device_risk_score(
        self,
        device_id: int,
        is_new_device: bool,
        browser_changed: bool,
        os_changed: bool
    ) -> float:
        """Calculate risk score for device"""
        risk_score = 0

        # New device adds risk
        if is_new_device:
            risk_score += 30

        # Browser change adds risk
        if browser_changed:
            risk_score += 15

        # OS change adds risk (significant risk)
        if os_changed:
            risk_score += 25

        # Get device trust score
        async with await self.db_connect() as conn:
            result = await conn.execute(
                "SELECT trust_score FROM user_devices WHERE id = %s",
                (device_id,)
            )
            device = await result.fetchone()

            if device:
                trust_score = device[0]
                # Lower device trust score = higher risk
                risk_score += (100 - trust_score) * 0.1

        # Clamp between 0 and 100
        return min(100, max(0, risk_score))
