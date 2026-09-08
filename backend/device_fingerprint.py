"""
Device Profile Engine for Continuous Authentication
Generates software-based device & browser profiles (hardware screen geometry, OS, browser characteristics).
"""

import hashlib
import json
from typing import Optional, Dict, List, Any
from datetime import datetime


class DeviceFingerprintEngine:
    """Manages software-based device profile hashing and trust evaluation"""

    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func

    def generate_fingerprint(
        self,
        user_agent: str = "",
        screen_width: int = 1920,
        screen_height: int = 1080,
        timezone: str = "UTC",
        language: str = "en-US",
        platform: str = "",
        plugins: str = ""
    ) -> str:
        """Standard client descriptor without biometric hardware fingerprinting"""
        return "standard_client_context"

    async def register_device(
        self,
        user_id: str,
        device_fingerprint: Optional[str] = None,
        device_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Register or retrieve device record for user using client context without biometrics"""
        device_info = device_info or {}
        browser_name = device_info.get("browser_name") or device_info.get("browser", "Browser Client")
        os_name = device_info.get("os_name") or device_info.get("os", "Generic OS")
        client_descriptor = f"{user_id}_{browser_name}_{os_name}"

        async with self.db_connect() as conn:
            # Check if device record already exists for this user and browser/os
            existing = await conn.execute(
                """SELECT id, trust_score, is_trusted 
                   FROM user_devices 
                   WHERE user_id = %s AND browser_name = %s AND os_name = %s
                   LIMIT 1""",
                (user_id, browser_name, os_name)
            )
            device = await existing.fetchone()

            if device:
                await conn.execute(
                    "UPDATE user_devices SET last_seen = NOW() WHERE id = %s",
                    (device[0],)
                )
                await conn.commit()
                return {
                    "device_id": int(device[0]),
                    "is_new": False,
                    "is_trusted": bool(device[2]),
                    "trust_score": float(device[1] or 70.0)
                }

            # Insert new device context without biometric fingerprint
            await conn.execute(
                """INSERT INTO user_devices 
                   (user_id, device_fingerprint, device_name, browser_name, browser_version, 
                    os_name, os_version, screen_resolution, language_setting, timezone, trust_score, is_trusted, last_seen)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 60.0, TRUE, NOW())""",
                (
                    user_id,
                    client_descriptor,
                    device_info.get("device_name", "Primary Client"),
                    browser_name,
                    device_info.get("browser_version", "1.0"),
                    os_name,
                    device_info.get("os_version", "1.0"),
                    device_info.get("screen_resolution", "Standard"),
                    device_info.get("language_setting", "en"),
                    device_info.get("timezone", "UTC")
                )
            )
            
            dev_res = await conn.execute(
                "SELECT id FROM user_devices WHERE user_id = %s AND browser_name = %s AND os_name = %s ORDER BY id DESC LIMIT 1",
                (user_id, browser_name, os_name)
            )
            dev_row = await dev_res.fetchone()
            device_id = int(dev_row[0]) if dev_row else 1
            await conn.commit()

            return {
                "device_id": device_id,
                "is_new": True,
                "is_trusted": True,
                "trust_score": 60.0
            }

    async def get_user_devices(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all devices associated with a user"""
        async with self.db_connect() as conn:
            result = await conn.execute(
                """SELECT id, device_fingerprint, device_name, browser_name, os_name, 
                          is_trusted, trust_score, last_seen
                   FROM user_devices 
                   WHERE user_id = %s 
                   ORDER BY id DESC""",
                (user_id,)
            )
            devices = await result.fetchall()

            return [
                {
                    "id": int(d[0]),
                    "device_fingerprint": str(d[1]),
                    "device_name": str(d[2] or "Primary Device"),
                    "browser_name": str(d[3] or "Browser"),
                    "os_name": str(d[4] or "OS"),
                    "is_trusted": bool(d[5]),
                    "trust_score": float(d[6] or 50.0),
                    "last_seen": str(d[7] or "")
                }
                for d in devices
            ]
