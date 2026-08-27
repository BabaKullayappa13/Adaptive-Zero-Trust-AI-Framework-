# Continuous Authentication API Endpoints

## Overview
Complete API specification for integrating continuous authentication into FastAPI backend.

---

## Authentication Events - Behavioral Tracking

### Record Keystroke Event
```http
POST /api/auth/continuous/events/keystroke
Content-Type: application/json
Authorization: Bearer {token}

{
  "duration_ms": 1500,
  "character_count": 25,
  "session_id": 123
}

Response:
{
  "keystroke_speed": 16.67,
  "characters_per_second": 16.67
}
```

### Record Mouse Event
```http
POST /api/auth/continuous/events/mouse
Content-Type: application/json
Authorization: Bearer {token}

{
  "start_x": 100,
  "start_y": 200,
  "end_x": 250,
  "end_y": 350,
  "duration_ms": 800,
  "session_id": 123
}

Response:
{
  "distance_pixels": 212.13,
  "speed_pixels_per_second": 265.16
}
```

### Record Click Event
```http
POST /api/auth/continuous/events/click
Content-Type: application/json
Authorization: Bearer {token}

{
  "session_id": 123,
  "x": 150,
  "y": 250
}

Response:
{
  "click_recorded": true
}
```

### Record Scroll Event
```http
POST /api/auth/continuous/events/scroll
Content-Type: application/json
Authorization: Bearer {token}

{
  "session_id": 123,
  "direction": "down",
  "amount": 500
}

Response:
{
  "scroll_recorded": true
}
```

### Record Navigation Event
```http
POST /api/auth/continuous/events/navigation
Content-Type: application/json
Authorization: Bearer {token}

{
  "session_id": 123,
  "from_page": "/dashboard",
  "to_page": "/settings",
  "time_on_page_seconds": 45.5
}

Response:
{
  "from_page": "/dashboard",
  "to_page": "/settings",
  "time_on_page": 45.5
}
```

### Record Idle Detection
```http
POST /api/auth/continuous/events/idle
Content-Type: application/json
Authorization: Bearer {token}

{
  "session_id": 123,
  "idle_seconds": 180
}

Response:
{
  "idle_detected": true,
  "idle_seconds": 180
}
```

---

## Device Management

### Register/Get Device
```http
POST /api/auth/devices/register
Content-Type: application/json
Authorization: Bearer {token}

{
  "user_agent": "Mozilla/5.0...",
  "screen_width": 1920,
  "screen_height": 1080,
  "timezone": "America/New_York",
  "language": "en",
  "platform": "MacIntel",
  "browser_name": "Chrome",
  "browser_version": "120.0",
  "os_name": "macOS",
  "os_version": "14.2"
}

Response:
{
  "device_id": 42,
  "is_new": true,
  "trust_score": 30,
  "device_fingerprint": "a3f8b2c9d4e7f1a5b8c2d9e3f4a7b1c5d8e2f3a4b5c6d7e8f9a0b1c2d3e4f5"
}
```

### Get User Devices
```http
GET /api/auth/devices
Authorization: Bearer {token}

Response:
{
  "devices": [
    {
      "id": 1,
      "fingerprint": "a3f8b2c9d4e7...",
      "browser": "Chrome",
      "os": "macOS",
      "is_trusted": true,
      "trust_score": 85,
      "last_seen": "2024-01-15T14:30:00Z"
    }
  ]
}
```

### Mark Device as Trusted
```http
POST /api/auth/devices/{device_id}/trust
Authorization: Bearer {token}

Response:
{
  "status": "Device marked as trusted",
  "trust_score": 85
}
```

### Remove Device
```http
DELETE /api/auth/devices/{device_id}
Authorization: Bearer {token}

Response:
{
  "status": "Device removed"
}
```

---

## Session Management

### Create Session
```http
POST /api/auth/continuous/sessions/create
Content-Type: application/json

{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "device_info": {
    "user_agent": "Mozilla/5.0...",
    "screen_width": 1920,
    "screen_height": 1080,
    "timezone": "America/New_York",
    "language": "en",
    "platform": "MacIntel"
  },
  "location_info": {
    "country": "United States",
    "state": "New York",
    "city": "New York",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "vpn_detected": false
  },
  "ip_address": "203.0.113.45"
}

Response:
{
  "session_id": 123,
  "session_token": "uuid-here",
  "device_id": 42,
  "is_new_device": false,
  "device_trust_score": 85
}
```

### Get Session Status
```http
GET /api/auth/continuous/sessions/{session_id}
Authorization: Bearer {token}

Response:
{
  "session_id": 123,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "device_id": 42,
  "trust_score": 75.5,
  "risk_score": 25.0,
  "created_at": "2024-01-15T10:00:00Z",
  "last_activity": "2024-01-15T14:30:00Z",
  "is_active": true,
  "expires_at": "2024-01-15T18:00:00Z"
}
```

### Get Active Sessions
```http
GET /api/auth/continuous/sessions
Authorization: Bearer {token}

Response:
{
  "sessions": [
    {
      "session_id": 123,
      "device_id": 42,
      "trust_score": 75.5,
      "risk_score": 25.0,
      "created_at": "2024-01-15T10:00:00Z",
      "last_activity": "2024-01-15T14:30:00Z",
      "is_active": true
    }
  ]
}
```

### Update Session Scores
```http
POST /api/auth/continuous/sessions/{session_id}/update
Content-Type: application/json
Authorization: Bearer {token}

{
  "device_info": {
    "trust_score": 85,
    "is_new_device": false,
    "browser_changed": false
  },
  "behavioral_factors": {
    "successful_logins": 5,
    "behavior_score": 75,
    "session_duration": 30,
    "keystroke_anomaly": false,
    "navigation_anomaly": false,
    "failed_attempts": 0,
    "idle_time": 5
  },
  "location_info": {
    "country": "United States",
    "state": "New York",
    "city": "New York",
    "vpn_detected": false
  }
}

Response:
{
  "trust_score": 78.5,
  "risk_score": 22.0,
  "risk_level": "Low",
  "should_trigger_mfa": false,
  "mfa_reason": "",
  "policy_decision": "Continue Monitoring",
  "access_level": "user",
  "action_required": null,
  "impossible_travel": {
    "impossible_travel_detected": false,
    "reason": "Travel pattern appears normal"
  }
}
```

### End Session
```http
DELETE /api/auth/continuous/sessions/{session_id}
Authorization: Bearer {token}

Response:
{
  "status": "Session ended"
}
```

---

## Score Management

### Get Current Scores
```http
GET /api/auth/continuous/scores/current
Authorization: Bearer {token}

Response:
{
  "trust_score": 78.5,
  "risk_score": 22.0,
  "risk_level": "Low",
  "trust_level": "High"
}
```

### Get Score History
```http
GET /api/auth/continuous/scores/history?limit=50
Authorization: Bearer {token}

Response:
{
  "trust_scores": [
    {
      "score": 78.5,
      "timestamp": "2024-01-15T14:30:00Z"
    }
  ],
  "risk_scores": [
    {
      "score": 22.0,
      "level": "Low",
      "timestamp": "2024-01-15T14:30:00Z"
    }
  ]
}
```

---

## Location Management

### Record Location
```http
POST /api/auth/continuous/location
Content-Type: application/json
Authorization: Bearer {token}

{
  "session_id": 123,
  "ip_address": "203.0.113.45",
  "country": "United States",
  "state_region": "New York",
  "city": "New York",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "is_vpn": false
}

Response:
{
  "location_recorded": true,
  "country": "United States",
  "city": "New York",
  "ip_address": "203.0.113.45"
}
```

### Get Location History
```http
GET /api/auth/continuous/location/history?limit=50
Authorization: Bearer {token}

Response:
{
  "locations": [
    {
      "country": "United States",
      "state": "New York",
      "city": "New York",
      "ip_address": "203.0.113.45",
      "vpn": false,
      "first_seen": "2024-01-10T08:00:00Z",
      "last_seen": "2024-01-15T14:30:00Z",
      "access_count": 12
    }
  ]
}
```

### Get Trusted Locations
```http
GET /api/auth/continuous/location/trusted
Authorization: Bearer {token}

Response:
{
  "trusted_locations": [
    {
      "country": "United States",
      "state": "New York",
      "city": "New York",
      "access_count": 50,
      "last_seen": "2024-01-15T14:30:00Z"
    }
  ]
}
```

### Detect Impossible Travel
```http
POST /api/auth/continuous/location/check-travel
Content-Type: application/json
Authorization: Bearer {token}

{
  "latitude": 48.8566,
  "longitude": 2.3522,
  "country": "France",
  "city": "Paris"
}

Response:
{
  "impossible_travel_detected": true,
  "distance_km": 5844,
  "required_speed_kmh": 1461,
  "time_hours": 4,
  "previous_location": "New York, United States",
  "current_location": "Paris, France",
  "reason": "Impossible travel pattern detected"
}
```

---

## Behavioral Analysis

### Get Behavioral Profile
```http
GET /api/auth/continuous/behavior/profile
Authorization: Bearer {token}

Response:
{
  "keystroke_speed_avg": 45.3,
  "mouse_speed_avg": 250.5,
  "click_frequency_avg": 12.5,
  "scroll_events_avg": 8.3,
  "sessions_analyzed": 15
}
```

### Analyze Behavioral Anomaly
```http
GET /api/auth/continuous/behavior/anomaly/{session_id}
Authorization: Bearer {token}

Response:
{
  "anomaly_score": 25.5,
  "is_anomalous": false,
  "baseline_deviation_percent": 25.5
}
```

---

## Audit & Logging

### Get Authentication Events
```http
GET /api/auth/continuous/events?limit=100&type=login
Authorization: Bearer {token}

Response:
{
  "events": [
    {
      "event_type": "login",
      "event_detail": "Successful login",
      "ip_address": "203.0.113.45",
      "device_id": 42,
      "session_id": 123,
      "success": true,
      "timestamp": "2024-01-15T14:30:00Z"
    }
  ]
}
```

### Get Policy Decisions
```http
GET /api/auth/continuous/policy-decisions?limit=50
Authorization: Bearer {token}

Response:
{
  "decisions": [
    {
      "policy_decision": "Continue Monitoring",
      "trust_score": 78.5,
      "risk_score": 22.0,
      "action_required": null,
      "reason": "Dynamic policy evaluation",
      "created_at": "2024-01-15T14:30:00Z"
    }
  ]
}
```

---

## Admin Endpoints

### Get Online Users Count
```http
GET /api/admin/continuous-auth/online-users
Authorization: Bearer {admin_token}

Response:
{
  "online_users": 156,
  "active_sessions": 342
}
```

### Get High-Risk Users
```http
GET /api/admin/continuous-auth/high-risk-users
Authorization: Bearer {admin_token}

Response:
{
  "high_risk_users": [
    {
      "user_id": "uuid",
      "current_risk_score": 85.5,
      "reason": "Multiple failed attempts",
      "timestamp": "2024-01-15T14:30:00Z"
    }
  ]
}
```

### Get MFA Statistics
```http
GET /api/admin/continuous-auth/mfa-stats
Authorization: Bearer {admin_token}

Response:
{
  "total_mfa_triggers": 1234,
  "mfa_success_rate": 98.5,
  "mfa_by_reason": {
    "high_risk_score": 450,
    "new_device": 350,
    "low_trust_score": 300,
    "new_location": 134
  }
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "code": "AUTH_001"
}
```

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid request parameters",
  "code": "VALIDATION_001"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found",
  "code": "NOT_FOUND_001"
}
```

### 500 Server Error
```json
{
  "error": "Server Error",
  "message": "Internal server error",
  "code": "SERVER_001"
}
```

---

## Rate Limiting

- Behavioral events: 100/minute per session
- Session operations: 10/minute per user
- Score queries: 30/minute per user
- Location updates: 5/minute per session

---

## Response Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1705335000
X-Request-ID: uuid
```

---

## Authentication Methods

All endpoints (except login/register) require Bearer token:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Implementation Notes

1. All timestamps in ISO 8601 format (UTC)
2. UUIDs for user_id and session_token
3. Decimal values for scores (0-100)
4. Geographic coordinates in decimal degrees
5. All requests/responses JSON format
6. Implement request validation on backend
7. Log all events for audit trail
8. Implement CORS for frontend access
9. Use HTTPS only in production
