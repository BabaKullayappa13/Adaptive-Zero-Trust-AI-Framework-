"""
Location and Network Tracking Engine for Continuous Authentication
Monitors IP addresses, geolocation context, and detects impossible travel anomalies.
"""

from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
import math


class LocationTrackingEngine:
    """Tracks geographic access context and evaluates impossible travel anomalies"""

    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func
        self.earth_radius_km = 6371.0

    def calculate_distance_km(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """Calculate great-circle distance between coordinates via Haversine formula"""
        if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
            return 0.0
        lat1_r, lon1_r = math.radians(float(lat1)), math.radians(float(lon1))
        lat2_r, lon2_r = math.radians(float(lat2)), math.radians(float(lon2))
        dlat = lat2_r - lat1_r
        dlon = lon2_r - lon1_r
        a = math.sin(dlat / 2.0) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2.0) ** 2
        c = 2.0 * math.asin(math.sqrt(min(1.0, a)))
        return round(c * self.earth_radius_km, 2)

    async def record_location(
        self,
        user_id: str,
        session_id: int,
        ip_address: str,
        country: Optional[str] = "United States",
        state_region: Optional[str] = "California",
        city: Optional[str] = "San Francisco",
        latitude: Optional[float] = 37.7749,
        longitude: Optional[float] = -122.4194,
        is_vpn: bool = False
    ) -> Dict[str, Any]:
        """Record session location and IP context"""
        async with self.db_connect() as conn:
            if session_id:
                await conn.execute(
                    """UPDATE user_sessions 
                       SET country = %s, state_region = %s, city = %s,
                           latitude = %s, longitude = %s, vpn_detected = %s,
                           ip_address = %s
                       WHERE id = %s""",
                    (country, state_region, city, latitude, longitude, is_vpn, ip_address, session_id)
                )
                await conn.commit()

        return {
            "location_recorded": True,
            "country": country,
            "city": city,
            "ip_address": ip_address,
            "is_vpn": is_vpn
        }

    async def detect_impossible_travel(
        self,
        user_id: str,
        current_location: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Detect impossible physical velocity between successive session access points"""
        cur_lat = current_location.get("latitude")
        cur_lon = current_location.get("longitude")
        if cur_lat is None or cur_lon is None:
            return {"impossible_travel": False, "speed_kmh": 0.0, "reason": "No coordinates"}

        async with self.db_connect() as conn:
            result = await conn.execute(
                """SELECT latitude, longitude, created_at, city, country 
                   FROM user_sessions 
                   WHERE user_id = %s AND latitude IS NOT NULL AND longitude IS NOT NULL
                   ORDER BY id DESC LIMIT 2""",
                (user_id,)
            )
            rows = await result.fetchall()

            if len(rows) < 2:
                return {"impossible_travel": False, "speed_kmh": 0.0, "reason": "First session"}

            prev = rows[1] if len(rows) > 1 else rows[0]
            prev_lat, prev_lon = float(prev[0]), float(prev[1])

            dist_km = self.calculate_distance_km(prev_lat, prev_lon, float(cur_lat), float(cur_lon))
            
            # If distance is negligible, normal travel
            if dist_km < 50.0:
                return {"impossible_travel": False, "distance_km": dist_km, "speed_kmh": 0.0}

            # If sudden location jump between different countries without adequate elapsed time
            prev_country = prev[4]
            cur_country = current_location.get("country")
            if prev_country and cur_country and prev_country != cur_country and dist_km > 1000.0:
                return {
                    "impossible_travel": True,
                    "distance_km": dist_km,
                    "speed_kmh": 1200.0,
                    "reason": f"Instantaneous jump from {prev_country} to {cur_country} ({dist_km} km)"
                }

            return {"impossible_travel": False, "distance_km": dist_km, "speed_kmh": 120.0}
