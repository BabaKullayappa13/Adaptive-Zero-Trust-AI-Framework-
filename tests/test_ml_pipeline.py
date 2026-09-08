"""
Machine Learning Pipeline, CICIDS2017 Preprocessing, Models, and Evaluation Metrics Tests
"""

import sys
import json
from pathlib import Path
import pytest
import numpy as np
import pandas as pd

backend_dir = str(Path(__file__).resolve().parent.parent / "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from ml_model_training import MLModelTrainer


def test_dataset_exists_and_valid():
    """Verify CICIDS2017 dataset exists and contains expected columns and classes"""
    data_path = Path(__file__).resolve().parent.parent / "data" / "raw" / "CICIDS2017" / "cicids2017_sample.csv"
    assert data_path.exists(), f"Dataset not found at {data_path}"

    df = pd.read_csv(data_path)
    assert len(df) >= 1000
    assert "Label" in df.columns
    assert len(df.columns) >= 78

    labels = set(df["Label"].unique())
    assert "BENIGN" in labels
    assert any(a in labels for a in ["PortScan", "DDoS", "DoS Hulk", "Bot"])


def test_model_artifacts_exist():
    """Verify all pipeline and model artifacts exist in backend/models"""
    models_dir = Path(__file__).resolve().parent.parent / "backend" / "models"
    required_artifacts = [
        "scaler.joblib",
        "pca.joblib",
        "rfe.joblib",
        "selected_features.json",
        "model_rf.joblib",
        "model_svm.joblib",
        "model_gb.joblib",
        "best_model.joblib",
        "evaluation_results.json"
    ]
    for artifact in required_artifacts:
        assert (models_dir / artifact).exists(), f"Missing artifact: {artifact}"


def test_evaluation_results_metrics():
    """Verify evaluation_results.json contains real, non-empty metrics exceeding base paper"""
    eval_path = Path(__file__).resolve().parent.parent / "backend" / "models" / "evaluation_results.json"
    with open(eval_path, "r") as f:
        data = json.load(f)

    assert "best_model" in data
    assert data["best_model"] == "Gradient Boosting"

    metrics = data["best_model_metrics"]
    assert metrics["accuracy"] >= 95.0
    assert metrics["recall"] >= 90.0
    assert metrics["precision"] >= 90.0
    assert metrics["f1_score"] >= 90.0
    assert metrics["roc_auc"] >= 0.95
    assert metrics["false_positive_rate"] <= 5.0
    assert metrics["latency_ms"] < 100.0


def test_ml_model_trainer_inference():
    """Verify MLModelTrainer executes predictions for behavioral and network threats"""
    trainer = MLModelTrainer()

    # Behavioral inference
    normal_vector = np.array([3.5, 0.05, 450.0, 300.0, 10.0, 6.0, 10.0, 85.0, 5.0])
    res = trainer.predict_anomaly(normal_vector)
    assert "is_anomaly" in res
    assert "anomaly_score" in res
    assert "confidence" in res
    assert 0.0 <= res["anomaly_score"] <= 100.0

    # Network threat inference
    dummy_flow = np.zeros(78)
    net_res = trainer.predict_network_threat(dummy_flow)
    assert "threat_detected" in net_res
    assert "threat_probability" in net_res
    assert "risk_score" in net_res
    assert 0.0 <= net_res["threat_probability"] <= 1.0
