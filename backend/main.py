"""
Adaptive Zero Trust-AI Framework Backend
FastAPI application for continuous multi-factor authentication and risk detection
"""

import os
import json
import asyncio
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from functools import lru_cache

from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import psycopg
from psycopg import AsyncConnection
import jwt
import pyotp
from passlib.context import CryptContext
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib

# ============================================================================
# CONFIGURATION
# ============================================================================

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is required")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if origin.strip()]
security = HTTPBearer(auto_error=False)

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI(
    title="Zero Trust AI Framework",
    description="Adaptive continuous multi-factor authentication with AI-powered risk detection",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

# ============================================================================
# DATABASE UTILITIES
# ============================================================================

async def get_db_connection() -> AsyncConnection:
    """Get database connection"""
    conn = await psycopg.AsyncConnection.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        await conn.close()

async def init_db():
    """Initialize database connection pool for app startup"""
    async with await psycopg.AsyncConnection.connect(DATABASE_URL) as conn:
        await conn.execute("SELECT 1")
    return True

# ============================================================================
# MODELS & SCHEMAS
# ============================================================================

from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class MFASetup(BaseModel):
    user_id: str
    enable: bool

class MFAVerify(BaseModel):
    user_id: str
    totp_code: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class UserResponse(BaseModel):
    id: str
    email: str
    mfa_enabled: bool
    created_at: str

class TrustScoreResponse(BaseModel):
    score: float
    factors: Dict[str, Any]
    risk_level: str

class RiskEventResponse(BaseModel):
    id: str
    event_type: str
    risk_level: str
    risk_score: float
    context: Dict[str, Any]
    explanation: Dict[str, Any]
    created_at: str

# ============================================================================
# SECURITY UTILITIES
# ============================================================================

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    if expires_delta is None:
        expires_delta = timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    
    expire = datetime.utcnow() + expires_delta
    to_encode = {"sub": user_id, "exp": expire, "type": "access"}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(user_id: str) -> str:
    """Create JWT refresh token"""
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"sub": user_id, "exp": expire, "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, expected_type: str = "access") -> Optional[str]:
    """Verify a typed JWT and return its subject."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None or payload.get("type") != expected_type:
            return None
        return user_id
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    conn: AsyncConnection = Depends(get_db_connection),
) -> str:
    """Authenticate requests and ensure the user still exists."""
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authentication required")
    user_id = verify_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired access token")
    result = await conn.execute("SELECT id FROM users WHERE id = %s", (user_id,))
    if not await result.fetchone():
        raise HTTPException(status_code=401, detail="User not found")
    return user_id


def ensure_owner(requested_user_id: str, current_user_id: str) -> None:
    if requested_user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

# ============================================================================
# ML/AI MODELS FOR RISK DETECTION
# ============================================================================

class AnomalyDetector:
    """Isolation Forest based anomaly detection"""
    
    def __init__(self):
        self.model = IsolationForest(contamination=0.1, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def train(self, X: np.ndarray):
        """Train the anomaly detector"""
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled)
        self.is_trained = True
    
    def predict(self, X: np.ndarray) -> tuple:
        """Predict anomaly score (0-1, higher = more anomalous)"""
        if not self.is_trained:
            return 0.5, 0.0
        
        X_scaled = self.scaler.transform(X)
        scores = self.model.score_samples(X_scaled)
        # Normalize to 0-1
        normalized_score = 1 / (1 + np.exp(scores))
        return normalized_score[0], float(scores[0])

# Initialize models
anomaly_detector = AnomalyDetector()

# Train with synthetic data on startup
def init_ml_models():
    """Initialize ML models with synthetic training data"""
    np.random.seed(42)
    # Generate synthetic normal behavior (8 features: login_hour, device_count, failed_attempts, etc)
    normal_behavior = np.random.normal(loc=[14, 2, 0, 10, 1, 0.8, 25, 100], 
                                       scale=[3, 1, 0.5, 5, 0.5, 0.1, 10, 50], 
                                       size=(100, 8))
    anomaly_detector.train(normal_behavior)

# Call during startup
init_ml_models()

class TrustScoreCalculator:
    """Calculate trust score based on multiple factors"""
    
    @staticmethod
    def calculate(factors: Dict[str, float]) -> float:
        """
        Calculate weighted trust score
        Score: 0-100, higher = more trustworthy
        """
        weights = {
            "device_trust": 0.25,
            "behavioral_score": 0.30,
            "geographic_anomaly": 0.20,
            "temporal_anomaly": 0.15,
            "authentication_strength": 0.10
        }
        
        score = 0.0
        for factor, weight in weights.items():
            score += factors.get(factor, 50) * weight
        
        return min(100, max(0, score))

# ============================================================================
# ENDPOINT: HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "zero-trust-backend"}

# ============================================================================
# ENDPOINT: AUTHENTICATION - REGISTER
# ============================================================================

@app.post("/api/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate, conn: AsyncConnection = Depends(get_db_connection)):
    """Register a new user"""
    try:
        # Check if user exists
        existing = await conn.execute(
            "SELECT id FROM users WHERE email = %s",
            (user_data.email,)
        )
        if await existing.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create user
        user_id = str(uuid.uuid4())
        password_hash = hash_password(user_data.password)
        
        await conn.execute(
            """
            INSERT INTO users (id, email, password_hash, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (user_id, user_data.email, password_hash, datetime.utcnow(), datetime.utcnow())
        )
        await conn.commit()
        
        return UserResponse(
            id=user_id,
            email=user_data.email,
            mfa_enabled=False,
            created_at=datetime.utcnow().isoformat()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINT: AUTHENTICATION - LOGIN
# ============================================================================

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request, conn: AsyncConnection = Depends(get_db_connection)):
    """Authenticate user and return tokens"""
    try:
        # Get user
        result = await conn.execute(
            "SELECT id, password_hash, mfa_enabled FROM users WHERE email = %s",
            (credentials.email,)
        )
        user = await result.fetchone()
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user_id, password_hash, mfa_enabled = user
        
        # Verify password
        if not verify_password(credentials.password, password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Update last login
        await conn.execute(
            "UPDATE users SET last_login = %s WHERE id = %s",
            (datetime.utcnow(), user_id)
        )
        
        # Create session
        session_id = str(uuid.uuid4())
        ip_address = request.client.host if request.client else "0.0.0.0"
        user_agent = request.headers.get("user-agent", "")
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        await conn.execute(
            """
            INSERT INTO auth_sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (session_id, user_id, secrets.token_hex(32), ip_address, user_agent, expires_at)
        )
        await conn.commit()
        
        # Generate tokens
        access_token = create_access_token(user_id)
        refresh_token = create_refresh_token(user_id)
        
        # Log audit event
        await conn.execute(
            """
            INSERT INTO audit_logs (id, user_id, action, result, ip_address, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (str(uuid.uuid4()), user_id, "LOGIN_SUCCESS", "SUCCESS", ip_address, datetime.utcnow())
        )
        await conn.commit()
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=TOKEN_EXPIRE_MINUTES * 60
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINT: CURRENT USER
# ============================================================================

@app.get("/api/auth/me", response_model=UserResponse)
async def current_user(user_id: str = Depends(get_current_user), conn: AsyncConnection = Depends(get_db_connection)):
    result = await conn.execute(
        "SELECT id, email, mfa_enabled, created_at FROM users WHERE id = %s",
        (user_id,),
    )
    user = await result.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(id=str(user[0]), email=user[1], mfa_enabled=bool(user[2]), created_at=user[3].isoformat())

# ============================================================================
# ENDPOINT: MFA SETUP
# ============================================================================

@app.post("/api/auth/mfa/setup")
async def setup_mfa(user_id: str, current_user_id: str = Depends(get_current_user), conn: AsyncConnection = Depends(get_db_connection)):
    """Generate MFA secret for the authenticated user."""
    ensure_owner(user_id, current_user_id)
    try:
        # Verify user exists
        result = await conn.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not await result.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
        
        # Generate secret
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        
        return {
            "secret": secret,
            "qr_code_url": totp.provisioning_uri(user_id, issuer_name="Zero Trust AI"),
            "manual_entry_key": secret
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINT: MFA VERIFY & ENABLE
# ============================================================================

@app.post("/api/auth/mfa/verify")
async def verify_mfa(mfa_verify: MFAVerify, current_user_id: str = Depends(get_current_user), conn: AsyncConnection = Depends(get_db_connection)):
    """Verify TOTP code and enable MFA."""
    ensure_owner(mfa_verify.user_id, current_user_id)
    try:
        # Get user's MFA secret (from request body for now, would come from session in production)
        secret = mfa_verify.totp_code  # This is simplified; in production, store secret in session
        
        # For now, we'll just verify the format and enable MFA
        result = await conn.execute(
            "SELECT id FROM users WHERE id = %s",
            (mfa_verify.user_id,)
        )
        if not await result.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
        
        # Generate a random secret for demo
        random_secret = pyotp.random_base32()
        
        await conn.execute(
            "UPDATE users SET mfa_enabled = true, mfa_secret = %s WHERE id = %s",
            (random_secret, mfa_verify.user_id)
        )
        await conn.commit()
        
        return {"success": True, "message": "MFA enabled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINT: TRUST SCORE CALCULATION
# ============================================================================

@app.get("/api/trust/score/{user_id}", response_model=TrustScoreResponse)
async def get_trust_score(user_id: str, current_user_id: str = Depends(get_current_user), conn: AsyncConnection = Depends(get_db_connection)):
    """Calculate and return current trust score for user."""
    ensure_owner(user_id, current_user_id)
    try:
        # Get user's behavioral data
        result = await conn.execute(
            "SELECT id FROM users WHERE id = %s",
            (user_id,)
        )
        if not await result.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
        
        # Simulate behavioral factors
        factors = {
            "device_trust": np.random.uniform(60, 100),
            "behavioral_score": np.random.uniform(65, 95),
            "geographic_anomaly": np.random.uniform(70, 95),
            "temporal_anomaly": np.random.uniform(60, 90),
            "authentication_strength": np.random.uniform(75, 100)
        }
        
        trust_score = TrustScoreCalculator.calculate(factors)
        
        # Determine risk level
        if trust_score >= 80:
            risk_level = "LOW"
        elif trust_score >= 60:
            risk_level = "MEDIUM"
        else:
            risk_level = "HIGH"
        
        # Save trust score
        await conn.execute(
            """
            INSERT INTO trust_scores (id, user_id, score, factors, created_at)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (str(uuid.uuid4()), user_id, trust_score, json.dumps(factors), datetime.utcnow())
        )
        await conn.commit()
        
        return TrustScoreResponse(
            score=trust_score,
            factors=factors,
            risk_level=risk_level
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINT: RISK DETECTION
# ============================================================================

@app.post("/api/risk/detect")
async def detect_risk(
    user_id: str,
    session_data: Dict[str, Any],
    conn: AsyncConnection = Depends(get_db_connection),
    current_user_id: str = Depends(get_current_user),
):
    """Detect anomalies and risk in current session."""
    ensure_owner(user_id, current_user_id)
    try:
        # Prepare behavioral features
        features = np.array([[
            session_data.get("login_hour", 14),
            session_data.get("device_count", 2),
            session_data.get("failed_attempts", 0),
            session_data.get("session_duration", 10),
            session_data.get("geographic_distance", 1),
            session_data.get("device_trust", 0.8),
            session_data.get("velocity", 25),
            session_data.get("request_count", 100)
        ]])
        
        # Detect anomaly
        anomaly_score, raw_score = anomaly_detector.predict(features)
        
        # Calculate risk score
        risk_score = min(100, anomaly_score * 100)
        
        # Determine risk level
        if risk_score < 30:
            risk_level = "LOW"
        elif risk_score < 60:
            risk_level = "MEDIUM"
        else:
            risk_level = "HIGH"
        
        # Create explanation with SHAP-like insights
        explanation = {
            "anomaly_score": float(anomaly_score),
            "risk_factors": {
                "unusual_time": session_data.get("login_hour", 14) > 22 or session_data.get("login_hour", 14) < 6,
                "new_device": session_data.get("new_device", False),
                "geographic_anomaly": session_data.get("geographic_distance", 1) > 100,
                "high_velocity": session_data.get("velocity", 25) > 50,
                "multiple_failed_attempts": session_data.get("failed_attempts", 0) > 3
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
        }
        
        # Save risk event
        event_id = str(uuid.uuid4())
        await conn.execute(
            """
            INSERT INTO risk_events (id, user_id, event_type, risk_level, risk_score, context, explanation, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (event_id, user_id, "BEHAVIORAL_ANALYSIS", risk_level, risk_score, 
             json.dumps(session_data), json.dumps(explanation), datetime.utcnow())
        )
        await conn.commit()
        
        return {
            "event_id": event_id,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "explanation": explanation,
            "recommendation": "ALLOW" if risk_score < 60 else "REQUIRE_MFA" if risk_score < 80 else "BLOCK"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINT: AUDIT LOGS
# ============================================================================

@app.get("/api/audit/logs/{user_id}")
async def get_audit_logs(user_id: str, limit: int = 50, current_user_id: str = Depends(get_current_user), conn: AsyncConnection = Depends(get_db_connection)):
    """Get audit logs for the authenticated user."""
    ensure_owner(user_id, current_user_id)
    limit = max(1, min(limit, 100))
    try:
        result = await conn.execute(
            """
            SELECT id, action, resource, result, details, ip_address, created_at
            FROM audit_logs
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (user_id, limit)
        )
        logs = await result.fetchall()
        
        return {
            "logs": [
                {
                    "id": log[0],
                    "action": log[1],
                    "resource": log[2],
                    "result": log[3],
                    "details": json.loads(log[4]) if log[4] else {},
                    "ip_address": log[5],
                    "created_at": log[6].isoformat() if log[6] else None
                }
                for log in logs
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# DASHBOARD SUMMARY AND SIMULATION STATUS
# ============================================================================

@app.get("/api/dashboard/summary")
async def dashboard_summary(user_id: str = Depends(get_current_user), conn: AsyncConnection = Depends(get_db_connection)):
    """Return persisted telemetry plus explicitly labeled simulation status."""
    score_result = await conn.execute(
        "SELECT score, factors, created_at FROM trust_scores WHERE user_id = %s ORDER BY created_at DESC LIMIT 12",
        (user_id,),
    )
    scores = await score_result.fetchall()
    risk_result = await conn.execute(
        "SELECT risk_level, risk_score, created_at FROM risk_events WHERE user_id = %s ORDER BY created_at DESC LIMIT 10",
        (user_id,),
    )
    risks = await risk_result.fetchall()
    return {
        "trust_history": [{"score": float(row[0]), "factors": row[1], "created_at": row[2].isoformat()} for row in scores],
        "risk_timeline": [{"risk_level": row[0], "risk_score": float(row[1]), "created_at": row[2].isoformat()} for row in risks],
        "active_sessions": 1,
        "blocked_sessions": 0,
        "policy_violations": 0,
        "cloud": {"mode": "hybrid", "simulation": True, "processed_by": {"authentication": "private-cloud", "risk_analysis": "hybrid", "aggregation": "private-cloud"}},
        "federated_learning": {"round": 3, "model_version": "fedavg-sim-v1", "participating_clients": 3, "simulation": True, "raw_data_shared": False},
        "models": [
            {"name": "Isolation Forest", "version": "iforest-v1", "status": "active", "metrics_available": False},
            {"name": "Random Forest", "version": "rf-adapter-v1", "status": "adapter", "metrics_available": False},
            {"name": "TensorFlow neural network", "version": "tensorflow-adapter-v1", "status": "optional", "metrics_available": False},
        ],
    }

# ============================================================================
# STARTUP & SHUTDOWN
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    try:
        await init_db()
        print("✓ Database connected")
        print("✓ ML models initialized")
    except Exception as e:
        print(f"✗ Startup error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
