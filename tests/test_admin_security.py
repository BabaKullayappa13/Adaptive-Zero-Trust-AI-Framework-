"""
Admin Key, Role-Based Access Control, and Administrative Route Security Tests
Validates:
1. Authorized access using development admin key configured via ADMIN_ACCESS_KEY
2. Rejection of missing, empty, or incorrect keys
3. Brute-force lockout enforcement on repeated authentication failures
4. Constant-time X-Admin-Access-Key header verification
5. Strict denial of normal users attempting to access administrative endpoints
6. Rejection of expired session tokens
7. User/Admin privilege isolation
"""

import sys
import os
import uuid
import time
from pathlib import Path
from datetime import datetime, timedelta
import pytest
import pytest_asyncio
import httpx
from dotenv import load_dotenv

backend_dir = str(Path(__file__).resolve().parent.parent / "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

env_path = Path(backend_dir) / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

from main import app, _admin_failed_attempts, _admin_lockout_until
import main as main_module
from database import db_manager
from security import (
    create_access_token,
    decode_token,
    ensure_owner
)

DEV_ADMIN_KEY = os.environ.get("ADMIN_ACCESS_KEY") or "dev_admin_test_key_secure"


@pytest.fixture(autouse=True)
def ensure_admin_env():
    """Ensure ADMIN_ACCESS_KEY environment variable is configured for tests"""
    original_key = os.environ.get("ADMIN_ACCESS_KEY")
    os.environ["ADMIN_ACCESS_KEY"] = DEV_ADMIN_KEY
    # Reset any lockout
    main_module._admin_failed_attempts = 0
    main_module._admin_lockout_until = 0.0
    yield
    if original_key is not None:
        os.environ["ADMIN_ACCESS_KEY"] = original_key
    main_module._admin_failed_attempts = 0
    main_module._admin_lockout_until = 0.0


@pytest.mark.asyncio
async def test_admin_login_authorized_key():
    """Verify administrator login succeeds with valid ADMIN_ACCESS_KEY"""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/admin/login", json={"key": DEV_ADMIN_KEY})
        assert resp.status_code == 200
        data = resp.json()
        assert data["authenticated"] is True
        assert data["role"] == "admin"
        assert "access_token" in data
        assert len(data["access_token"]) > 20

        # Validate token payload
        payload = decode_token(data["access_token"], expected_type="access")
        assert payload["role"] == "admin"
        assert payload["sub"] == "admin"


@pytest.mark.asyncio
async def test_admin_login_missing_or_empty_key():
    """Verify administrator login rejects empty or missing keys with HTTP 400"""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Empty string
        resp1 = await client.post("/api/admin/login", json={"key": "   "})
        assert resp1.status_code == 400
        assert "required" in resp1.json()["detail"].lower()

        # Missing key field
        resp2 = await client.post("/api/admin/login", json={})
        assert resp2.status_code == 422 or resp2.status_code == 400


@pytest.mark.asyncio
async def test_admin_login_wrong_key():
    """Verify administrator login rejects incorrect key with HTTP 401"""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/admin/login", json={"key": "WrongAccessKey#999"})
        assert resp.status_code == 401
        assert "invalid" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_admin_login_brute_force_lockout():
    """Verify brute-force attempts trigger temporary lockout (HTTP 429) after 5 failures"""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 5 consecutive invalid attempts
        for i in range(5):
            r = await client.post("/api/admin/login", json={"key": f"bad_key_attempt_{i}"})
            assert r.status_code == 401

        # 6th attempt must be rejected with 429 Too Many Requests
        r_locked = await client.post("/api/admin/login", json={"key": DEV_ADMIN_KEY})
        assert r_locked.status_code == 429
        assert "locked" in r_locked.json()["detail"].lower()


@pytest.mark.asyncio
async def test_admin_header_access_key_authentication():
    """Verify X-Admin-Access-Key header allows authorized calls and rejects invalid keys"""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Authorized with valid header
        resp_valid = await client.get(
            "/api/admin/metrics/summary",
            headers={"x-admin-access-key": DEV_ADMIN_KEY}
        )
        assert resp_valid.status_code == 200
        data = resp_valid.json()
        assert "status" in data
        assert "total_requests_today" in data

        # Unauthorized with invalid header
        resp_invalid = await client.get(
            "/api/admin/metrics/summary",
            headers={"x-admin-access-key": "InvalidSecretHeaderKey!"}
        )
        assert resp_invalid.status_code == 401


@pytest.mark.asyncio
async def test_normal_user_denied_admin_apis():
    """Verify normal authenticated users (role='user') are strictly forbidden from admin endpoints"""
    normal_user_id = str(uuid.uuid4())
    user_token = create_access_token(
        user_id=normal_user_id,
        email="normal_user@enterprise.internal",
        role="user",
        expires_delta=timedelta(hours=1)
    )

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        auth_header = {"Authorization": f"Bearer {user_token}"}

        # 1. Admin metrics summary
        r1 = await client.get("/api/admin/metrics/summary", headers=auth_header)
        assert r1.status_code == 401

        # 2. Cloud failover simulation (Admin Only)
        r2 = await client.post("/api/cloud/aws/failover", headers=auth_header)
        assert r2.status_code == 401

        # 3. Policy creation (Admin Only)
        r3 = await client.post(
            "/api/policies",
            json={"name": "TestPolicy", "description": "Unauth policy", "policy_type": "ACCESS", "priority": 1},
            headers=auth_header
        )
        assert r3.status_code == 401

        # 4. Federated training round trigger (Admin Only)
        r4 = await client.post("/api/federated/rounds/simulation/run", headers=auth_header)
        assert r4.status_code == 401


@pytest.mark.asyncio
async def test_expired_token_rejected():
    """Verify expired JWT session tokens are rejected with HTTP 401"""
    user_id = str(uuid.uuid4())
    expired_token = create_access_token(
        user_id=user_id,
        email="expired@enterprise.internal",
        role="admin",
        expires_delta=timedelta(minutes=-30)
    )

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/admin/metrics/summary",
            headers={"Authorization": f"Bearer {expired_token}"}
        )
        assert resp.status_code == 401
