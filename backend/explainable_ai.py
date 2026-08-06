import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any
import json
import psycopg
from psycopg import AsyncConnection

class ExplainableAIService:
    """SHAP-based explainable AI for trust decisions"""
    
    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func
    
    async def generate_feature_importance(self, decision_id: str,
                                         features: Dict[str, float],
                                         shap_values: Dict[str, float]) -> Dict:
        """Generate SHAP feature importance explanation"""
        
        # Sort features by absolute SHAP value
        sorted_features = sorted(
            shap_values.items(),
            key=lambda x: abs(x[1]),
            reverse=True
        )
        
        # Calculate cumulative importance
        total_importance = sum(abs(v) for v in shap_values.values())
        
        feature_importance = []
        cumulative = 0
        
        for feature, shap_val in sorted_features:
            contribution = (abs(shap_val) / total_importance * 100) if total_importance > 0 else 0
            cumulative += contribution
            
            feature_importance.append({
                "feature": feature,
                "shap_value": float(shap_val),
                "contribution_percent": float(contribution),
                "cumulative_percent": float(cumulative),
                "direction": "increases" if shap_val > 0 else "decreases",
                "impact_strength": "high" if abs(shap_val) > 0.5 else "medium" if abs(shap_val) > 0.2 else "low"
            })
        
        return {
            "decision_id": decision_id,
            "timestamp": datetime.utcnow().isoformat(),
            "total_features": len(feature_importance),
            "features": feature_importance,
            "base_value": 0.5,  # Base prediction value
            "model_output": float(sum(shap_values.values()) + 0.5)  # Simplified
        }
    
    async def generate_decision_explanation(self, user_id: str, policy_decision: str,
                                           trust_score: float, contributing_factors: List[str]) -> Dict:
        """Generate human-readable decision explanation"""
        
        decision_text = ""
        if policy_decision == "allow":
            decision_text = f"Access ALLOWED for {user_id}. Trust score: {trust_score:.1%}"
        elif policy_decision == "challenge":
            decision_text = f"Additional verification REQUIRED for {user_id}. Trust score: {trust_score:.1%}"
        else:
            decision_text = f"Access DENIED for {user_id}. Trust score: {trust_score:.1%}"
        
        explanations = []
        for i, factor in enumerate(contributing_factors, 1):
            explanations.append(f"{i}. {factor}")
        
        return {
            "user_id": user_id,
            "decision": policy_decision,
            "trust_score": float(trust_score),
            "summary": decision_text,
            "contributing_factors": explanations,
            "explanation_timestamp": datetime.utcnow().isoformat()
        }
    
    async def generate_risk_factors_analysis(self, user_id: str,
                                            risk_factors: List[Dict]) -> Dict:
        """Analyze and explain risk factors"""
        
        analysis = {
            "user_id": user_id,
            "total_risk_factors": len(risk_factors),
            "risk_factors_breakdown": [],
            "highest_risk_factor": None,
            "mitigation_recommendations": []
        }
        
        max_risk = 0
        max_factor = None
        
        for factor in risk_factors:
            factor_name = factor.get("name", "unknown")
            risk_level = factor.get("risk_level", "medium")
            description = factor.get("description", "")
            
            factor_analysis = {
                "factor": factor_name,
                "risk_level": risk_level,
                "description": description,
                "mitigation": self._get_mitigation(factor_name, risk_level)
            }
            
            analysis["risk_factors_breakdown"].append(factor_analysis)
            
            # Track highest risk
            risk_score = {"low": 1, "medium": 2, "high": 3, "critical": 4}.get(risk_level, 0)
            if risk_score > max_risk:
                max_risk = risk_score
                max_factor = factor_name
        
        if max_factor:
            analysis["highest_risk_factor"] = max_factor
        
        # Generate recommendations
        if max_risk >= 3:
            analysis["mitigation_recommendations"].append("Force MFA re-authentication")
            analysis["mitigation_recommendations"].append("Require device re-verification")
        
        if max_risk >= 4:
            analysis["mitigation_recommendations"].append("Initiate session termination")
            analysis["mitigation_recommendations"].append("Alert security team")
        
        return analysis
    
    async def generate_model_decision_tree(self, features: Dict[str, Any],
                                          thresholds: Dict[str, float]) -> Dict:
        """Generate decision tree visualization data"""
        
        def evaluate_node(feature_name: str, feature_value: Any, threshold: float):
            if feature_value > threshold:
                return "right"
            else:
                return "left"
        
        # Build decision tree structure
        tree = {
            "root": {
                "feature": "trust_score",
                "threshold": thresholds.get("trust_score", 60),
                "samples": 1000,
                "predictions": {"allow": 800, "challenge": 150, "deny": 50}
            },
            "nodes": []
        }
        
        # Add child nodes
        node_id = 1
        for feature_name, feature_value in features.items():
            threshold = thresholds.get(feature_name, 0)
            direction = evaluate_node(feature_name, feature_value, threshold)
            
            tree["nodes"].append({
                "id": node_id,
                "feature": feature_name,
                "threshold": threshold,
                "direction": direction,
                "value": float(feature_value) if isinstance(feature_value, (int, float)) else 0
            })
            node_id += 1
        
        return {
            "decision_tree": tree,
            "depth": 3,
            "leaf_count": len(tree["nodes"]),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_trust_score_breakdown(self, user_id: str, trust_score: float,
                                       components: Dict[str, float]) -> Dict:
        """Break down trust score into components"""
        
        total = sum(components.values())
        
        breakdown = []
        for component_name, score in components.items():
            percentage = (score / total * 100) if total > 0 else 0
            
            breakdown.append({
                "component": component_name,
                "score": float(score),
                "percentage": float(percentage),
                "status": "good" if score > 0.7 else "warning" if score > 0.4 else "critical"
            })
        
        # Sort by score descending
        breakdown.sort(key=lambda x: x["score"], reverse=True)
        
        return {
            "user_id": user_id,
            "overall_trust_score": float(trust_score),
            "components": breakdown,
            "total_components": len(breakdown),
            "interpretation": self._interpret_trust_score(trust_score)
        }
    
    def _get_mitigation(self, factor: str, risk_level: str) -> str:
        """Get mitigation recommendation for a risk factor"""
        
        mitigations = {
            "anomalous_behavior": {
                "high": "Require email verification",
                "critical": "Block and notify user"
            },
            "new_device": {
                "high": "Request MFA",
                "critical": "Block until verified"
            },
            "location_change": {
                "high": "Verify via secondary method",
                "critical": "Deny and investigate"
            },
            "unusual_activity": {
                "high": "Monitor session closely",
                "critical": "Terminate session"
            }
        }
        
        return mitigations.get(factor, {}).get(risk_level, "Monitor activity")
    
    def _interpret_trust_score(self, score: float) -> str:
        """Interpret a trust score as human-readable text"""
        
        if score >= 0.9:
            return "Highly trusted - low risk"
        elif score >= 0.7:
            return "Trusted - acceptable risk"
        elif score >= 0.5:
            return "Neutral - moderate risk"
        elif score >= 0.3:
            return "Suspicious - elevated risk"
        else:
            return "Very suspicious - critical risk"
    
    async def explain_policy_decision(self, policy_decision_id: str,
                                     policy_name: str,
                                     evaluation_result: Dict) -> Dict:
        """Generate comprehensive policy decision explanation"""
        
        return {
            "policy_decision_id": policy_decision_id,
            "policy_name": policy_name,
            "decision": evaluation_result.get("decision", "unknown"),
            "decision_timestamp": datetime.utcnow().isoformat(),
            "explanation": {
                "summary": f"Policy '{policy_name}' evaluated with result: {evaluation_result.get('decision')}",
                "rules_evaluated": evaluation_result.get("rules_evaluated", []),
                "triggered_rules": evaluation_result.get("triggered_rules", []),
                "key_factors": evaluation_result.get("key_factors", [])
            },
            "confidence": float(evaluation_result.get("confidence", 0.85)),
            "alternative_scenarios": self._generate_alternative_scenarios(evaluation_result)
        }
    
    def _generate_alternative_scenarios(self, result: Dict) -> List[Dict]:
        """Generate what-if scenarios"""
        
        scenarios = []
        
        # Scenario 1: If device was trusted
        scenarios.append({
            "scenario": "If device was trusted",
            "resulting_decision": "Allow",
            "probability": "High"
        })
        
        # Scenario 2: If location was verified
        scenarios.append({
            "scenario": "If location was verified",
            "resulting_decision": "Allow",
            "probability": "High"
        })
        
        # Scenario 3: If time-based anomaly cleared
        scenarios.append({
            "scenario": "If outside unusual hours",
            "resulting_decision": "Allow",
            "probability": "Medium"
        })
        
        return scenarios
