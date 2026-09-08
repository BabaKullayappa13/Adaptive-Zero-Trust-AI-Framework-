"""
Machine Learning Dataset Preprocessing Pipeline for Adaptive Zero Trust AI Framework
Loads CICIDS2017 dataset, handles missing/infinite values, performs stratified Train/Val/Test splitting,
and executes StandardScaler, PCA (10 components), and Recursive Feature Elimination (RFE, 15 features).
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, Tuple, List, Optional
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.feature_selection import RFE
from sklearn.ensemble import RandomForestClassifier
import joblib


class MLDatasetPipeline:
    """Preprocesses network flow data for Zero Trust multi-factor risk detection"""

    def __init__(self, data_root: Optional[str] = None, models_dir: Optional[str] = None):
        project_root = Path(__file__).resolve().parent.parent
        self.data_root = Path(data_root) if data_root else project_root / "data"
        self.models_dir = Path(models_dir) if models_dir else Path(__file__).resolve().parent / "models"
        self.models_dir.mkdir(parents=True, exist_ok=True)
        (self.data_root / "processed").mkdir(parents=True, exist_ok=True)
        (self.data_root / "train").mkdir(parents=True, exist_ok=True)
        (self.data_root / "validation").mkdir(parents=True, exist_ok=True)
        (self.data_root / "test").mkdir(parents=True, exist_ok=True)

        self.scaler: Optional[StandardScaler] = None
        self.pca: Optional[PCA] = None
        self.rfe: Optional[RFE] = None
        self.feature_names: List[str] = []
        self.rfe_selected_features: List[str] = []

    def load_and_clean_data(self, csv_path: Optional[str] = None) -> Tuple[pd.DataFrame, pd.Series, List[str]]:
        """Load CSV, trim column whitespace, clean infinities/nulls, and encode labels"""
        if csv_path is None:
            csv_path = self.data_root / "raw" / "CICIDS2017" / "cicids2017_sample.csv"
        
        path = Path(csv_path)
        if not path.exists():
            raise FileNotFoundError(f"CICIDS2017 dataset file not found at: {path}")

        print(f"[MLDatasetPipeline] Loading raw dataset from: {path}")
        df = pd.read_csv(path)

        # 1. Clean column names (strip whitespace)
        df.columns = [col.strip() for col in df.columns]

        # 2. Extract label column
        if "Label" not in df.columns:
            raise ValueError("Dataset missing 'Label' column")

        raw_labels = df["Label"].copy()
        # Binary target: 0 = BENIGN (legitimate), 1 = ATTACK (unauthorized/malicious)
        y = (raw_labels.str.upper() != "BENIGN").astype(int)

        # 3. Drop non-feature or label columns
        feature_df = df.drop(columns=["Label"], errors="ignore")

        # 4. Handle numeric conversion and inf/-inf/null
        for col in feature_df.columns:
            feature_df[col] = pd.to_numeric(feature_df[col], errors="coerce")

        feature_df.replace([np.inf, -np.inf], np.nan, inplace=True)

        # Impute missing values with column median
        for col in feature_df.columns:
            if feature_df[col].isna().any():
                col_median = feature_df[col].median()
                feature_df[col].fillna(col_median if not np.isnan(col_median) else 0.0, inplace=True)

        self.feature_names = list(feature_df.columns)
        print(f"[MLDatasetPipeline] Cleaned data: {feature_df.shape[0]} samples, {feature_df.shape[1]} features")
        print(f"[MLDatasetPipeline] Binary classes: {int((y == 0).sum())} BENIGN (0), {int((y == 1).sum())} ATTACK (1)")

        return feature_df, y, self.feature_names

    def split_data(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        test_size: float = 0.15,
        val_size: float = 0.15,
        random_state: int = 42
    ) -> Dict[str, Any]:
        """Perform stratified splitting: 70% Train, 15% Validation, 15% Test"""
        # First split off test set (15%)
        X_train_val, X_test, y_train_val, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y
        )

        # Then split remaining 85% into Train (70/85 = ~82.35%) and Val (15/85 = ~17.65%)
        val_relative_size = val_size / (1.0 - test_size)
        X_train, X_val, y_train, y_val = train_test_split(
            X_train_val, y_train_val, test_size=val_relative_size, random_state=random_state, stratify=y_train_val
        )

        print(f"[MLDatasetPipeline] Train split: {X_train.shape[0]} samples ({X_train.shape[0]/len(X):.1%})")
        print(f"[MLDatasetPipeline] Val split:   {X_val.shape[0]} samples ({X_val.shape[0]/len(X):.1%})")
        print(f"[MLDatasetPipeline] Test split:  {X_test.shape[0]} samples ({X_test.shape[0]/len(X):.1%})")

        return {
            "X_train": X_train, "y_train": y_train,
            "X_val": X_val, "y_val": y_val,
            "X_test": X_test, "y_test": y_test
        }

    def fit_and_transform(
        self,
        splits: Dict[str, Any],
        n_pca_components: int = 10,
        n_rfe_features: int = 15
    ) -> Dict[str, Any]:
        """Fit StandardScaler, PCA, and RFE on training data and transform splits"""
        X_train = splits["X_train"]
        y_train = splits["y_train"]
        X_val = splits["X_val"]
        X_test = splits["X_test"]

        # 1. Standard Scaler
        print("[MLDatasetPipeline] Fitting StandardScaler on training split...")
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_val_scaled = self.scaler.transform(X_val)
        X_test_scaled = self.scaler.transform(X_test)

        # 2. PCA (Principal Component Analysis)
        print(f"[MLDatasetPipeline] Fitting PCA with {n_pca_components} orthogonal components...")
        self.pca = PCA(n_components=n_pca_components, random_state=42)
        X_train_pca = self.pca.fit_transform(X_train_scaled)
        X_val_pca = self.pca.transform(X_val_scaled)
        X_test_pca = self.pca.transform(X_test_scaled)
        explained_var = float(np.sum(self.pca.explained_variance_ratio_))
        print(f"[MLDatasetPipeline] PCA total explained variance: {explained_var:.4f}")

        # 3. Recursive Feature Elimination (RFE)
        print(f"[MLDatasetPipeline] Fitting RFE (selecting top {n_rfe_features} flow features)...")
        rfe_estimator = RandomForestClassifier(n_estimators=50, max_depth=8, random_state=42, n_jobs=-1)
        self.rfe = RFE(estimator=rfe_estimator, n_features_to_select=n_rfe_features, step=3)
        self.rfe.fit(X_train_scaled, y_train)

        # Extract selected feature names
        selected_mask = self.rfe.support_
        self.rfe_selected_features = [col for col, sel in zip(self.feature_names, selected_mask) if sel]
        print(f"[MLDatasetPipeline] RFE selected {len(self.rfe_selected_features)} features: {self.rfe_selected_features[:5]}... (+10 more)")

        # Transform features with RFE mask
        X_train_rfe = self.rfe.transform(X_train_scaled)
        X_val_rfe = self.rfe.transform(X_val_scaled)
        X_test_rfe = self.rfe.transform(X_test_scaled)

        return {
            "X_train_scaled": X_train_scaled,
            "X_val_scaled": X_val_scaled,
            "X_test_scaled": X_test_scaled,
            "X_train_pca": X_train_pca,
            "X_val_pca": X_val_pca,
            "X_test_pca": X_test_pca,
            "X_train_rfe": X_train_rfe,
            "X_val_rfe": X_val_rfe,
            "X_test_rfe": X_test_rfe,
            "pca_explained_variance": explained_var,
            "rfe_selected_features": self.rfe_selected_features
        }

    def save_artifacts_and_datasets(self, splits: Dict[str, Any], transformed: Dict[str, Any]):
        """Save processed splits to disk and persist fitted transformers"""
        # Save CSV splits
        train_df = splits["X_train"].copy()
        train_df["Label"] = splits["y_train"]
        train_df.to_csv(self.data_root / "train" / "train.csv", index=False)

        val_df = splits["X_val"].copy()
        val_df["Label"] = splits["y_val"]
        val_df.to_csv(self.data_root / "validation" / "val.csv", index=False)

        test_df = splits["X_test"].copy()
        test_df["Label"] = splits["y_test"]
        test_df.to_csv(self.data_root / "test" / "test.csv", index=False)

        # Full processed
        full_df = pd.concat([train_df, val_df, test_df], ignore_index=True)
        full_df.to_csv(self.data_root / "processed" / "full_processed.csv", index=False)

        # Save fitted joblib artifacts
        joblib.dump(self.scaler, self.models_dir / "scaler.joblib")
        joblib.dump(self.pca, self.models_dir / "pca.joblib")
        joblib.dump(self.rfe, self.models_dir / "rfe.joblib")

        # Save metadata JSON
        metadata = {
            "pipeline_version": "1.0.0",
            "total_samples": len(full_df),
            "train_samples": len(train_df),
            "val_samples": len(val_df),
            "test_samples": len(test_df),
            "original_features_count": len(self.feature_names),
            "original_features": self.feature_names,
            "pca_components_count": 10,
            "pca_explained_variance": transformed["pca_explained_variance"],
            "rfe_selected_features_count": len(self.rfe_selected_features),
            "rfe_selected_features": self.rfe_selected_features
        }
        with open(self.models_dir / "selected_features.json", "w") as f:
            json.dump(metadata, f, indent=2)

        with open(self.data_root / "processed" / "features_metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)

        print(f"[MLDatasetPipeline] Artifacts and splits saved to {self.models_dir} and {self.data_root}")

    def run_pipeline(self, csv_path: Optional[str] = None) -> Dict[str, Any]:
        """Execute complete end-to-end dataset pipeline"""
        X, y, feature_names = self.load_and_clean_data(csv_path)
        splits = self.split_data(X, y)
        transformed = self.fit_and_transform(splits)
        self.save_artifacts_and_datasets(splits, transformed)
        return {
            "splits": splits,
            "transformed": transformed,
            "feature_names": feature_names,
            "rfe_selected_features": self.rfe_selected_features
        }


if __name__ == "__main__":
    pipeline = MLDatasetPipeline()
    pipeline.run_pipeline()
