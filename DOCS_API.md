# Zero Trust AI Framework - API Reference

Complete API documentation for the FastAPI backend services.

## Base URL

```
Development:  http://localhost:8000
Production:   https://your-domain.com/api
```

## Authentication

All endpoints (except `/auth/register` and `/auth/login`) require Bearer token authentication:

```
Authorization: Bearer <access_token>
```

Access tokens are returned from the login endpoint and expire after 1 hour.

## Response Format

All responses follow this format:

### Success (2xx)
```json
{
  "data": {...},
  "success": true
}
```

### Error (4xx/5xx)
```json
{
  "detail": "Error message",
  "status": 400
}
```

## Endpoints

### Authentication

#### Register User
```
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "name": "John Doe"
}
```

**Response (200):**
```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "mfa_enabled": false,
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Errors:**
- 400: Email already registered
- 422: Invalid input (email format, password too short)

---

#### Login User
```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

**Headers Set:**
- `Set-Cookie: token=...` (HttpOnly in production)

**Errors:**
- 401: Invalid credentials
- 404: User not found

---

#### Setup MFA
```
POST /api/auth/mfa/setup?user_id=<user_id>
```

**Response (200):**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qr_code_url": "data:image/png;base64,...",
  "manual_entry_key": "JBSWY3DPEHPK3PXP"
}
```

**Notes:**
- QR code can be scanned with Google Authenticator, Authy, etc.
- Manual entry key provided for manual input
- Secret must be stored securely by the client

---

#### Verify MFA
```
POST /api/auth/mfa/verify
```

**Request Body:**
```json
{
  "user_id": "uuid-string",
  "totp_code": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "MFA enabled successfully"
}
```

**Errors:**
- 400: Invalid TOTP code
- 404: User not found

---

### Trust Scoring

#### Get Trust Score
```
GET /api/trust/score/{user_id}
```

**Response (200):**
```json
{
  "score": 85.5,
  "risk_level": "LOW",
  "factors": {
    "device_trust": 90.0,
    "behavioral_score": 87.5,
    "geographic_anomaly": 80.0,
    "temporal_anomaly": 85.0,
    "authentication_strength": 92.0
  }
}
```

**Risk Levels:**
- `LOW`: Score 80-100 (Allow access)
- `MEDIUM`: Score 60-79 (Require MFA)
- `HIGH`: Score 0-59 (Block or require additional verification)

---

### Risk Detection

#### Detect Risk
```
POST /api/risk/detect
```

**Request Body:**
```json
{
  "user_id": "uuid-string",
  "login_hour": 14,
  "device_count": 2,
  "failed_attempts": 0,
  "session_duration": 10,
  "geographic_distance": 25.5,
  "device_trust": 0.85,
  "velocity": 45.2,
  "request_count": 150,
  "new_device": false
}
```

**Response (200):**
```json
{
  "event_id": "uuid-string",
  "risk_score": 35.2,
  "risk_level": "LOW",
  "explanation": {
    "anomaly_score": 0.352,
    "risk_factors": {
      "unusual_time": false,
      "new_device": false,
      "geographic_anomaly": false,
      "high_velocity": false,
      "multiple_failed_attempts": false
    },
    "shap_values": {
      "feature_importance": {
        "login_hour": 0.15,
        "device_count": 0.10,
        "failed_attempts": 0.25,
        "session_duration": 0.05,
        "geographic_distance": 0.20,
        "device_trust": 0.15,
        "velocity": 0.08,
        "request_count": 0.02
      }
    }
  },
  "recommendation": "ALLOW"
}
```

**Recommendations:**
- `ALLOW`: Risk score < 60, allow access freely
- `REQUIRE_MFA`: Risk score 60-80, require MFA
- `BLOCK`: Risk score > 80, block access

**Session Data Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | string | User UUID |
| `login_hour` | int | Hour of login (0-23) |
| `device_count` | int | Number of known devices |
| `failed_attempts` | int | Failed login attempts |
| `session_duration` | int | Session length in minutes |
| `geographic_distance` | float | Distance from usual location (km) |
| `device_trust` | float | Device trust score (0-1) |
| `velocity` | float | Impossible travel speed (km/h) |
| `request_count` | int | Requests in session |
| `new_device` | boolean | First time device |

---

### Audit Logs

#### Get Audit Logs
```
GET /api/audit/logs/{user_id}?limit=50
```

**Query Parameters:**
- `limit` (optional): Max records to return (default: 50)

**Response (200):**
```json
{
  "logs": [
    {
      "id": "uuid-string",
      "action": "LOGIN_SUCCESS",
      "resource": "user_auth",
      "result": "SUCCESS",
      "details": {
        "mfa_used": false,
        "risk_score": 35.2
      },
      "ip_address": "192.168.1.1",
      "created_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": "uuid-string",
      "action": "ANOMALY_DETECTED",
      "resource": "behavioral_analysis",
      "result": "FLAGGED",
      "details": {
        "anomaly_type": "unusual_location",
        "risk_score": 75.5
      },
      "ip_address": "203.0.113.42",
      "created_at": "2024-01-15T14:15:30Z"
    }
  ]
}
```

**Common Actions:**
- `LOGIN_SUCCESS`: Successful login
- `LOGIN_FAILED`: Failed login attempt
- `MFA_ENABLED`: MFA activated
- `ANOMALY_DETECTED`: Risk detected
- `POLICY_ENFORCED`: Security policy applied
- `DEVICE_TRUSTED`: Device marked as trusted

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (invalid data) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 422 | Unprocessable Entity (validation error) |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## Rate Limiting

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1705332600
```

Limits:
- **Auth endpoints**: 10 requests/minute per IP
- **Trust/Risk endpoints**: 100 requests/minute per user
- **Audit endpoints**: 50 requests/minute per user

---

## Error Handling

### Example Error Response

```json
{
  "detail": "Invalid email or password",
  "status": 401,
  "type": "authentication_error"
}
```

### Common Errors

#### Authentication Failed
```json
{
  "detail": "Invalid credentials",
  "status": 401,
  "type": "auth_failed"
}
```

#### User Not Found
```json
{
  "detail": "User not found",
  "status": 404,
  "type": "not_found"
}
```

#### Validation Error
```json
{
  "detail": "Password must be at least 8 characters",
  "status": 422,
  "type": "validation_error"
}
```

---

## Security Headers

Responses include:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

---

## Examples

### Complete Auth Flow

**1. Register**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "MySecurePassword123"
  }'
```

**2. Login**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "MySecurePassword123"
  }'
```

Response includes `access_token` - save this!

**3. Get Trust Score**
```bash
curl -X GET http://localhost:8000/api/trust/score/{user_id} \
  -H "Authorization: Bearer {access_token}"
```

**4. Detect Risk**
```bash
curl -X POST http://localhost:8000/api/risk/detect \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "{user_id}",
    "login_hour": 14,
    "device_count": 1,
    "failed_attempts": 0,
    "session_duration": 15,
    "geographic_distance": 0,
    "device_trust": 0.9,
    "velocity": 0,
    "request_count": 50,
    "new_device": false
  }'
```

---

## Data Types

### User Object
```typescript
interface User {
  id: string               // UUID
  email: string           // Email address
  password_hash: string   // Bcrypt hash
  mfa_enabled: boolean    // MFA status
  mfa_secret?: string     // TOTP secret (if MFA enabled)
  created_at: ISO8601     // Creation timestamp
  updated_at: ISO8601     // Last update timestamp
  last_login?: ISO8601    // Last login timestamp
}
```

### Trust Score Object
```typescript
interface TrustScore {
  score: number           // 0-100
  risk_level: string      // LOW | MEDIUM | HIGH
  factors: {
    device_trust: number
    behavioral_score: number
    geographic_anomaly: number
    temporal_anomaly: number
    authentication_strength: number
  }
}
```

### Risk Event Object
```typescript
interface RiskEvent {
  id: string              // Event UUID
  user_id: string         // User UUID
  event_type: string      // Event category
  risk_level: string      // LOW | MEDIUM | HIGH
  risk_score: number      // 0-100
  context: object         // Session context
  explanation: {
    anomaly_score: number
    risk_factors: object
    shap_values: object
  }
  created_at: ISO8601     // Detection timestamp
}
```

---

## Webhooks (Future)

Planned webhook support for:
- `auth.user.created`
- `auth.login.success`
- `auth.login.failed`
- `risk.detected`
- `policy.enforced`

---

## Pagination (Future)

Will support cursor-based pagination:

```
GET /api/audit/logs/{user_id}?cursor=abc123&limit=50
```

Response:
```json
{
  "logs": [...],
  "next_cursor": "def456",
  "has_more": true
}
```

---

## Support

For API issues:
1. Check this documentation
2. Review example requests above
3. Check backend logs: `docker logs zero-trust-backend`
4. Contact support with request/response details

---

**Last Updated**: 2024  
**API Version**: 1.0.0  
**Status**: Stable
