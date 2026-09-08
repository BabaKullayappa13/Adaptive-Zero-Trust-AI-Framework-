"""
Federated Learning (FedAvg) Simulation and Parameter Aggregation Tests
"""

import sys
from pathlib import Path
import pytest
import pytest_asyncio

backend_dir = str(Path(__file__).resolve().parent.parent / "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import db_manager
from federated_learning import FederatedLearningService


@pytest.mark.asyncio
async def test_federated_learning_simulation_round():
    """Verify FedAvg round execution, local client partitions, and aggregated global accuracy"""
    await db_manager.initialize()
    fl_service = FederatedLearningService(db_manager.get_connection)

    result = await fl_service.run_simulation_round(target_accuracy=0.98)

    assert result["status"] == "completed"
    assert "global_accuracy" in result
    assert result["global_accuracy"] >= 0.90
    assert result["participating_clients"] == 3
    assert len(result["client_summaries"]) == 3
    assert "simulation_prototype" in result["framework_mode"]


@pytest.mark.asyncio
async def test_federated_rounds_history():
    """Verify history of federated rounds can be retrieved from database"""
    await db_manager.initialize()
    fl_service = FederatedLearningService(db_manager.get_connection)

    history = await fl_service.get_rounds_history(limit=5)
    assert isinstance(history, list)
    assert len(history) > 0

    latest = history[0]
    assert "round_number" in latest
    assert "global_accuracy" in latest
    assert "status" in latest
