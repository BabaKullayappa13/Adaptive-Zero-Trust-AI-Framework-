"""
Federated Learning Service for Privacy-Preserving Authentication Model Improvement
Implements FedAvg parameter aggregation across decentralized client edge nodes (Simulation Mode).
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
import numpy as np


class FederatedLearningService:
    """Federated Learning Simulation for Privacy-Preserving Multi-Factor Authentication Model Improvement"""

    FRAMEWORK_LABEL = "Federated Learning Simulation for Privacy-Preserving Authentication Model Improvement"

    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func

    async def run_simulation_round(self, target_accuracy: float = 0.98) -> Dict[str, Any]:
        """Execute a complete simulated federated training round with 3 independent edge clients"""
        async with self.db_connect() as conn:
            # 1. Determine next round number
            res = await conn.execute("SELECT MAX(round_number) FROM federated_rounds")
            row = await res.fetchone()
            next_round = int(row[0] or 0) + 1
            model_version = f"v{next_round}.0.0-fedavg"

            # 2. Create round record
            await conn.execute(
                """INSERT INTO federated_rounds 
                   (round_number, model_version, target_accuracy, minimum_participants, status, created_at)
                   VALUES (%s, %s, %s, 3, 'in_progress', NOW())""",
                (next_round, model_version, target_accuracy)
            )
            r_res = await conn.execute("SELECT id FROM federated_rounds WHERE round_number = %s", (next_round,))
            round_id = int((await r_res.fetchone())[0])

            # 3. Simulate 3 independent client nodes training on local non-shared behavioral data
            # Client A: Private Cloud DC-West (1,450 local records)
            # Client B: Public Cloud AWS-East (2,200 local records)
            # Client C: Edge Gateway Central (1,050 local records)
            noise_a = float(np.random.uniform(0.001, 0.008))
            noise_b = float(np.random.uniform(0.002, 0.009))
            noise_c = float(np.random.uniform(0.003, 0.010))

            base_acc = min(0.985, 0.945 + (next_round * 0.006))
            client_a_acc = round(base_acc + noise_a, 4)
            client_a_loss = round(max(0.02, 0.065 - (next_round * 0.004) + noise_a), 4)

            client_b_acc = round(base_acc - noise_b, 4)
            client_b_loss = round(max(0.022, 0.068 - (next_round * 0.004) + noise_b), 4)

            client_c_acc = round(base_acc + noise_c, 4)
            client_c_loss = round(max(0.025, 0.072 - (next_round * 0.004) + noise_c), 4)

            participants_data = [
                ("Client-A (Private Cloud DC-West)", client_a_acc, client_a_loss, 1450),
                ("Client-B (Public Cloud AWS-East)", client_b_acc, client_b_loss, 2200),
                ("Client-C (Edge Gateway Central)", client_c_acc, client_c_loss, 1050),
            ]

            for org_id, acc, loss, samples in participants_data:
                await conn.execute(
                    """INSERT INTO federated_participants 
                       (round_id, org_id, local_accuracy, local_loss, data_samples_count, uploaded_at, created_at)
                       VALUES (%s, %s, %s, %s, %s, NOW(), NOW())""",
                    (round_id, org_id, acc, loss, samples)
                )

            # 4. Central FedAvg Aggregation: Weighted average by local sample count
            total_samples = sum(p[3] for p in participants_data)
            global_acc = round(sum(p[1] * (p[3] / total_samples) for p in participants_data), 4)
            global_loss = round(sum(p[2] * (p[3] / total_samples) for p in participants_data), 4)

            # 5. Insert aggregated global model
            await conn.execute(
                """INSERT INTO federated_models 
                   (round_id, round_number, version, model_version, participating_clients, global_accuracy, global_loss, model_type, aggregated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, 'fedavg', NOW())""",
                (round_id, next_round, model_version, model_version, len(participants_data), global_acc, global_loss)
            )

            # Mark round completed
            await conn.execute(
                "UPDATE federated_rounds SET status = 'completed' WHERE id = %s",
                (round_id,)
            )
            await conn.commit()

            return {
                "simulation_label": self.FRAMEWORK_LABEL,
                "round_id": round_id,
                "round_number": next_round,
                "model_version": model_version,
                "status": "completed",
                "global_accuracy": global_acc,
                "global_loss": global_loss,
                "participating_clients": len(participants_data),
                "total_samples_processed": total_samples,
                "algorithm": "Federated Averaging (FedAvg)",
                "client_summaries": [
                    {
                        "client": p[0],
                        "accuracy": p[1],
                        "loss": p[2],
                        "sample_count": p[3],
                        "aggregation_weight": round(p[3] / total_samples, 3)
                    }
                    for p in participants_data
                ]
            }

    async def get_rounds_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get history of federated rounds with participant statistics"""
        async with self.db_connect() as conn:
            res = await conn.execute(
                """SELECT r.id, r.round_number, r.model_version, r.target_accuracy, 
                          r.status, r.created_at, m.global_accuracy, m.global_loss
                   FROM federated_rounds r
                   LEFT JOIN federated_models m ON r.id = m.round_id
                   ORDER BY r.round_number DESC 
                   LIMIT %s""",
                (limit,)
            )
            rows = await res.fetchall()

            history = []
            for row in rows:
                r_id = int(row[0])
                # Fetch participants count
                p_res = await conn.execute(
                    "SELECT COUNT(*), SUM(data_samples_count) FROM federated_participants WHERE round_id = %s",
                    (r_id,)
                )
                p_row = await p_res.fetchone()
                p_count = int(p_row[0] or 0) if p_row else 0
                p_samples = int(p_row[1] or 0) if p_row else 0

                history.append({
                    "round_id": r_id,
                    "round_number": int(row[1]),
                    "model_version": str(row[2]),
                    "target_accuracy": float(row[3] or 0.95),
                    "status": str(row[4]),
                    "created_at": str(row[5]),
                    "global_accuracy": float(row[6] or 0.95),
                    "global_loss": float(row[7] or 0.05),
                    "total_participants": p_count,
                    "total_samples": p_samples
                })

            return history

    async def get_models(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get aggregated global federated models"""
        async with self.db_connect() as conn:
            res = await conn.execute(
                """SELECT id, round_id, version, global_accuracy, global_loss, aggregated_at, model_type 
                   FROM federated_models 
                   ORDER BY id DESC 
                   LIMIT %s""",
                (limit,)
            )
            rows = await res.fetchall()
            return [
                {
                    "id": int(r[0]),
                    "round_id": int(r[1]),
                    "version": str(r[2]),
                    "global_accuracy": float(r[3]),
                    "global_loss": float(r[4]),
                    "aggregated_at": str(r[5]),
                    "model_type": str(r[6])
                }
                for r in rows
            ]
