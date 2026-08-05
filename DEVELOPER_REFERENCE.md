# Developer Reference Card

## Quick Command Reference

### Local Development

```bash
# Install dependencies
cd frontend && pnpm install
cd ../backend && pip install -r requirements.txt

# Run frontend dev server
cd frontend && pnpm dev
# Runs on http://localhost:3001

# Run backend dev server
cd backend && python main.py
# Runs on http://localhost:8000

# Build for production
cd frontend && pnpm build
cd ../backend && # No build needed, Python runs directly
```

### Environment Variables

Already configured automatically:
- `DATABASE_URL` - PostgreSQL connection string
- `PGHOST`, `PGUSER`, `PGPASSWORD` - Database credentials

### API Base URLs

**Development**:
```
Frontend:  http://localhost:3001
Backend:   http://localhost:8000
API:       http://localhost:3001/api  (proxied to 8000)
```

**Production**:
```
Frontend:  https://your-domain.vercel.app
API:       https://your-domain.vercel.app/api
```

---

## Frontend Structure

### Key Directories
```
app/
  page.tsx           # Homepage
  layout.tsx         # Root layout
  auth/
    login/           # Login page
    register/        # Registration page
    mfa/setup/       # MFA setup
  dashboard/         # Main dashboard
  security/          # Device settings
  policies/          # Policy management

components/
  navbar.tsx         # Header navigation
  dashboard/
    trust-score-card.tsx
    risk-events-list.tsx
    audit-logs-table.tsx
    charts.tsx

lib/
  api.ts            # API client
  auth-store.ts     # Auth state management
```

### Common Components

```typescript
// API calls
import { api } from '@/lib/api'

const login = await api.auth.login(email, password)
const score = await api.trust.getScore(userId)
const events = await api.risk.getEvents(userId)

// State management
import { useAuthStore } from '@/lib/auth-store'

const { user, token, logout } = useAuthStore()
```

### Styling

- **Framework**: Tailwind CSS v3
- **Components**: Custom React components
- **Colors**: 
  - Primary: `#3b82f6` (blue)
  - Background: `#0f172a` (dark slate)
  - Foreground: `#e2e8f0` (light slate)

---

## Backend Structure

### Key Files

```
backend/
  main.py           # FastAPI application
  pyproject.toml    # Python dependencies
```

### API Routes

```python
# Authentication
@app.post("/auth/register")
@app.post("/auth/login")
@app.post("/auth/refresh")
@app.post("/auth/logout")

# MFA
@app.post("/auth/mfa/setup")
@app.post("/auth/mfa/verify")

# Trust & Risk
@app.get("/trust/score/{user_id}")
@app.get("/risk/events/{user_id}")
@app.post("/risk/evaluate")

# Policies
@app.get("/policies")
@app.post("/policies")
@app.put("/policies/{policy_id}")

# Devices
@app.get("/devices/{user_id}")
@app.post("/devices")

# Audit
@app.get("/audit/logs/{user_id}")
```

### Main Functions

```python
# Trust scoring
calculate_trust_score(user_id) -> float

# Risk detection
detect_anomalies(features) -> List[Dict]
classify_risk(anomaly_score) -> str

# Policy evaluation
evaluate_policies(user_id, context) -> bool

# Event logging
log_event(user_id, action, details)
```

---

## Database Schema

### Core Tables

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  mfa_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Trust Scores
CREATE TABLE trust_scores (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  score FLOAT NOT NULL,
  factors JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Risk Events
CREATE TABLE risk_events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  risk_level VARCHAR(20) NOT NULL,
  risk_score FLOAT NOT NULL,
  context JSONB,
  explanation JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Auth Sessions
CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token_hash VARCHAR(255) NOT NULL,
  device_id VARCHAR(255),
  ip_address VARCHAR(45),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Devices
CREATE TABLE devices (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  device_fingerprint VARCHAR(255) UNIQUE NOT NULL,
  is_trusted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Access Policies
CREATE TABLE access_policies (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rules JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(255),
  result VARCHAR(20),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Request Examples

### Login

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword"
  }'

# Response:
{
  "access_token": "eyJ0eXAi...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "mfa_enabled": false
  }
}
```

### Get Trust Score

```bash
curl -X GET http://localhost:8000/trust/score/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJ0eXAi..."

# Response:
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "score": 0.85,
  "factors": {
    "session_recency": 0.9,
    "device_reputation": 0.8,
    "login_pattern": 0.85,
    "behavioral_history": 0.75
  },
  "risk_level": "LOW"
}
```

### Evaluate Risk

```bash
curl -X POST http://localhost:8000/risk/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ0eXAi..." \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "action": "login",
    "context": {
      "ip": "192.168.1.1",
      "device": "Chrome/Windows",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  }'

# Response:
{
  "risk_score": 0.25,
  "risk_level": "LOW",
  "anomalies": [],
  "policy_check": "PASS",
  "explanation": {
    "factors": ["High trust score", "Known device"],
    "reasons": ["Device previously seen", "Normal login time"]
  }
}
```

---

## Troubleshooting

### Frontend Issues

**Port already in use**:
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
# Or start on different port
pnpm dev -- -p 3002
```

**Build errors**:
```bash
# Clear cache and rebuild
rm -rf .next node_modules
pnpm install && pnpm build
```

**API not responding**:
```bash
# Check if backend is running on port 8000
curl http://localhost:8000/docs
# If not, verify DATABASE_URL is set
echo $DATABASE_URL
```

### Backend Issues

**Database connection error**:
```bash
# Verify DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

**Module not found**:
```bash
# Reinstall dependencies
pip install -r requirements.txt
```

**Port conflict**:
```bash
# Run on different port
python main.py --port 8001
```

---

## Useful Links

- **Frontend**: http://localhost:3001
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Database**: Neon PostgreSQL dashboard
- **Vercel**: https://vercel.com/dashboard

---

## File Modifications Guide

### Adding a New API Endpoint

**Backend** (`backend/main.py`):
```python
@app.post("/api/my-endpoint")
async def my_endpoint(data: MyModel):
    # Implementation
    return {"result": "success"}
```

**Frontend** (`frontend/lib/api.ts`):
```typescript
export const myFeature = {
  myEndpoint: async (data: any) => {
    return request('/my-endpoint', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
}
```

**Usage** (`frontend/app/page.tsx`):
```typescript
const result = await api.myFeature.myEndpoint(data)
```

### Adding a New Database Table

**Backend** (`backend/main.py`):
```python
# Define SQLAlchemy model
class MyTable(Base):
    __tablename__ = "my_table"
    id = Column(UUID, primary_key=True)
    user_id = Column(UUID, ForeignKey("users.id"))
    # ... columns
```

**Migration**: Use Neon dashboard or direct SQL:
```sql
CREATE TABLE my_table (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  -- ... columns
);
```

---

## Performance Tips

1. **Frontend**: Use SWR for API caching
2. **Backend**: Cache trust scores for 5 minutes
3. **Database**: Use indexes on frequently queried columns
4. **ML**: Pre-compute anomaly models during setup

---

## Security Checklist

- [ ] HTTPS enabled in production
- [ ] Environment variables configured
- [ ] CORS properly restricted
- [ ] Rate limiting enabled
- [ ] Audit logging active
- [ ] Database backups scheduled
- [ ] SSL certificates valid
- [ ] API keys rotated

---

Generated with ❤️ by Vercel v0
