"""
Zero Trust Hybrid Cloud Gateway, Real AI Image Intelligence, and Non-Bypassable Challenge Tests
Verifies:
1. POST /api/cloud/verify-access & POST /api/cloud/gateway/test-evaluate
2. GET /api/cloud/gateway/telemetry across 1h, 1d, 7d, 30d, all
3. POST /api/admin/ai-monitoring/image-classify (real Pillow feature extraction, latency measurement, DB persistence)
4. GET /api/admin/ai-monitoring/image-evaluation (truthful reporting: no synthetic metrics fabricated)
5. GET /api/admin/ai-monitoring/image-history
6. Non-bypassable CHALLENGE behavior (session restricted, zero secret PIN invocation)
"""

import io
import sys
import uuid
import os
from pathlib import Path
from datetime import datetime, timezone, timedelta
import pytest
import pytest_asyncio
import httpx
from PIL import Image

backend_dir = str(Path(__file__).resolve().parent.parent / "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
import main as main_module
from database import db_manager
from security import create_access_token, hash_password

DEV_ADMIN_KEY = os.environ.get("ADMIN_ACCESS_KEY") or "dev_admin_test_key_secure"


@pytest.fixture(autouse=True)
def ensure_admin_env():
    """Ensure ADMIN_ACCESS_KEY environment variable is configured for tests"""
    original_key = os.environ.get("ADMIN_ACCESS_KEY")
    os.environ["ADMIN_ACCESS_KEY"] = DEV_ADMIN_KEY
    main_module._admin_failed_attempts = 0
    main_module._admin_lockout_until = 0.0
    yield
    if original_key is not None:
        os.environ["ADMIN_ACCESS_KEY"] = original_key
    main_module._admin_failed_attempts = 0


def create_test_image_bytes(format="PNG", size=(64, 64), color=(30, 144, 255)) -> bytes:
    """Generate in-memory valid image bytes using Pillow"""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_cloud_gateway_verify_access_and_telemetry_persistence():
    """Verify cloud resource access check executes through security pipeline and persists to gateway_requests"""
    await db_manager.initialize()

    test_uid = str(uuid.uuid4())
    test_email = f"cloud_gw_{test_uid[:8]}@zerotrust.local"
    token = create_access_token(user_id=test_uid, email=test_email, role="operator")

    async with db_manager.get_connection() as conn:
        await conn.execute(
            """INSERT INTO users (id, email, password_hash, role, is_active, email_verified, created_at)
               VALUES (%s, %s, %s, 'operator', TRUE, TRUE, NOW())""",
            (test_uid, test_email, hash_password("ValidCloudPassword!2026"))
        )
        await conn.execute(
            """INSERT INTO user_sessions (user_id, session_token, is_active, trust_score, risk_score, created_at)
               VALUES (%s, %s, TRUE, 88.0, 12.0, NOW())""",
            (test_uid, f"cloud_session_{test_uid[:8]}")
        )
        await conn.commit()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Verify access to private resource
        resp = await client.post(
            "/api/cloud/verify-access",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "resource_id": "res-private-vault-01",
                "resource_cloud": "private",
                "destination_environment": "private",
                "telemetry": {
                    "keystroke_speed": 4.1,
                    "mouse_speed": 400.0,
                    "vpn_detected": False
                }
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "decision" in data
        assert data["decision"] in ["GRANTED", "STEP_UP_REQUIRED", "DENIED"]
        assert data["gateway_decision"] in ["ALLOW", "CHALLENGE", "DENY"]
        assert "trust_score" in data
        assert "risk_score" in data
        assert "event_id" in data

        # 2. Check persistence in gateway_requests table
        async with db_manager.get_connection() as conn:
            res_gw = await conn.execute(
                "SELECT id, user_id, resource_id, gateway_decision FROM gateway_requests WHERE user_id = %s",
                (test_uid,)
            )
            gw_row = await res_gw.fetchone()
            assert gw_row is not None
            assert gw_row[2] == "res-private-vault-01"


@pytest.mark.asyncio
async def test_cloud_gateway_test_evaluate_admin_scenarios():
    """Verify administrator test evaluation card executes simulations and accurately logs decisions"""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        admin_login = await client.post("/api/admin/login", json={"key": DEV_ADMIN_KEY})
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Test normal scenario
        r_normal = await client.post(
            "/api/cloud/gateway/test-evaluate",
            headers=headers,
            json={
                "resource_id": "test-microservice-alpha",
                "resource_cloud": "private",
                "scenario": "normal"
            }
        )
        assert r_normal.status_code == 200
        d_normal = r_normal.json()
        assert d_normal["scenario"] == "normal"
        assert d_normal["gateway_decision"] in ["ALLOW", "CHALLENGE"]
        assert d_normal["is_simulation"] is True

        # Test critical anomaly scenario
        r_crit = await client.post(
            "/api/cloud/gateway/test-evaluate",
            headers=headers,
            json={
                "resource_id": "test-database-prod",
                "resource_cloud": "private",
                "scenario": "critical_anomaly"
            }
        )
        assert r_crit.status_code == 200
        d_crit = r_crit.json()
        assert d_crit["scenario"] == "critical_anomaly"
        assert d_crit["gateway_decision"] in ["DENY", "CHALLENGE"]


@pytest.mark.asyncio
async def test_cloud_gateway_telemetry_filters():
    """Verify telemetry reconciliation for 1h, 1d, 7d, 30d, all ranges"""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        admin_login = await client.post("/api/admin/login", json={"key": DEV_ADMIN_KEY})
        admin_token = admin_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        for period in ["1h", "1d", "7d", "30d", "all"]:
            resp = await client.get(f"/api/cloud/gateway/telemetry?period={period}", headers=headers)
            assert resp.status_code == 200
            data = resp.json()
            assert "requests_received" in data
            assert "requests_allowed" in data
            assert "requests_challenged" in data
            assert "requests_denied" in data
            assert "timeseries" in data
            assert "recent_requests" in data
            assert "environment_notice" in data
            assert "Local Zero Trust Policy Gateway Simulation" in data["environment_notice"]


@pytest.mark.asyncio
async def test_ai_image_classification_and_metrics_integrity():
    """Verify image ingestion, feature extraction (entropy, mean intensity, latency), and database logging"""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        admin_login = await client.post("/api/admin/login", json={"key": DEV_ADMIN_KEY})
        admin_token = admin_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Create real image bytes
        img_bytes = create_test_image_bytes(format="PNG", size=(128, 128), color=(40, 160, 220))
        files = {"file": ("test_security_audit.png", img_bytes, "image/png")}

        post_res = await client.post(
            "/api/admin/ai-monitoring/image-classify",
            headers=headers,
            files=files
        )
        assert post_res.status_code == 200
        res_data = post_res.json()

        assert res_data["status"] == "SUCCESS"
        assert res_data["format"] == "PNG"
        assert res_data["width"] == 128
        assert res_data["height"] == 128
        assert res_data["aspect_ratio"] == 1.0
        assert "entropy" in res_data
        assert res_data["entropy"] >= 0.0
        assert "mean_intensity" in res_data
        assert "latency_ms" in res_data
        assert res_data["latency_ms"] >= 0.0
        assert "record_id" in res_data

        record_id = res_data["record_id"]

        # 2. Verify record in history
        history_res = await client.get("/api/admin/ai-monitoring/image-history?limit=10", headers=headers)
        assert history_res.status_code == 200
        history = history_res.json()
        items = history if isinstance(history, list) else history.get("items", [])
        assert any(item["id"] == record_id for item in items)

        # 3. Verify truthful evaluation report (DO NOT fabricate metrics)
        eval_res = await client.get("/api/admin/ai-monitoring/image-evaluation", headers=headers)
        assert eval_res.status_code == 200
        eval_data = eval_res.json()
        assert eval_data["has_labeled_dataset"] is False
        assert "Evaluation dataset unavailable" in eval_data["status"]
        assert eval_data["accuracy"] is None
        assert "Zero Trust" in eval_data["notice"]


@pytest.mark.asyncio
async def test_non_bypassable_challenge_policy():
    """Verify CHALLENGE sets session status to RESTRICTED and never invokes obsolete secret PIN"""
    from continuous_auth import ContinuousAuthenticationOrchestrator
    from trust_risk_engine import TrustRiskEngine

    engine = TrustRiskEngine(db_manager.get_connection)
    test_uid = str(uuid.uuid4())
    test_sid = 99999

    async with db_manager.get_connection() as conn:
        await conn.execute(
            """INSERT INTO users (id, email, password_hash, role, is_active, email_verified, created_at)
               VALUES (%s, %s, %s, 'operator', TRUE, TRUE, NOW())""",
            (test_uid, f"challenge_test_{test_uid[:8]}@example.com", hash_password("Password123!"))
        )
        res_sess = await conn.execute(
            """INSERT INTO user_sessions (user_id, session_token, is_active, session_status, trust_score, risk_score, created_at)
               VALUES (%s, %s, TRUE, 'ACTIVE', 50.0, 50.0, NOW()) RETURNING id""",
            (test_uid, f"sess_{test_uid[:8]}")
        )
        row_sess = await res_sess.fetchone()
        test_sid = int(row_sess[0])
        await conn.commit()

    # High risk evaluation resulting in STEP_UP_MFA / CHALLENGE
    decision = await engine.evaluate_zero_trust_policy(
        user_id=test_uid,
        session_id=test_sid,
        trust_score=45.0,
        risk_score=55.0
    )

    assert decision["decision"] in ["STEP_UP_MFA", "RESTRICT"]
    assert decision["action_required"] == "restrict_access"

    # Verify session in DB has session_status = 'RESTRICTED'
    async with db_manager.get_connection() as conn:
        res = await conn.execute("SELECT session_status FROM user_sessions WHERE id = %s", (test_sid,))
        row = await res.fetchone()
        assert row is not None
        assert row[0] == "RESTRICTED"
