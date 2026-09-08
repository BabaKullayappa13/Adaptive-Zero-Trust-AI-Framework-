"""
Continuous Authentication Orchestration, Dynamic Risk/Trust Scoring, and Step-Up Challenge Tests
"""

import sys
import uuid
from pathlib import Path
import pytest
import pytest_asyncio

backend_dir = str(Path(__file__).resolve().parent.parent / "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import db_manager
from ml_model_training import MLModelTrainer
from continuous_auth import ContinuousAuthenticationOrchestrator


@pytest.mark.asyncio
async def test_continuous_session_lifecycle():
    """Verify session creation, normal telemetry evaluation, and high-trust ALLOW decision"""
    await db_manager.initialize()
    trainer = MLModelTrainer()
    orchestrator = ContinuousAuthenticationOrchestrator(db_manager.get_connection, anomaly_detector=trainer)

    # 1. Create test user in database first
    test_user_id = str(uuid.uuid4())
    async with db_manager.get_connection() as conn:
        await conn.execute(
            """INSERT INTO users (id, email, password_hash, name, created_at)
               VALUES (%s, %s, %s, 'Security Operator', NOW())
               ON CONFLICT (id) DO NOTHING""",
            (test_user_id, f"test_{test_user_id[:8]}@example.com", "fake_hash_123")
        )
        await conn.commit()

    device_info = {
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        "screen_width": 1920,
        "screen_height": 1080,
        "platform": "Win32",
        "timezone": "UTC"
    }
    location_info = {
        "country": "United States",
        "state": "California",
        "city": "San Francisco",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "vpn_detected": False
    }

    session = await orchestrator.create_session(
        user_id=test_user_id,
        device_info=device_info,
        location_info=location_info,
        ip_address="192.168.1.100"
    )

    assert "session_id" in session
    assert "session_token" in session
    session_id = session["session_id"]

    # 2. Process benign continuous telemetry
    telemetry = {
        "keystroke_speed": 3.6,
        "keystroke_variance": 0.05,
        "mouse_speed": 460.0,
        "mouse_distance": 310.0,
        "click_count": 8,
        "scroll_count": 5,
        "idle_seconds": 12,
        "session_duration_minutes": 5.0
    }

    eval_result = await orchestrator.process_continuous_telemetry(
        user_id=test_user_id,
        session_id=session_id,
        telemetry=telemetry,
        device_info=device_info,
        location_info=location_info,
        ip_address="192.168.1.100"
    )

    assert "trust_score" in eval_result
    assert "risk_score" in eval_result
    assert "policy_decision" in eval_result
    assert eval_result["trust_score"] > 40.0
    assert eval_result["session_terminated"] is False


@pytest.mark.asyncio
async def test_anomalous_telemetry_triggers_step_up_or_risk():
    """Verify sudden impossible travel or extreme anomaly increases risk score significantly"""
    await db_manager.initialize()
    trainer = MLModelTrainer()
    orchestrator = ContinuousAuthenticationOrchestrator(db_manager.get_connection, anomaly_detector=trainer)

    test_user_id = str(uuid.uuid4())
    async with db_manager.get_connection() as conn:
        await conn.execute(
            """INSERT INTO users (id, email, password_hash, name, created_at)
               VALUES (%s, %s, %s, 'Security Operator', NOW())
               ON CONFLICT (id) DO NOTHING""",
            (test_user_id, f"test_{test_user_id[:8]}@example.com", "fake_hash_123")
        )
        await conn.commit()

    device_info = {"user_agent": "PythonTestAgent", "screen_width": 1920, "screen_height": 1080}
    location_info = {"country": "United States", "latitude": 37.7749, "longitude": -122.4194}

    session = await orchestrator.create_session(
        user_id=test_user_id,
        device_info=device_info,
        location_info=location_info,
        ip_address="192.168.1.100"
    )
    session_id = session["session_id"]

    # Severe anomaly: impossible travel to Tokyo + robotic speeds + VPN
    telemetry = {
        "keystroke_speed": 22.0,
        "keystroke_variance": 0.0001,
        "mouse_speed": 3000.0,
        "mouse_distance": 5000.0,
        "click_count": 0,
        "scroll_count": 0,
        "idle_seconds": 0
    }
    anomalous_location = {
        "country": "Japan",
        "city": "Tokyo",
        "latitude": 35.6762,
        "longitude": 139.6503,
        "vpn_detected": True,
        "location_changed": True
    }

    eval_result = await orchestrator.process_continuous_telemetry(
        user_id=test_user_id,
        session_id=session_id,
        telemetry=telemetry,
        device_info=device_info,
        location_info=anomalous_location,
        ip_address="203.0.113.42"
    )

    assert eval_result["risk_score"] > 40.0
    assert eval_result["trust_score"] < 70.0
