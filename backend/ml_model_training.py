"""Machine Learning Model Training Pipeline"""

import numpy as np
import joblib
import os
from datetime import datetime
from pathlib import Path
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score
from typing import Dict, Tuple, Optional, List

class MLModelTrainer:
    """Train and manage ML models for anomaly detection"""
    
    def __init__(self, model_dir: str = "./models"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        self.scaler = None
        self.model = None
        self.model_metadata = None
    
    def load_training_data(self) -> Tuple[np.ndarray, np.ndarray]:
        """Load and prepare training data"""
        try:
            # In production, this would load from database or files
            # For now, generate synthetic training data for authentication anomalies
            n_samples = 1000
            n_features = 8
            
            # Features: login_hour, failed_attempts, ip_entropy, device_count, 
            #          time_since_last_login, geographic_distance, unusual_location, session_duration
            X_normal = np.random.normal(loc=12, scale=4, size=(n_samples // 2, n_features))
            X_anomaly = np.random.uniform(0, 24, size=(n_samples // 2, n_features)) * np.random.choice([0.1, 2.0], size=(n_samples // 2, n_features))
            
            X = np.vstack([X_normal, X_anomaly])
            y = np.hstack([np.zeros(n_samples // 2), np.ones(n_samples // 2)])
            
            return X, y
        except Exception as e:
            print(f"[v0] Error loading training data: {e}")
            return None, None
    
    def train_anomaly_detector(self, contamination: float = 0.1) -> Dict:
        """Train Isolation Forest model for anomaly detection"""
        try:
            print("[v0] Training anomaly detection model...")
            
            # Load data
            X, y = self.load_training_data()
            if X is None:
                raise ValueError("Failed to load training data")
            
            # Scale features
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)
            
            # Train Isolation Forest
            self.model = IsolationForest(
                contamination=contamination,
                random_state=42,
                n_estimators=100
            )
            predictions = self.model.fit_predict(X_scaled)
            
            # Calculate metrics
            metrics = {
                'precision': precision_score(y, predictions == -1),
                'recall': recall_score(y, predictions == -1),
                'f1': f1_score(y, predictions == -1),
            }
            
            # Try to calculate ROC-AUC if possible
            try:
                anomaly_scores = self.model.score_samples(X_scaled)
                metrics['roc_auc'] = roc_auc_score(y, -anomaly_scores)
            except:
                metrics['roc_auc'] = None
            
            print(f"[v0] Model training complete. F1 Score: {metrics['f1']:.4f}")
            
            # Save model
            model_path = self.model_dir / f"anomaly_detector_{datetime.now().strftime('%Y%m%d_%H%M%S')}.joblib"
            scaler_path = self.model_dir / f"scaler_{datetime.now().strftime('%Y%m%d_%H%M%S')}.joblib"
            
            joblib.dump(self.model, model_path)
            joblib.dump(self.scaler, scaler_path)
            
            self.model_metadata = {
                'model_path': str(model_path),
                'scaler_path': str(scaler_path),
                'trained_at': datetime.utcnow().isoformat(),
                'metrics': metrics,
                'contamination': contamination,
                'model_type': 'IsolationForest'
            }
            
            return self.model_metadata
        except Exception as e:
            print(f"[v0] Model training error: {e}")
            return None
    
    def load_model(self, model_path: str, scaler_path: str) -> bool:
        """Load trained model and scaler"""
        try:
            if not os.path.exists(model_path) or not os.path.exists(scaler_path):
                print(f"[v0] Model or scaler file not found")
                return False
            
            self.model = joblib.load(model_path)
            self.scaler = joblib.load(scaler_path)
            return True
        except Exception as e:
            print(f"[v0] Error loading model: {e}")
            return False
    
    def predict_anomaly(self, features: np.ndarray) -> Dict:
        """Predict if given features represent anomaly"""
        try:
            if self.model is None or self.scaler is None:
                raise ValueError("Model not trained or loaded")
            
            # Ensure features is 2D
            if features.ndim == 1:
                features = features.reshape(1, -1)
            
            # Scale features
            features_scaled = self.scaler.transform(features)
            
            # Get prediction and anomaly score
            prediction = self.model.predict(features_scaled)[0]
            anomaly_score = self.model.score_samples(features_scaled)[0]
            
            return {
                'is_anomaly': prediction == -1,
                'anomaly_score': float(-anomaly_score),  # Negate to make positive scores worse
                'confidence': min(1.0, float(abs(anomaly_score) / 3.0))  # Normalize to 0-1
            }
        except Exception as e:
            print(f"[v0] Prediction error: {e}")
            return {
                'is_anomaly': False,
                'anomaly_score': 0.0,
                'confidence': 0.0
            }
    
    def evaluate_model(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict:
        """Evaluate model on test set"""
        try:
            if self.model is None or self.scaler is None:
                raise ValueError("Model not trained or loaded")
            
            X_scaled = self.scaler.transform(X_test)
            predictions = self.model.predict(X_scaled)
            
            metrics = {
                'precision': precision_score(y_test, predictions == -1),
                'recall': recall_score(y_test, predictions == -1),
                'f1': f1_score(y_test, predictions == -1),
                'tested_samples': len(X_test)
            }
            
            return metrics
        except Exception as e:
            print(f"[v0] Evaluation error: {e}")
            return None
