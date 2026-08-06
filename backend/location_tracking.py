"""
Location and IP Tracking Engine
Monitors user locations, IP addresses, and detects impossible travel
"""

from typing import Optional, Dict, Tuple
from datetime import datetime, timedelta
import math
import psycopg


class LocationTrackingEngine:
    """Tracks user locations and detects suspicious travel patterns"""

    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func
        self.earth_radius_km = 6371  # Earth radius in km

    def calculate_distance_km(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """Calculate distance between two coordinates using Haversine formula"""
        from math import radians, cos, sin, asin, sqrt

        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * asin(sqrt(a))

        return c * self.earth_radius_km

    async def record_location(
        self,
        user_id: str,
        session_id: int,
        ip_address: str,
        country: str,
        state_region: Optional[str],
        city: Optional[str],
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        is_vpn: bool = False
    ) -> Dict:
        """Record user location"""
        async with await self.db_connect() as conn:
            # Record in location history
            await conn.execute(
                """INSERT INTO location_history 
                   (user_id, ip_address, country, state_region, city, 
                    latitude, longitude, is_vpn, first_seen, last_seen)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                   ON CONFLICT (user_id, ip_address) 
                   DO UPDATE SET last_seen = NOW(), access_count = access_count + 1""",
                (user_id, ip_address, country, state_region, city,
                 latitude, longitude, is_vpn)
            )

            # Update session location
            await conn.execute(
                """UPDATE user_sessions 
                   SET country = %s, state_region = %s, city = %s,
                       latitude = %s, longitude = %s, vpn_detected = %s
                   WHERE id = %s""",
                (country, state_region, city, latitude, longitude, is_vpn, session_id)
            )

            await conn.commit()

        return {
            "location_recorded": True,
            "country": country,
            "city": city,
            "ip_address": ip_address
        }

    async def detect_impossible_travel(
        self,
        user_id: str,
        current_location: Dict
    ) -> Dict:
        """Detect impossible travel based on previous login locations"""
        async with await self.db_connect() as conn:
            # Get last login location
            result = await conn.execute(
                """SELECT ip_address, country, city, latitude, longitude, last_seen 
                   FROM location_history 
                   WHERE user_id = %s 
                   ORDER BY last_seen DESC 
                   LIMIT 1""",
                (user_id,)
            )
            previous = await result.fetchone()

            if not previous:
                return {
                    "impossible_travel_detected": False,
                    "reason": "First login or no previous location"
                }

            # Get time difference in hours
            time_diff = (datetime.now() - previous[5]).total_seconds() / 3600

            # Calculate distance if coordinates available
            if (previous[3] is not None and previous[4] is not None and
                current_location.get("latitude") is not None and
                current_location.get("longitude") is not None):

                distance_km = self.calculate_distance_km(
                    previous[3], previous[4],
                    current_location["latitude"], current_location["longitude"]
                )

                # Calculate required speed (km/hour)
                required_speed = distance_km / max(time_diff, 0.1)

                # Average commercial flight speed ~900 km/h
                # Allow some buffer for connections
                max_realistic_speed = 1000

                impossible_travel = required_speed > max_realistic_speed and time_diff < 2

                return {
                    "impossible_travel_detected": impossible_travel,
                    "distance_km": distance_km,
                    "required_speed_kmh": required_speed,
                    "time_hours": time_diff,
                    "previous_location": f"{previous[2]}, {previous[1]}",
                    "current_location": f"{current_location.get('city')}, {current_location.get('country')}",
                    "reason": "Impossible travel pattern detected" if impossible_travel else "Normal travel"
                }

            # Country-level impossible travel check
            if time_diff < 0.5 and previous[1] != current_location.get("country"):
                return {
                    "impossible_travel_detected": True,
                    "time_hours": time_diff,
                    "previous_location": previous[1],
                    "current_location": current_location.get("country"),
                    "reason": "Country change in less than 30 minutes"
                }

            return {
                "impossible_travel_detected": False,
                "reason": "Travel pattern appears normal"
            }

    async def get_location_history(
        self,
        user_id: str,
        limit: int = 50
    ) -> list:
        """Get user location history"""
        async with await self.db_connect() as conn:
            result = await conn.execute(
                """SELECT country, state_region, city, ip_address, 
                          is_vpn, first_seen, last_seen, access_count
                   FROM location_history 
                   WHERE user_id = %s 
                   ORDER BY last_seen DESC 
                   LIMIT %s""",
                (user_id, limit)
            )
            locations = await result.fetchall()

            return [
                {
                    "country": l[0],
                    "state": l[1],
                    "city": l[2],
                    "ip_address": l[3],
                    "vpn": l[4],
                    "first_seen": l[5].isoformat(),
                    "last_seen": l[6].isoformat(),
                    "access_count": l[7]
                }
                for l in locations
            ]

    async def is_location_new(
        self,
        user_id: str,
        country: str,
        city: Optional[str] = None
    ) -> bool:
        """Check if location is new for user"""
        async with await self.db_connect() as conn:
            result = await conn.execute(
                """SELECT COUNT(*) FROM location_history 
                   WHERE user_id = %s AND country = %s""",
                (user_id, country)
            )
            count = (await result.fetchone())[0]

            return count == 0

    async def get_trusted_locations(self, user_id: str) -> list:
        """Get user's most trusted/frequent locations"""
        async with await self.db_connect() as conn:
            result = await conn.execute(
                """SELECT country, state_region, city, access_count, last_seen
                   FROM location_history 
                   WHERE user_id = %s 
                   ORDER BY access_count DESC 
                   LIMIT 10""",
                (user_id,)
            )
            locations = await result.fetchall()

            return [
                {
                    "country": l[0],
                    "state": l[1],
                    "city": l[2],
                    "access_count": l[3],
                    "last_seen": l[4].isoformat()
                }
                for l in locations
            ]

    async def analyze_location_consistency(
        self,
        user_id: str,
        current_country: str,
        current_city: Optional[str]
    ) -> Dict:
        """Analyze if current location is consistent with user pattern"""
        async with await self.db_connect() as conn:
            # Get user's typical locations
            result = await conn.execute(
                """SELECT country, COUNT(*) as count 
                   FROM location_history 
                   WHERE user_id = %s 
                   GROUP BY country 
                   ORDER BY count DESC 
                   LIMIT 5""",
                (user_id,)
            )
            typical_locations = await result.fetchall()

            if not typical_locations:
                return {
                    "consistent": True,
                    "reason": "New user, no history"
                }

            # Check if current location is in top 5
            top_countries = [loc[0] for loc in typical_locations]
            is_typical = current_country in top_countries

            consistency_score = 0
            if is_typical:
                consistency_score = 80
            else:
                consistency_score = 30

            return {
                "consistent": is_typical,
                "consistency_score": consistency_score,
                "typical_locations": top_countries,
                "current_location": current_country,
                "reason": "Location matches user pattern" if is_typical else "Unusual location"
            }
