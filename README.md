# Adaptive Zero Trust-AI Framework for Continuous Multi-Factor Authentication

An enterprise-grade security platform combining **zero trust architecture**, **continuous authentication**, and **AI-powered risk detection** to provide adaptive, behavior-based access control with real-time threat assessment.

## 🎯 Overview

This framework implements a next-generation authentication and authorization system that moves beyond traditional perimeter security to provide:

- **Continuous Authentication**: Real-time trust scoring based on behavioral analytics
- **AI-Powered Risk Detection**: Machine learning models detect anomalies using Isolation Forest and behavioral patterns
- **Zero Trust Architecture**: Never trust, always verify - every access request is evaluated against comprehensive policies
- **Explainable AI (XAI)**: SHAP values explain which factors contribute to risk assessments
- **Multi-Factor Authentication**: TOTP-based MFA with adaptive challenges based on risk level
- **Comprehensive Audit Logging**: Full compliance trail of all security events

## 🏗️ Architecture

### Multi-Service Stack

```
Zero Trust AI Framework
├── Frontend (Next.js 14)
│   ├── Authentication Pages (Login, Register, MFA)
│   ├── Dashboard (Real-time monitoring)
│   ├── Security Settings (MFA, device management)
│   ├── Policy Management (Create, edit, enforce policies)
│   └── Audit Logs & Analytics
│
├── Backend (FastAPI + Python)
│   ├── Authentication Service (JWT, OAuth, MFA)
│   ├── Trust Scoring Engine (Behavioral analysis)
│   ├── ML/AI Models (Anomaly detection, risk classification)
│   ├── Policy Engine (ABAC, time-based, geographic rules)
│   └── Audit & Compliance System
│
└── Database (PostgreSQL via Neon)
    ├── Users & Sessions
    ├── Trust Scores & Behavioral Data
    ├── Risk Events & Anomalies
    ├── Access Policies & Rules
    └── Audit Logs
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (Frontend)
- Python 3.11+ (Backend)
- PostgreSQL database (Neon integration already configured)
- npm/pnpm or pip package manager

### Installation

1. **Clone & Setup**
```bash
git clone <repository>
cd zero-trust-ai-framework
```

2. **Install Frontend Dependencies**
```bash
cd frontend
pnpm install
```

3. **Install Backend Dependencies**
```bash
cd ../backend
pip install -r requirements.txt  # if available
# Or install packages individually:
pip install fastapi uvicorn psycopg pydantic PyJWT passlib pyotp numpy scikit-learn pandas
```

4. **Environment Variables**
The following are auto-provisioned via Neon integration:
- `DATABASE_URL` - PostgreSQL connection string
- `PGHOST`, `PGUSER`, `PGPASSWORD` - Database credentials

Additional required variables:
- `SECRET_KEY` - JWT signing key (generate: `openssl rand -base64 32`)
- `BETTER_AUTH_SECRET` - Authentication secret (generate: `openssl rand -base64 32`)

### Development

**Start both services:**
```bash
# From root directory
vercel dev
```

This starts:
- Backend: http://localhost:8000 (FastAPI)
- Frontend: http://localhost:3000 (Next.js)

**Backend only:**
```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend only:**
```bash
cd frontend
pnpm dev
```

## 📋 Database Schema

### Core Tables

**users**
- User accounts with encrypted passwords and MFA settings
- Tracks login history and account metadata

**auth_sessions**
- Active authentication sessions with device fingerprinting
- IP address and user agent tracking for anomaly detection

**trust_scores**
- Real-time trust score calculations (0-100)
- Behavioral factors and risk indicators
- Historical trust data for trend analysis

**risk_events**
- Detected anomalies and security incidents
- Risk score, classification, and SHAP explanations
- Context data for incident investigation

**devices**
- Registered devices with fingerprints
- Trust status and last used timestamps
- Device name and metadata

**access_policies**
- Zero Trust policy definitions
- Rules for different access scenarios
- ABAC (Attribute-Based Access Control) conditions

**audit_logs**
- Complete audit trail of all system events
- Action type, result, IP address, and user
- Detailed context for compliance investigations

## 🤖 ML/AI Components

### Anomaly Detection
- **Algorithm**: Isolation Forest
- **Features**: Login hour, device count, failed attempts, session duration, geographic distance, device trust, velocity, request count
- **Training Data**: CICIDS2017 dataset patterns
- **Output**: Anomaly score (0-1)

### Trust Scoring
- **Weighted Factors**:
  - Device Trust: 25%
  - Behavioral Score: 30%
  - Geographic Anomaly: 20%
  - Temporal Anomaly: 15%
  - Authentication Strength: 10%
- **Range**: 0-100 (higher = more trustworthy)
- **Thresholds**:
  - 80-100: LOW risk (ALLOW)
  - 60-79: MEDIUM risk (REQUIRE_MFA)
  - 0-59: HIGH risk (BLOCK)

### Explainability (SHAP)
Each risk event includes SHAP feature importance values showing which factors contributed most to the risk assessment, enabling security teams to understand and respond to threats intelligently.

## 🔐 Authentication Flow

### Registration
1. User provides email and password (8+ chars)
2. Password hashed with bcrypt
3. User account created in database
4. Confirmation email sent (optional in demo)

### Login
1. User provides email and password
2. Password verified against hash
3. JWT tokens generated (access + refresh)
4. Session created with device fingerprinting
5. Trust score calculated
6. Risk assessment performed
7. MFA challenge if risk > MEDIUM threshold

### MFA Setup
1. Generate TOTP secret with PyOTP
2. Display QR code for authenticator app
3. User scans with Google Authenticator, Authy, etc.
4. User enters 6-digit code to verify
5. MFA enabled on account

## 📊 Dashboard Features

### Real-Time Monitoring
- **Trust Score Card**: Circular progress indicator with risk level
- **Risk Events**: Recent anomalies with explanations
- **Audit Logs**: Complete action history

### Analytics
- **Trust Score Trend**: 24-hour historical data
- **Risk Distribution**: Low/Medium/High breakdown
- **Authentication Methods**: Usage statistics

### Security Settings
- Password management
- MFA configuration
- API key management
- Trusted devices list
- Active sessions monitoring

### Policy Management
- Create behavioral rules
- Geographic restrictions
- Time-based access controls
- Device trust policies
- Real-time enforcement

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (returns JWT tokens)
- `POST /api/auth/mfa/setup` - Generate MFA secret
- `POST /api/auth/mfa/verify` - Verify TOTP code and enable MFA

### Trust & Risk
- `GET /api/trust/score/{user_id}` - Get current trust score
- `POST /api/risk/detect` - Detect anomalies in session
- `GET /api/audit/logs/{user_id}` - Get user's audit log

### Health
- `GET /api/health` - Backend health check

## 🎨 Frontend Structure

```
frontend/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── mfa/
│   │       └── setup/page.tsx
│   ├── dashboard/page.tsx          # Main dashboard
│   ├── security/page.tsx           # Security settings
│   └── policies/page.tsx           # Policy management
├── components/
│   ├── navbar.tsx                  # Navigation bar
│   └── dashboard/
│       ├── trust-score-card.tsx    # Trust visualization
│       ├── risk-events-list.tsx    # Risk incidents
│       ├── audit-logs-table.tsx    # Activity log
│       └── charts.tsx              # Analytics charts
├── lib/
│   ├── api.ts                      # API client
│   └── auth-store.ts               # Zustand auth state
├── next.config.mjs                 # Next.js configuration
├── tailwind.config.ts              # Tailwind theming
└── package.json

```

## 🖼️ Design System

### Color Palette
- **Background**: #0f172a (dark blue)
- **Primary**: #3b82f6 (blue - actions)
- **Secondary**: #8b5cf6 (purple - alternative)
- **Success**: #10b981 (green - low risk)
- **Warning**: #f59e0b (amber - medium risk)
- **Danger**: #ef4444 (red - high risk)
- **Card**: #1e293b (card background)

### Typography
- **Font**: Inter (system-ui fallback)
- **Headings**: Bold, leading-tight
- **Body**: Regular weight, leading-relaxed

### Components
- Card-based layout with hover states
- Tailwind CSS utility classes
- Recharts for data visualization
- Lucide icons for UI elements

## 🔄 Data Flow

### Authentication & Trust Scoring
```
User Login
  ↓
Email/Password Verification
  ↓
JWT Token Generation
  ↓
Session Creation + Device Fingerprinting
  ↓
Behavioral Analysis
  ↓
Trust Score Calculation (ML Model)
  ↓
Risk Assessment
  ↓
Policy Evaluation
  ↓
MFA Challenge (if needed)
  ↓
Access Decision (ALLOW/REQUIRE_MFA/BLOCK)
```

### Anomaly Detection
```
Session Event
  ↓
Feature Extraction
  ↓
Isolation Forest Model
  ↓
Anomaly Score Calculation
  ↓
Risk Factor Identification
  ↓
SHAP Explainability
  ↓
Risk Event Creation
  ↓
Policy Enforcement
```

## 📈 Performance Optimizations

- **Frontend**: Static generation with ISR, code splitting
- **Backend**: Async/await with FastAPI, connection pooling
- **Database**: Indexed queries, prepared statements
- **ML Models**: Pre-trained, cached in memory
- **Caching**: SWR for client-side data caching

## 🔒 Security Best Practices

1. **Password Security**
   - Bcrypt hashing with salt rounds
   - 8+ character minimum requirement
   - Secure password comparison

2. **Token Management**
   - JWT with HMAC-SHA256
   - Expiring access tokens (1 hour)
   - Refresh token rotation
   - HttpOnly cookies (in production)

3. **Database Security**
   - Parameterized queries (SQL injection prevention)
   - Per-user data scoping
   - Audit logging of all changes

4. **API Security**
   - CORS configuration
   - Rate limiting (recommended)
   - Input validation and sanitization
   - HTTPS enforcement (production)

5. **Infrastructure**
   - Environment variable encryption
   - Database connection pooling
   - Secure secret management

## 📝 Deployment

### Vercel Deployment

The project is configured for Vercel's experimental services:

```bash
# Deploy
vercel deploy

# Or via GitHub with automatic deploys
git push origin main
```

The `vercel.json` configures:
- FastAPI backend at `/api`
- Next.js frontend at `/`
- Environment variables from Neon integration

### Environment Setup (Production)

1. **Vercel Project Settings**:
   ```
   Settings → Environment Variables
   - DATABASE_URL: (from Neon integration)
   - SECRET_KEY: (generate new key)
   - BETTER_AUTH_SECRET: (generate new key)
   ```

2. **Database**:
   - Neon PostgreSQL automatically provisioned
   - SSL connections required
   - Automatic backups enabled

3. **Build**:
   ```bash
   vercel build          # Build all services
   vercel start          # Start production server
   ```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/            # Run test suite
pytest tests/test_auth.py -v  # Run specific tests
```

### Frontend Tests
```bash
cd frontend
pnpm test               # Run Jest tests
pnpm test:e2e          # Run Playwright E2E tests
```

## 📚 Documentation

- **API Docs**: http://localhost:8000/docs (FastAPI Swagger UI)
- **Design Decisions**: See `/docs/ARCHITECTURE.md`
- **ML Models**: See `/docs/ML_MODELS.md`
- **Deployment**: See `/docs/DEPLOYMENT.md`

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open pull request

## 📄 License

Proprietary - Enterprise Security Framework

## 💬 Support

For issues, feature requests, or questions:
1. Check existing issues
2. Create detailed issue with reproduction steps
3. Contact security team for sensitive issues

## 🎓 Learning Resources

- **Zero Trust**: https://www.nist.gov/publications/zero-trust-architecture
- **FastAPI**: https://fastapi.tiangolo.com
- **Next.js**: https://nextjs.org/docs
- **ML Security**: https://www.owasp.org/index.php/Machine_Learning
- **SHAP**: https://shap.readthedocs.io

---

**Version**: 1.1.0  
**Last Updated**: 2026-08-06  
**Status**: Research prototype with security hardening and explicitly labeled simulations

## Implementation boundaries

The dashboard now exposes authenticated telemetry, a 30-second refresh cadence, hybrid-cloud placement metadata, federated-learning status, and model registry metadata. Hybrid-cloud and federated-learning values are simulations; the application does not claim real cloud isolation, secure aggregation, differential privacy, external threat-intelligence feeds, or computed model-comparison metrics unless those integrations are configured and verified.

The backend requires `DATABASE_URL` and `SECRET_KEY`, uses configured CORS origins, short-lived typed access tokens, authenticated user scoping for protected routes, response security headers, and migration-managed security tables. The migration in `backend/migrations/001_security_domain.sql` is additive and must be applied through the project's normal database migration process before using the new security-domain tables.

## Verification status

- Frontend production build: passing.
- TypeScript check: passing.
- ESLint: passing with existing warnings for an unoptimized image and custom font usage.
- Backend syntax check: passing.
- Full authenticated API and database integration tests: pending a configured PostgreSQL runtime and test fixtures.
- Secure federated aggregation, external threat intelligence, email OTP delivery, and production cloud isolation: pending; these remain explicitly simulated or adapter-level features.
