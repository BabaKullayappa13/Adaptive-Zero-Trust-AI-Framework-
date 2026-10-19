"""
AI Image Intelligence & Model Monitoring Service
------------------------------------------------
Provides image ingestion, validation, and real-time telemetry extraction using Pillow.

INTEGRITY DIRECTIVE (User Rule #1):
If no real, labeled, legally usable security image dataset pre-exists in the codebase,
DO NOT fabricate synthetic pixel features, synthetic labels, or artificial accuracy matrices.
Report dataset status honestly as 'Evaluation dataset unavailable'.
"""

import io
import math
import time
import uuid
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from PIL import Image

ALLOWED_IMAGE_FORMATS = {"PNG", "JPEG", "JPG", "WEBP"}
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


class ImageClassifierService:
    def __init__(self, db_connect_func):
        self.db_connect = db_connect_func

    def validate_and_extract_features(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Ingest, validate, and extract real visual/statistical properties using Pillow.
        Calculates width, height, aspect ratio, color mode, channel count, mean intensity,
        and Shannon entropy across color channels.
        """
        start_time = time.perf_counter()

        if len(file_bytes) > MAX_IMAGE_SIZE_BYTES:
            raise ValueError(f"File size exceeds maximum allowable limit of 10 MB ({len(file_bytes)} bytes)")

        try:
            image = Image.open(io.BytesIO(file_bytes))
            image.verify()  # Verify image integrity
            # Reopen for pixel operations after verify()
            image = Image.open(io.BytesIO(file_bytes))
        except Exception as e:
            raise ValueError(f"Invalid or corrupted image format: {str(e)}")

        img_format = (image.format or "UNKNOWN").upper()
        if img_format not in ALLOWED_IMAGE_FORMATS:
            raise ValueError(f"Unsupported image format '{img_format}'. Supported formats: {', '.join(sorted(ALLOWED_IMAGE_FORMATS))}")

        width, height = image.size
        mode = image.mode
        channels = len(image.getbands())

        # Shannon Entropy calculation on color distribution
        histogram = image.histogram()
        total_pixels = width * height * channels
        entropy = 0.0
        if total_pixels > 0:
            for count in histogram:
                if count > 0:
                    prob = count / total_pixels
                    entropy -= prob * math.log2(prob)

        # Mean pixel intensity
        if histogram and sum(histogram) > 0:
            total_sum = sum(i * count for i, count in enumerate(histogram[:256]))
            mean_intensity = round(total_sum / max(1, sum(histogram[:256])), 2)
        else:
            mean_intensity = 0.0

        latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return {
            "filename": filename,
            "file_size_bytes": len(file_bytes),
            "image_format": img_format,
            "format": img_format,
            "width": width,
            "height": height,
            "aspect_ratio": round(width / max(1, height), 3),
            "mode": mode,
            "channels": channels,
            "entropy": round(entropy, 4),
            "mean_intensity": mean_intensity,
            "inference_latency_ms": latency_ms,
            "latency_ms": latency_ms,
            "processed_at": datetime.now(timezone.utc).isoformat(),
        }

    async def record_inference(self, features: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
        """Persist image extraction record to image_inference_records table"""
        record_id = str(uuid.uuid4())
        details_obj = {
            "aspect_ratio": features["aspect_ratio"],
            "user_id": user_id,
            "engine": "Pillow-ZeroTrust-ImageEngine-v1.0"
        }
        async with self.db_connect() as conn:
            details_param = details_obj if conn.is_postgres else json.dumps(details_obj)
            await conn.execute(
                """INSERT INTO image_inference_records
                   (id, filename, file_size_bytes, image_format, width, height,
                    channels, entropy, mean_intensity, inference_latency_ms,
                    analysis_status, details, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())""",
                (
                    record_id,
                    features["filename"],
                    features["file_size_bytes"],
                    features["image_format"],
                    features["width"],
                    features["height"],
                    f"{features['mode']} ({features['channels']}ch)",
                    features["entropy"],
                    features["mean_intensity"],
                    features["inference_latency_ms"],
                    "PROCESSED",
                    details_param
                )
            )
            await conn.commit()

        return {
            "status": "SUCCESS",
            "record_id": record_id,
            **features,
            "analysis_status": "PROCESSED",
            "model_notice": "Features extracted via live image pipeline. Benchmark metrics report dataset unavailable per Zero Trust integrity standards."
        }

    async def get_overview(self) -> Dict[str, Any]:
        """Aggregate statistics from persisted image inference records"""
        async with self.db_connect() as conn:
            res = await conn.execute(
                """SELECT COUNT(*),
                          AVG(inference_latency_ms),
                          AVG(entropy),
                          AVG(file_size_bytes),
                          COUNT(CASE WHEN image_format = 'PNG' THEN 1 END),
                          COUNT(CASE WHEN image_format IN ('JPEG', 'JPG') THEN 1 END),
                          COUNT(CASE WHEN image_format = 'WEBP' THEN 1 END)
                   FROM image_inference_records"""
            )
            row = await res.fetchone()
            total_count = int(row[0] or 0) if row else 0
            avg_latency = round(float(row[1]), 2) if row and row[1] is not None else 0.0
            avg_entropy = round(float(row[2]), 4) if row and row[2] is not None else 0.0
            avg_size = int(row[3] or 0) if row and row[3] is not None else 0
            png_count = int(row[4] or 0) if row else 0
            jpeg_count = int(row[5] or 0) if row else 0
            webp_count = int(row[6] or 0) if row else 0

            return {
                "total_images_analyzed": total_count,
                "average_inference_latency_ms": avg_latency,
                "average_entropy": avg_entropy,
                "average_file_size_bytes": avg_size,
                "format_distribution": {
                    "PNG": png_count,
                    "JPEG": jpeg_count,
                    "WEBP": webp_count,
                },
                "pipeline_status": "OPERATIONAL",
                "engine_version": "Pillow-ZeroTrust-ImageEngine-v1.0",
                "evaluation_status": "Evaluation dataset unavailable",
                "evaluation_notice": "No pre-existing labeled security image dataset exists in the repository. Synthetic accuracy numbers are strictly disabled."
            }

    async def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieve recent image inference records from database"""
        async with self.db_connect() as conn:
            res = await conn.execute(
                """SELECT id, filename, file_size_bytes, image_format, width, height,
                          channels, entropy, mean_intensity, inference_latency_ms,
                          analysis_status, created_at
                   FROM image_inference_records
                   ORDER BY created_at DESC
                   LIMIT %s""",
                (limit,)
            )
            rows = await res.fetchall()
            return [
                {
                    "id": str(r[0]),
                    "filename": str(r[1]),
                    "file_size_bytes": int(r[2] or 0),
                    "image_format": str(r[3]),
                    "dimensions": f"{r[4]}x{r[5]}",
                    "channels": str(r[6]),
                    "entropy": round(float(r[7] or 0.0), 4),
                    "mean_intensity": round(float(r[8] or 0.0), 2),
                    "latency_ms": round(float(r[9] or 0.0), 2),
                    "status": str(r[10]),
                    "created_at": str(r[11])
                }
                for r in rows
            ]

    def get_evaluation_report(self) -> Dict[str, Any]:
        """
        Truthful report of security classifier benchmark dataset.
        Complies strictly with User Rule #1.
        """
        return {
            "status": "Evaluation dataset unavailable",
            "has_labeled_dataset": False,
            "accuracy": None,
            "f1_score": None,
            "precision": None,
            "recall": None,
            "confusion_matrix": None,
            "dataset_provenance": "None pre-packaged in repository",
            "notice": "A verified, labeled security image dataset is not pre-packaged in this repository. In compliance with Zero Trust data integrity guidelines, synthetic benchmark metrics, artificial confusion matrices, and fabricated accuracy claims are strictly disallowed.",
            "pipeline_ready": True,
            "upload_supported_formats": ["PNG", "JPEG", "WEBP"],
            "max_file_size_mb": 10
        }
