# Project Directory Structure & Operational Runbook

## Adaptive Zero-Trust AI Framework for Continuous Multi-Factor Authentication

### Overview
This repository implements an enterprise-grade Adaptive Zero-Trust AI Framework designed for continuous trust evaluation, risk-based step-up authentication, explainable AI (XAI) security telemetry, federated model optimization, and hybrid cloud gateway enforcement.

---

### Final Directory Structure

```
Adaptive-Zero-Trust-AI-Framework/
├── backend/                             # Python / FastAPI Zero Trust Backend
│   ├── migrations/                      # PostgreSQL / Neon base & security schema migrations
│   │   ├── 000_base_schema.sql          # Initial user, auth & role definitions
│   │   ├── 001_security_domain.sql      # Session tracking & access logging
│   │   ├── 002_performance_monitoring.sql # Real performance latency & metrics store
│   │   ├── 003_core_infrastructure.sql  # Cloud gateways & policy definitions
│   │   ├── 004_continuous_authentication.sql # Continuous telemetry & behavioral scores
│   │   ├── 005_phase4_reporting.sql     # Executive reports & audit tracking
│   │   └── 006_auth_integrity.sql       # Session revocation status & index integrity
│   ├── models/                          # Trained machine-learning artifacts
│   │   ├── best_model.joblib            # Primary production classifier (GB/RF)
│   │   ├── behavioral_anomaly_detector.joblib # Isolation forest for anomaly scoring
│   │   ├── federated_global_model.joblib # Global aggregated model for federated learning
│   │   └── scaler.joblib                # Feature normalization pipelines
│   ├── api_documentation.py             # Swagger / OpenAPI documentation helpers
│   ├── behavioral_analysis.py           # Behavioral pattern analysis engine
│   ├── bootstrap_admin.py               # Administrator account initialization utility
│   ├── continuous_auth.py               # Continuous authentication & biometric keystroke telemetry
│   ├── database.py                      # Asynchronous Neon PostgreSQL connection pool & SQLite fallback
│   ├── device_fingerprint.py            # Device trust scoring & hardware fingerprinting
│   ├── email_service.py                 # Asynchronous SMTP client with safe development fallback
│   ├── email_verification.py            # Cryptographic OTP generation & verification
│   ├── explainable_ai.py                # XAI attribution (Normalized Feature Delta Breakdown)
│   ├── federated_learning.py            # Federated aggregation simulation & client weight updates
│   ├── hybrid_cloud.py                  # Multi-cloud gateway policy verification
│   ├── ieee_baseline_comparison.py      # Benchmark comparison utilities
│   ├── location_tracking.py             # Geo-velocity & impossible travel detection
│   ├── main.py                          # FastAPI core entrypoint, route handlers & middleware
│   ├── ml_dataset_pipeline.py           # Dataset loaders and validation preprocessors
│   ├── ml_model_training.py             # Model training & cross-validation workflows
│   ├── password_reset.py                # Cryptographic token-based password reset
│   ├── performance_tracker.py           # Real request latency & p99 percentile tracking
│   ├── rate_limiter.py                  # Token-bucket and sliding-window rate limiters
│   ├── requirements.txt                 # Backend Python production dependencies
│   ├── security.py                      # Argon2id/bcrypt hashing, JWT tokens, JWKS verification
│   ├── security_pipeline.py             # Pipeline orchestration for real-time security events
│   ├── trust_risk_engine.py             # Core Zero Trust risk scoring (0-100) & trust scores
│   └── zero_trust_policy.py             # Dynamic ABAC/RBAC policy evaluation engine
│
├── frontend/                            # Next.js 14 App Router Enterprise UI
│   ├── app/                             # Application routes (Dark-first security console)
│   │   ├── admin/                       # Administrator Command Center (RBAC protected)
│   │   │   ├── ai-monitoring/           # Real dataset sample counts & AI metrics
│   │   │   ├── audit/                   # Security audit logs with filter & search
│   │   │   ├── federated-learning/      # Distributed client aggregation dashboard
│   │   │   ├── performance/             # Real-time latency, uptime & throughput telemetry
│   │   │   ├── policies/                # Zero-trust adaptive policy management
│   │   │   ├── reports/                 # Executive report generation & export
│   │   │   ├── sessions/                # Live session monitor with instantaneous revocation
│   │   │   ├── users/                   # User directory, suspension & blocking controls
│   │   │   └── xai/                     # Model explainability audit & feature importance
│   │   ├── auth/                        # Cohesive authentication screens
│   │   │   ├── login/                   # Multi-factor login (Password + PIN + TOTP MFA)
│   │   │   ├── register/                # Account registration with strong credential validation
│   │   │   ├── forgot-password/         # Secure recovery request
│   │   │   └── reset-password/          # Cryptographic token reset
│   │   ├── cloud/                       # Hybrid cloud gateway & workload health
│   │   ├── dashboard/                   # Unified operator/user security command center
│   │   ├── federated/                   # Operator-facing federated learning simulation
│   │   ├── policies/                    # Active policy inspection
│   │   ├── security/                    # Security posture & device telemetry
│   │   ├── setup-secure-pin/            # Multi-factor 4-8 digit Secure PIN enrollment
│   │   └── verify-email/                # 6-digit email OTP verification
│   ├── components/                      # Reusable UI component library
│   │   ├── navbar.tsx                   # Role-isolated navigation sidebar & mobile drawer
│   │   ├── ui-components.tsx            # Design tokens, metric cards, badges, buttons, modals
│   │   └── user-profile-modal.tsx       # 8-part user security & identity profile modal
│   ├── lib/                             # Shared utilities, API client & state stores
│   │   ├── api.ts                       # Typed Axios/Fetch client with automatic token injection
│   │   └── auth-store.ts                # Zustand global session & auth state management
│   ├── package.json                     # Frontend dependencies & npm scripts
│   └── tailwind.config.ts               # Security design system palette & dark tokens
│
├── data/                                # Legitimate benchmark datasets
│   ├── raw/                             # Clean baseline evaluation records
│   ├── train/train.csv                  # 4,199 authentic training samples
│   ├── test/test.csv                    # 900 authentic evaluation samples
│   └── val/val.csv                      # 901 authentic validation samples
│
├── docs/                                # Technical documentation
│   ├── PERFORMANCE_MONITORING.md        # Telemetry & latency tracking documentation
│   └── SOURCE_CODE_AUDIT_INSTRUCTIONS.md# Security verification guidelines
│
├── public/                              # Branding assets & SVG icons
├── tests/                               # Comprehensive Automated Test Suite
│   ├── conftest.py                      # Windows async event loop setup for psycopg
│   ├── test_admin_security.py           # Admin privileges, session revocation, user lifecycle
│   ├── test_authentication.py           # Argon2id, bcrypt PIN, JWT, 404 for removed WebAuthn
│   ├── test_continuous_auth.py          # Continuous scoring & keystroke dynamics
│   ├── test_database.py                 # Asynchronous pool lifecycle & queries
│   ├── test_federated_learning.py       # Multi-client model aggregation rounds
│   ├── test_health_smoke.py             # Health probe & status endpoints
│   ├── test_ml_pipeline.py              # ML classifier loading, prediction & schema checks
│   ├── test_security_remediation.py     # Fail-closed fallbacks & remediation workflows
│   └── test_zero_trust_policy.py        # Rule engines, context evaluation & policy decisions
│
├── verify_e2e_suite.py                  # 14-step automated end-to-end verification pipeline
├── run_neon_migration.py                # Database migration executor
├── run_all.bat                          # One-click dual-service launcher
├── run_backend.bat                      # Dedicated backend service launcher
├── run_frontend.bat                     # Dedicated frontend service launcher
├── run_tests.bat                        # Automated test runner script
├── setup-windows.bat                    # One-command Windows dependency installer & environment setup
├── .env.example                         # Sanitized configuration template with zero exposed secrets
└── README.md                            # Executive project overview & architecture specification
```

---

### Commands Required to Run the Application

#### 1. Quick Automated Setup (Windows)
```cmd
setup-windows.bat
```
This checks Node.js, npm, Python, installs frontend and backend dependencies, sets up virtual environments, and creates local configuration files if absent.

#### 2. Manual Environment Setup

**Backend (Python 3.10+):**
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

**Frontend (Node.js 18+):**
```bash
cd frontend
npm install
```

#### 3. Database Migration
Apply the PostgreSQL / SQLite migrations:
```bash
python run_neon_migration.py
```

#### 4. Running the Development Services

**Option A — Unified Windows Script:**
```cmd
run_all.bat
```

**Option B — Independent Terminals:**
- **Terminal 1 (Backend API):**
  ```bash
  cd backend
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
  ```
  API Docs: `http://localhost:8000/docs`
  Health: `http://localhost:8000/health`

- **Terminal 2 (Frontend UI):**
  ```bash
  cd frontend
  npm run dev
  ```
  Application Console: `http://localhost:3000`

#### 5. Executing the Complete Test Suite

- **Run all automated backend unit & integration tests:**
  ```bash
  backend\.venv\Scripts\python.exe -m pytest tests -v
  ```

- **Run frontend TypeScript & lint verification:**
  ```bash
  npm --prefix frontend run type-check
  npm --prefix frontend run build
  ```

- **Run the full 14-step end-to-end verification suite:**
  ```bash
  backend\.venv\Scripts\python.exe verify_e2e_suite.py
  ```
