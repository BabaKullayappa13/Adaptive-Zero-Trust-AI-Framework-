"""
Zero Trust Policy Engine and Explainable AI (XAI) Tests
"""

import sys
from pathlib import Path
import pytest
import pytest_asyncio

backend_dir = str(Path(__file__).resolve().parent.parent / "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import db_manager
from zero_trust_policy import ZeroTrustPolicyEngine
from explainable_ai import ExplainableAIService


@pytest.mark.asyncio
async def test_zero_trust_policy_retrieval():
    """Verify system retrieves configured Zero Trust policies and rules"""
    await db_manager.initialize()
    policy_engine = ZeroTrustPolicyEngine(db_manager.get_connection)
    policies = await policy_engine.get_active_policies()
    assert isinstance(policies, list)
    assert len(policies) > 0

    first = policies[0]
    assert "name" in first
    assert "rules" in first
    assert len(first["rules"]) > 0


@pytest.mark.asyncio
async def test_xai_dual_layer_explanations():
    """Verify XAI produces user-friendly and technical admin explanations with SHAP attributions"""
    await db_manager.initialize()
    xai = ExplainableAIService(db_manager.get_connection)

    features = {
        "keystroke_speed": 12.5,
        "mouse_speed": 1200.0,
        "device_trust": 35.0,
        "browser_changed": True,
        "location_changed": True,
        "ai_anomaly_score": 85.0,
        "vpn_detected": True
    }

    explanation = await xai.explain_decision(
        user_id="test_user_xai",
        decision="STEP_UP_MFA",
        risk_score=72.0,
        trust_score=38.0,
        features=features
    )

    assert "user_explanation" in explanation
    assert "admin_explanation" in explanation
    assert "feature_importance" in explanation

    # Check user explanation structure
    user_exp = explanation["user_explanation"]
    assert "summary" in user_exp
    assert "recommended_action" in user_exp

    # Check admin technical explanation structure
    admin_exp = explanation["admin_explanation"]
    assert "model_architecture" in admin_exp
    assert "feature_attribution" in admin_exp
    assert len(admin_exp["feature_attribution"]) > 0
    assert "shap_value" in admin_exp["feature_attribution"][0]
