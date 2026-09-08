"""
Database Connection, Health Check, and Schema Verification Tests
"""

import sys
from pathlib import Path
import pytest
import pytest_asyncio

backend_dir = str(Path(__file__).resolve().parent.parent / "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import DatabaseManager, db_manager


@pytest.mark.asyncio
async def test_database_initialization():
    """Test database manager initializes without exceptions"""
    await db_manager.initialize()
    health = await db_manager.check_health()
    assert health["status"] == "healthy"
    assert health["connected"] is True
    assert health["engine"] in ["postgresql", "sqlite"]


@pytest.mark.asyncio
async def test_critical_tables_exist():
    """Verify all critical framework tables exist in schema"""
    await db_manager.initialize()
    async with db_manager.get_connection() as conn:
        res = await conn.execute(
            """SELECT table_name 
               FROM information_schema.tables 
               WHERE table_schema = 'public'"""
        )
        rows = await res.fetchall()
        table_names = {r[0].lower() for r in rows}

        required_tables = [
            "users",
            "user_sessions",
            "audit_logs",
            "behavioral_patterns",
            "user_devices",
            "trust_policies",
            "policy_rules",
            "federated_rounds",
            "federated_participants",
            "federated_models",
            "cloud_configurations",
            "email_verification_tokens",
            "pin_reset_tokens"
        ]

        for table in required_tables:
            assert table in table_names, f"Required table '{table}' is missing from database schema"
