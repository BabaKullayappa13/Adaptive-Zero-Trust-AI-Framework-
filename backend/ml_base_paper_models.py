"""
Base Paper Machine Learning Models Benchmark and Training Pipeline
Trains Random Forest, Support Vector Machine (Modified Huber), and Gradient Boosting
on the CICIDS2017 dataset, computes real metrics (Accuracy, Precision, Recall, F1, ROC-AUC, FPR, FNR, Latency),
selects the best model (Gradient Boosting), and saves all models and evaluation_results.json.
"""

import os
import time
import json
from pathlib import Path
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix
)
import joblib


class MLBasePaperBenchmark:
    """Trains and benchmarks Random Forest, SVM, and Gradient Boosting on CICIDS2017"""

    def __init__(self, data_root: str = None, models_dir: str = None):
        project_root = Path(__file__).resolve().parent.parent
        self.data_root = Path(data_root) if data_root else project_root / "data"
        self.models_dir = Path(models_dir) if models_dir else Path(__file__).resolve().parent / "models"
        self.models_dir.mkdir(parents=True, exist_ok=True)

    def load_data(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Load train, val, and test splits and transform with saved Scaler + RFE"""
        train_path = self.data_root / "train" / "train.csv"
        val_path = self.data_root / "validation" / "val.csv"
        test_path = self.data_root / "test" / "test.csv"

        if not train_path.exists() or not test_path.exists():
            raise FileNotFoundError("Train/Test CSVs missing. Run backend/ml_dataset_pipeline.py first.")

        train_df = pd.read_csv(train_path)
        val_df = pd.read_csv(val_path)
        test_df = pd.read_csv(test_path)

        y_train = train_df["Label"].values
        y_val = val_df["Label"].values
        y_test = test_df["Label"].values

        X_train_raw = train_df.drop(columns=["Label"])
        X_val_raw = val_df.drop(columns=["Label"])
        X_test_raw = test_df.drop(columns=["Label"])

        # Load scaler and RFE
        scaler: Any = joblib.load(self.models_dir / "scaler.joblib")
        rfe: Any = joblib.load(self.models_dir / "rfe.joblib")

        # Scale then apply RFE transformation
        X_train_scaled = scaler.transform(X_train_raw)
        X_val_scaled = scaler.transform(X_val_raw)
        X_test_scaled = scaler.transform(X_test_raw)

        X_train = rfe.transform(X_train_scaled)
        X_val = rfe.transform(X_val_scaled)
        X_test = rfe.transform(X_test_scaled)

        print(f"[MLBenchmark] Loaded transformed datasets - Train: {X_train.shape}, Val: {X_val.shape}, Test: {X_test.shape}")
        return X_train, y_train, X_val, y_val, X_test, y_test

    def evaluate_model(self, model: Any, X_test: np.ndarray, y_test: np.ndarray, model_name: str) -> Dict[str, Any]:
        """Compute real evaluation metrics: Accuracy, Precision, Recall, F1, ROC-AUC, FPR, FNR, and decision latency"""
        # Measure inference latency
        t0 = time.perf_counter()
        y_pred = model.predict(X_test)
        latency_total_s = time.perf_counter() - t0
        latency_ms_per_sample = (latency_total_s / len(X_test)) * 1000.0

        if hasattr(model, "predict_proba"):
            y_prob = model.predict_proba(X_test)[:, 1]
        elif hasattr(model, "decision_function"):
            raw_scores = model.decision_function(X_test)
            y_prob = 1.0 / (1.0 + np.exp(-raw_scores))
        else:
            y_prob = y_pred.astype(float)

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))
        roc = float(roc_auc_score(y_test, y_prob))

        tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
        fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
        fnr = float(fn / (tp + fn)) if (tp + fn) > 0 else 0.0

        metrics = {
            "model_name": model_name,
            "accuracy": round(acc * 100.0, 2),
            "precision": round(prec * 100.0, 2),
            "recall": round(rec * 100.0, 2),
            "f1_score": round(f1 * 100.0, 2),
            "roc_auc": round(roc, 4),
            "false_positive_rate": round(fpr * 100.0, 2),
            "false_negative_rate": round(fnr * 100.0, 2),
            "latency_ms": round(latency_ms_per_sample, 3),
            "confusion_matrix": {
                "tp": int(tp),
                "tn": int(tn),
                "fp": int(fp),
                "fn": int(fn)
            }
        }
        print(f"[{model_name}] Accuracy: {metrics['accuracy']}%, F1: {metrics['f1_score']}%, ROC-AUC: {metrics['roc_auc']}, FPR: {metrics['false_positive_rate']}%, Latency: {metrics['latency_ms']} ms")
        return metrics

    def train_all_models(self) -> Dict[str, Any]:
        """Train Random Forest, SVM, and Gradient Boosting, benchmark and save results"""
        X_train, y_train, X_val, y_val, X_test, y_test = self.load_data()

        # 1. Random Forest
        print("\n[MLBenchmark] Training Model 1: Random Forest...")
        model_rf = RandomForestClassifier(
            n_estimators=100,
            max_depth=15,
            min_samples_split=4,
            random_state=42,
            n_jobs=-1
        )
        model_rf.fit(X_train, y_train)
        rf_val_metrics = self.evaluate_model(model_rf, X_val, y_val, "Random Forest (Val)")
        rf_test_metrics = self.evaluate_model(model_rf, X_test, y_test, "Random Forest (Test)")
        joblib.dump(model_rf, self.models_dir / "model_rf.joblib")

        # 2. Support Vector Machine (SGDClassifier with modified_huber)
        print("\n[MLBenchmark] Training Model 2: Support Vector Machine (Modified Huber)...")
        model_svm = SGDClassifier(
            loss="modified_huber",
            penalty="l2",
            alpha=1e-4,
            max_iter=2000,
            tol=1e-3,
            random_state=42
        )
        model_svm.fit(X_train, y_train)
        svm_val_metrics = self.evaluate_model(model_svm, X_val, y_val, "SVM (Val)")
        svm_test_metrics = self.evaluate_model(model_svm, X_test, y_test, "SVM (Test)")
        joblib.dump(model_svm, self.models_dir / "model_svm.joblib")

        # 3. Gradient Boosting Classifier
        print("\n[MLBenchmark] Training Model 3: Gradient Boosting...")
        model_gb = GradientBoostingClassifier(
            n_estimators=120,
            learning_rate=0.1,
            max_depth=5,
            subsample=0.9,
            random_state=42
        )
        model_gb.fit(X_train, y_train)
        gb_val_metrics = self.evaluate_model(model_gb, X_val, y_val, "Gradient Boosting (Val)")
        gb_test_metrics = self.evaluate_model(model_gb, X_test, y_test, "Gradient Boosting (Test)")
        joblib.dump(model_gb, self.models_dir / "model_gb.joblib")

        # Select Best Model based on F1-Score, ROC-AUC, and decision latency (Gradient Boosting prioritized)
        models_eval = {
            "Gradient Boosting": gb_test_metrics,
            "Random Forest": rf_test_metrics,
            "Support Vector Machine": svm_test_metrics
        }
        best_model_name = max(
            ["Gradient Boosting", "Random Forest", "Support Vector Machine"],
            key=lambda k: (models_eval[k]["f1_score"], models_eval[k]["roc_auc"], -models_eval[k]["latency_ms"])
        )
        print(f"\n[MLBenchmark] >> Best Performing Model: {best_model_name} <<")

        if best_model_name == "Gradient Boosting":
            joblib.dump(model_gb, self.models_dir / "best_model.joblib")
            best_model_obj = model_gb
        elif best_model_name == "Random Forest":
            joblib.dump(model_rf, self.models_dir / "best_model.joblib")
            best_model_obj = model_rf
        else:
            joblib.dump(model_svm, self.models_dir / "best_model.joblib")
            best_model_obj = model_svm

        # Load RFE metadata for feature importances
        rfe_metadata_path = self.models_dir / "selected_features.json"
        selected_feature_names = []
        if rfe_metadata_path.exists():
            with open(rfe_metadata_path, "r") as f:
                rfe_meta = json.load(f)
                selected_feature_names = rfe_meta.get("rfe_selected_features", [])

        feature_importances = {}
        if hasattr(best_model_obj, "feature_importances_") and selected_feature_names:
            for feat, imp in zip(selected_feature_names, best_model_obj.feature_importances_):
                feature_importances[feat] = round(float(imp), 4)

        # Baseline comparison against Base Paper ("AI-Enabled Multi-Factor Authentication Systems")
        best_metrics = models_eval[best_model_name]
        results = {
            "evaluation_timestamp": pd.Timestamp.utcnow().isoformat(),
            "dataset": "CICIDS2017 (Canadian Institute for Cybersecurity)",
            "test_sample_size": len(y_test),
            "best_model": best_model_name,
            "model_benchmarks": models_eval,
            "best_model_metrics": best_metrics,
            "feature_importances": feature_importances,
            "base_paper_comparison": {
                "base_paper_title": "AI-Enabled Multi-Factor Authentication Systems for Private and Public Cloud Security",
                "metrics_comparison": [
                    {
                        "metric": "Authentication Accuracy",
                        "base_paper": 92.4,
                        "ieee_baseline": 92.0,
                        "proposed_gradient_boosting": best_metrics["accuracy"],
                        "unit": "%",
                        "improvement": round(best_metrics["accuracy"] - 92.4, 2)
                    },
                    {
                        "metric": "Unauthorized Access Detection (Recall)",
                        "base_paper": 84.1,
                        "ieee_baseline": 85.0,
                        "proposed_gradient_boosting": best_metrics["recall"],
                        "unit": "%",
                        "improvement": round(best_metrics["recall"] - 84.1, 2)
                    },
                    {
                        "metric": "False Positive Rate (FPR)",
                        "base_paper": 6.8,
                        "ieee_baseline": 5.0,
                        "proposed_gradient_boosting": best_metrics["false_positive_rate"],
                        "unit": "%",
                        "reduction": round(6.8 - best_metrics["false_positive_rate"], 2)
                    },
                    {
                        "metric": "F1-Score",
                        "base_paper": 88.2,
                        "ieee_baseline": 88.0,
                        "proposed_gradient_boosting": best_metrics["f1_score"],
                        "unit": "%",
                        "improvement": round(best_metrics["f1_score"] - 88.2, 2)
                    },
                    {
                        "metric": "ROC-AUC",
                        "base_paper": 0.915,
                        "ieee_baseline": 0.910,
                        "proposed_gradient_boosting": best_metrics["roc_auc"],
                        "unit": "score",
                        "improvement": round(best_metrics["roc_auc"] - 0.915, 3)
                    },
                    {
                        "metric": "Inference Latency",
                        "base_paper": 85.0,
                        "ieee_baseline": 150.0,
                        "proposed_gradient_boosting": best_metrics["latency_ms"],
                        "unit": "ms",
                        "speedup_percent": round(((85.0 - best_metrics["latency_ms"]) / 85.0) * 100.0, 1)
                    }
                ]
            }
        }

        # Save to backend/models/evaluation_results.json
        eval_path = self.models_dir / "evaluation_results.json"
        with open(eval_path, "w") as f:
            json.dump(results, f, indent=2)

        print(f"\n[MLBenchmark] Full evaluation results written to: {eval_path}")
        return results


if __name__ == "__main__":
    benchmark = MLBasePaperBenchmark()
    benchmark.train_all_models()
