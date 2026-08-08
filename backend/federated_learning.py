import asyncio
import json
import numpy as np
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import psycopg
from psycopg import AsyncConnection

class FederatedLearningService:
    """Federated Learning with FedAvg aggregation"""
    
    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func
    
    async def create_round(self, round_number: int, model_version: str, 
                          min_participants: int = 2, target_accuracy: float = 0.95) -> Dict:
        """Create a new federated learning round"""
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                INSERT INTO federated_rounds 
                (round_number, model_version, target_accuracy, minimum_participants, status)
                VALUES (%s, %s, %s, %s, 'pending')
                RETURNING id, round_number, created_at
            """, (round_number, model_version, target_accuracy, min_participants))
            row = await result.fetchone()
            return {
                "round_id": row[0],
                "round_number": row[1],
                "status": "pending",
                "created_at": row[2].isoformat()
            }
    
    async def register_participant(self, round_id: int, org_id: int) -> Dict:
        """Register an organization as participant in a round"""
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                INSERT INTO federated_participants (round_id, org_id)
                VALUES (%s, %s)
                RETURNING id, round_id, org_id, created_at
            """, (round_id, org_id))
            row = await result.fetchone()
            return {
                "participant_id": row[0],
                "round_id": row[1],
                "org_id": row[2],
                "status": "registered"
            }
    
    async def submit_local_model(self, participant_id: int, accuracy: float, 
                                 loss: float, data_samples: int) -> Dict:
        """Submit local model training results"""
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                UPDATE federated_participants
                SET local_accuracy = %s, local_loss = %s, data_samples_count = %s, uploaded_at = NOW()
                WHERE id = %s
                RETURNING id, round_id, org_id, local_accuracy
            """, (accuracy, loss, data_samples, participant_id))
            row = await result.fetchone()
            return {
                "participant_id": row[0],
                "round_id": row[1],
                "org_id": row[2],
                "local_accuracy": float(row[3])
            }
    
    async def aggregate_models(self, round_id: int) -> Dict:
        """Aggregate local models using FedAvg algorithm"""
        async with await self.db_connect() as conn:
            # Get all participants
            participants = await conn.execute("""
                SELECT id, org_id, local_accuracy, local_loss, data_samples_count
                FROM federated_participants
                WHERE round_id = %s AND uploaded_at IS NOT NULL
            """, (round_id,))
            
            rows = await participants.fetchall()
            if not rows:
                return {"error": "No participants submitted models"}

            round_result = await conn.execute(
                "SELECT minimum_participants, status FROM federated_rounds WHERE id = %s FOR UPDATE",
                (round_id,),
            )
            round_row = await round_result.fetchone()
            if not round_row:
                return {"error": "Federated round not found"}
            minimum_participants, round_status = round_row
            if len(rows) < minimum_participants:
                return {
                    "error": "Minimum participant threshold not met",
                    "required_participants": minimum_participants,
                    "submitted_participants": len(rows),
                }
            if any(row[4] is None or row[4] <= 0 for row in rows):
                return {"error": "Each submitted model must include a positive sample count"}
            if round_status == "completed":
                return {"error": "Federated round is already completed"}

            # FedAvg: Weighted average by data samples
            total_samples = sum(row[4] for row in rows)
            weights = [row[4] / total_samples for row in rows]
            
            # Compute global accuracy and loss (weighted average)
            global_accuracy = sum(row[2] * w for row, w in zip(rows, weights))
            global_loss = sum(row[3] * w for row, w in zip(rows, weights))
            
            # Get round info and model version
            round_info = await conn.execute(
                "SELECT model_version FROM federated_rounds WHERE id = %s",
                (round_id,)
            )
            model_version = (await round_info.fetchone())[0]
            
            # Store aggregated model
            result = await conn.execute("""
                INSERT INTO federated_models
                (round_id, version, global_accuracy, global_loss, aggregated_at, model_type)
                VALUES (%s, %s, %s, %s, NOW(), 'fedavg')
                RETURNING id, version, global_accuracy, global_loss, aggregated_at
            """, (round_id, f"{model_version}-aggregated", global_accuracy, global_loss))
            
            model_row = await result.fetchone()
            
            # Update round status
            await conn.execute(
                "UPDATE federated_rounds SET status = %s WHERE id = %s",
                ('completed', round_id)
            )
            
            return {
                "round_id": round_id,
                "model_id": model_row[0],
                "model_version": model_row[1],
                "global_accuracy": float(model_row[2]),
                "global_loss": float(model_row[3]),
                "participants_count": len(rows),
                "aggregation_method": "fedavg",
                "aggregated_at": model_row[4].isoformat()
            }
    
    async def get_round_status(self, round_id: int) -> Dict:
        """Get status of a federated round"""
        async with await self.db_connect() as conn:
            # Get round info
            round_result = await conn.execute(
                "SELECT round_number, status, model_version, target_accuracy FROM federated_rounds WHERE id = %s",
                (round_id,)
            )
            round_row = await round_result.fetchone()
            
            # Get participants
            participants = await conn.execute("""
                SELECT COUNT(*), SUM(CASE WHEN uploaded_at IS NOT NULL THEN 1 ELSE 0 END)
                FROM federated_participants
                WHERE round_id = %s
            """, (round_id,))
            
            part_row = await participants.fetchone()
            total_participants = part_row[0]
            submitted_models = part_row[1] or 0
            
            # Get latest aggregated model
            model_result = await conn.execute("""
                SELECT global_accuracy, global_loss, aggregated_at
                FROM federated_models
                WHERE round_id = %s
                ORDER BY aggregated_at DESC
                LIMIT 1
            """, (round_id,))
            
            model_row = await model_result.fetchone()
            
            return {
                "round_id": round_id,
                "round_number": round_row[0],
                "status": round_row[1],
                "model_version": round_row[2],
                "target_accuracy": round_row[3],
                "total_participants": total_participants,
                "submitted_models": submitted_models,
                "global_accuracy": float(model_row[0]) if model_row else None,
                "global_loss": float(model_row[1]) if model_row else None,
                "aggregated_at": model_row[2].isoformat() if model_row else None
            }
    
    async def get_round_history(self, limit: int = 10) -> List[Dict]:
        """Get history of federated rounds"""
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                SELECT id, round_number, status, model_version, target_accuracy, created_at
                FROM federated_rounds
                ORDER BY created_at DESC
                LIMIT %s
            """, (limit,))
            
            rows = await result.fetchall()
            return [
                {
                    "round_id": row[0],
                    "round_number": row[1],
                    "status": row[2],
                    "model_version": row[3],
                    "target_accuracy": row[4],
                    "created_at": row[5].isoformat()
                }
                for row in rows
            ]
    
    async def start_round(self, round_id: int) -> Dict:
        """Start a federated round"""
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                UPDATE federated_rounds
                SET status = 'in_progress', started_at = NOW()
                WHERE id = %s
                RETURNING id, status, started_at
            """, (round_id,))
            
            row = await result.fetchone()
            return {
                "round_id": row[0],
                "status": row[1],
                "started_at": row[2].isoformat()
            }
    
    async def get_model_versions(self, limit: int = 10) -> List[Dict]:
        """Get federated model versions"""
        async with await self.db_connect() as conn:
            result = await conn.execute("""
                SELECT id, version, global_accuracy, global_loss, aggregated_at, round_id
                FROM federated_models
                ORDER BY aggregated_at DESC
                LIMIT %s
            """, (limit,))
            
            rows = await result.fetchall()
            return [
                {
                    "model_id": row[0],
                    "version": row[1],
                    "global_accuracy": float(row[2]) if row[2] else None,
                    "global_loss": float(row[3]) if row[3] else None,
                    "aggregated_at": row[4].isoformat() if row[4] else None,
                    "round_id": row[5]
                }
                for row in rows
            ]
