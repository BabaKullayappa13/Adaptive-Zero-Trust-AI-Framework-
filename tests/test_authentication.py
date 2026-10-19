"""
Authentication, Token Validation, Secret PIN, and Neon Auth JWKS Tests
"""

import sys
import uuid
from pathlib import Path
import pytest
from datetime import timedelta

backend_dir = str(Path(__file__).resolve().parent.parent / "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from security import (
    hash_password, verify_password,
    hash_secret_pin, verify_secret_pin,
    create_access_token, decode_token,
    get_jwks_status
)


def test_password_hashing():
    """Verify Argon2 / Bcrypt password hashing and verification"""
    password = "ZeroTrustSecurity2026!#"
    pwd_hash = hash_password(password)
    assert pwd_hash != password
    assert verify_password(password, pwd_hash) is True
    assert verify_password("WrongPassword!", pwd_hash) is False


def test_secret_pin_hashing():
    """Verify 6-digit Secret PIN hashing and constant-time verification"""
    pin = "854921"
    pin_hash = hash_secret_pin(pin)
    assert pin_hash != pin
    assert verify_secret_pin(pin, pin_hash) is True
    assert verify_secret_pin("123456", pin_hash) is False


def test_jwt_creation_and_decoding():
    """Verify internal HMAC HS256 token generation and decoding"""
    user_id = str(uuid.uuid4())
    token = create_access_token(
        user_id=user_id,
        email="operator@zerotrust.cloud",
        role="admin",
        expires_delta=timedelta(minutes=30)
    )
    assert isinstance(token, str)
    assert len(token) > 20

    decoded = decode_token(token)
    assert decoded is not None
    assert decoded["sub"] == user_id
    assert decoded["role"] == "admin"
    assert decoded["email"] == "operator@zerotrust.cloud"


def test_neon_jwks_status():
    """Verify Neon Auth JWKS status endpoint reports configuration cleanly"""
    status = get_jwks_status()
    assert "jwks_url" in status
    assert "configured" in status
    assert "algorithm" in status
    assert status["algorithm"] == "RS256"


@pytest.mark.asyncio
async def test_webauthn_endpoints_removed_404():
    """Verify that all WebAuthn/Passkey routes have been strictly removed and return 404"""
    import httpx
    from main import app
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Registration options
        r1 = await client.post("/api/auth/webauthn/register/options", json={})
        assert r1.status_code == 404, f"Expected 404, got {r1.status_code}"

        # Login options
        r2 = await client.post("/api/auth/webauthn/login/options", json={})
        assert r2.status_code == 404, f"Expected 404, got {r2.status_code}"

        # Login verify
        r3 = await client.post("/api/auth/webauthn/login/verify", json={})
        assert r3.status_code == 404, f"Expected 404, got {r3.status_code}"

        # Credentials list
        r4 = await client.get("/api/auth/webauthn/credentials")
        assert r4.status_code == 404, f"Expected 404, got {r4.status_code}"


@pytest.mark.asyncio
async def test_admin_single_session_revocation():
    """Verify admin can revoke a single active Zero Trust session immediately"""
    import httpx
    import secrets
    from main import app
    from database import db_manager
    async with db_manager.get_connection() as conn:
        test_uid = str(uuid.uuid4())
        session_token = secrets.token_hex(32)
        # Create test user
        await conn.execute(
            """INSERT INTO users (id, email, password_hash, role, is_active, email_verified, created_at)
               VALUES (%s, %s, %s, 'operator', TRUE, TRUE, NOW())""",
            (test_uid, f"test-{test_uid[:8]}@zerotrust.com", hash_password("TestPassword123!"))
        )
        # Create test session
        await conn.execute(
            """INSERT INTO user_sessions (user_id, session_token, trust_score, risk_score, is_active, session_status, created_at)
               VALUES (%s, %s, 85.0, 15.0, TRUE, 'ACTIVE', NOW()) RETURNING id""",
            (test_uid, session_token)
        )
        s_id = (await (await conn.execute("SELECT id FROM user_sessions WHERE user_id = %s ORDER BY id DESC LIMIT 1", (test_uid,))).fetchone())[0]
        await conn.commit()

    admin_token = create_access_token(user_id="admin", email="admin@zerotrust.cloud", role="admin")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Revoke single session
        resp = await client.post(
            f"/api/admin/sessions/{s_id}/revoke",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "SUCCESS"

    async with db_manager.get_connection() as conn:
        # Verify session is now inactive and REVOKED in DB
        s_chk = await conn.execute("SELECT is_active, session_status FROM user_sessions WHERE id = %s", (s_id,))
        s_row = await s_chk.fetchone()
        assert s_row[0] is False or s_row[0] == 0
        assert s_row[1] == "REVOKED"


@pytest.mark.asyncio
async def test_unverified_email_login_rejection():
    """Verify unverified users are strictly blocked with 403 on login"""
    import httpx
    from main import app
    from database import db_manager
    test_uid = str(uuid.uuid4())
    unverified_email = f"unverified-{test_uid[:8]}@zerotrust.com"

    async with db_manager.get_connection() as conn:
        await conn.execute(
            """INSERT INTO users (id, email, password_hash, role, is_active, email_verified, created_at)
               VALUES (%s, %s, %s, 'operator', TRUE, FALSE, NOW())""",
            (test_uid, unverified_email, hash_password("ValidPassword123!"))
        )
        await conn.commit()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/auth/login", json={
            "email": unverified_email,
            "password": "ValidPassword123!"
        })
        assert resp.status_code == 403
        data = resp.json()
        assert data.get("email_verified") is False or "verified" in data.get("detail", "").lower()


@pytest.mark.asyncio
async def test_login_ai_evaluation_isolation_forest_pipeline():
    """Verify login MFA completion executes Isolation Forest ML evaluation, generates real scores, and persists to xai_decision_records"""
    import httpx
    import json
    from main import app
    from database import db_manager

    test_uid = str(uuid.uuid4())
    test_email = f"ai-eval-{test_uid[:8]}@zerotrust.com"
    raw_pin = "741852"

    async with db_manager.get_connection() as conn:
        await conn.execute(
            """INSERT INTO users 
               (id, email, password_hash, pin_hash, role, is_active, email_verified, secure_pin_configured, created_at)
               VALUES (%s, %s, %s, %s, 'operator', TRUE, TRUE, TRUE, NOW())""",
            (test_uid, test_email, hash_password("SecurePassword2026!"), hash_secret_pin(raw_pin))
        )
        await conn.commit()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Submit credentials to initiate MFA challenge
        login_res = await client.post("/api/auth/login", json={
            "email": test_email,
            "password": "SecurePassword2026!"
        })
        assert login_res.status_code == 200
        l_data = login_res.json()
        assert l_data["status"] == "MFA_REQUIRED"
        challenge_token = l_data["challenge_token"]

        # Step 2: Complete MFA with Secure PIN and behavioral telemetry snapshot
        telemetry = {
            "keystroke_speed": 4.2,
            "keystroke_variance": 0.05,
            "mouse_speed": 380.0,
            "mouse_distance": 220.0,
            "click_count": 4,
            "scroll_count": 2,
            "idle_seconds": 1
        }
        complete_res = await client.post("/api/auth/login-mfa-complete", json={
            "email": test_email,
            "challenge_token": challenge_token,
            "secret_pin": raw_pin,
            "telemetry": telemetry
        })
        assert complete_res.status_code == 200
        c_data = complete_res.json()
        assert c_data["status"] == "SUCCESS"
        assert "access_token" in c_data
        assert "refresh_token" in c_data
        assert "session_id" in c_data

        # Verify genuine AI evaluation payload
        evaluation = c_data.get("evaluation")
        assert evaluation is not None
        assert "status" in evaluation
        assert "ai_anomaly_status" in evaluation
        assert "model_status" in evaluation
        assert "trust_score" in evaluation
        assert "risk_score" in evaluation
        assert "reasons" in evaluation
        assert len(evaluation["reasons"]) > 0

        # Step 3: Check database persistence in xai_decision_records
        sid = c_data["session_id"]
        async with db_manager.get_connection() as conn:
            x_res = await conn.execute(
                "SELECT session_id, model_version, prediction, decision, explanation FROM xai_decision_records WHERE session_id = %s",
                (sid,)
            )
            x_row = await x_res.fetchone()
            assert x_row is not None
            assert x_row[0] == sid
            assert x_row[3] in ("ALLOW", "CHALLENGE", "STEP_UP", "DENY")
            # Explanation must be valid JSON / JSONB
            explanation_val = x_row[4]
            if isinstance(explanation_val, str):
                explanation_val = json.loads(explanation_val)
            assert "summary" in explanation_val or "reasons" in explanation_val


@pytest.mark.asyncio
async def test_security_recalculate_no_prior_session():
    """Verify /api/security/recalculate creates a fallback session and runs ML explanation without crashing on missing active session"""
    import httpx
    from main import app
    from database import db_manager

    test_uid = str(uuid.uuid4())
    test_email = f"recalc-{test_uid[:8]}@zerotrust.com"

    async with db_manager.get_connection() as conn:
        await conn.execute(
            """INSERT INTO users (id, email, password_hash, role, is_active, email_verified, created_at)
               VALUES (%s, %s, %s, 'operator', TRUE, TRUE, NOW())""",
            (test_uid, test_email, hash_password("PasswordRecalc123!"))
        )
        await conn.commit()

    user_token = create_access_token(user_id=test_uid, email=test_email, role="operator")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # User has NO existing row in user_sessions; recalculate must handle creating session cleanly
        resp = await client.post(
            "/api/security/recalculate",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"user_id": test_uid}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "SUCCESS"
        assert "decision" in data
        assert "trust_score" in data
        assert "risk_score" in data
        assert "user_explanation" in data
        assert "feature_importance" in data
        assert len(data["feature_importance"]) > 0


@pytest.mark.asyncio
async def test_auth_refresh_token_rotation():
    """Verify refresh token rotation returns new tokens and rejects invalid tokens"""
    import httpx
    from main import app
    from database import db_manager
    from security import create_refresh_token

    test_uid = str(uuid.uuid4())
    test_email = f"refresh-{test_uid[:8]}@zerotrust.com"

    async with db_manager.get_connection() as conn:
        await conn.execute(
            """INSERT INTO users (id, email, password_hash, role, is_active, email_verified, created_at)
               VALUES (%s, %s, %s, 'operator', TRUE, TRUE, NOW())""",
            (test_uid, test_email, hash_password("RefreshPassword123!"))
        )
        await conn.commit()

    valid_refresh = create_refresh_token(user_id=test_uid, session_id="9999")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Valid refresh
        res = await client.post("/api/auth/refresh", json={"refresh_token": valid_refresh})
        assert res.status_code == 200
        r_data = res.json()
        assert "access_token" in r_data
        assert "refresh_token" in r_data

        # Invalid token rejection
        bad_res = await client.post("/api/auth/refresh", json={"refresh_token": "invalid.corrupt.token"})
        assert bad_res.status_code == 401
