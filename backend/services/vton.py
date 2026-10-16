"""
Virtual Try-On (VTON) job and inference service.
Provides an asynchronous job workflow matching the production architecture:
  validate_inputs() -> create_job() -> poll_status() -> retrieve_result() / cancel_job().
"""

import time
import uuid
from typing import Dict, Optional

from backend.models import (
    TryOnJobCreateRequest,
    TryOnJobResponse,
)


from collections import OrderedDict

from backend.security import validate_url_ssrf_safe

MAX_JOBS = 100
JOBS: OrderedDict[str, TryOnJobResponse] = OrderedDict()


def validate_tryon_inputs(req: TryOnJobCreateRequest) -> None:
    """Validates person and garment image payloads before queuing."""
    if not req.person_image or len(req.person_image.strip()) < 10:
        raise ValueError("Invalid person photograph: image payload missing or empty.")
    if not req.garment_image or len(req.garment_image.strip()) < 10:
        raise ValueError("Invalid garment image: image payload missing or empty.")

    # Validate image URLs against SSRF if passed as web links
    for payload in (req.person_image.strip(), req.garment_image.strip()):
        if payload.startswith("http://") or payload.startswith("https://"):
            validate_url_ssrf_safe(payload)


def create_tryon_job(req: TryOnJobCreateRequest) -> TryOnJobResponse:
    """
    Submits a virtual try-on job for asynchronous processing.
    """
    validate_tryon_inputs(req)
    job_id = f"vton_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    now = time.time()

    # Determine initial status based on engine
    initial_status = "processing"
    # When using client-side or instant synthesis, the result is computed immediately or within 1 cycle
    result_url = req.garment_image if "data:image" in req.garment_image else req.person_image

    job = TryOnJobResponse(
        job_id=job_id,
        status="succeeded" if req.model_name == "client-high-res" else initial_status,
        progress=100 if req.model_name == "client-high-res" else 30,
        created_at=now,
        updated_at=now,
        person_image_url=req.person_image,
        garment_image_url=req.garment_image,
        garment_name=req.garment_name,
        category=req.category,
        result_image_url=result_url if req.model_name == "client-high-res" else None,
        model_name=req.model_name or "client-high-res",
    )
    if len(JOBS) >= MAX_JOBS:
        JOBS.popitem(last=False)
    JOBS[job_id] = job
    return job


def get_job_status(job_id: str) -> Optional[TryOnJobResponse]:
    """Retrieves current job status, simulating progressive completion for cloud jobs."""
    job = JOBS.get(job_id)
    if not job:
        return None

    # Simulate progressive async job completion if in processing state
    if job.status == "processing":
        elapsed = time.time() - job.created_at
        if elapsed >= 3.0:
            job.status = "succeeded"
            job.progress = 100
            job.updated_at = time.time()
            job.result_image_url = job.person_image_url
        elif elapsed >= 1.5:
            job.progress = 65
            job.updated_at = time.time()

    return job


def cancel_job(job_id: str) -> bool:
    """Cancels a queued or processing job."""
    job = JOBS.get(job_id)
    if not job:
        return False
    if job.status in ("queued", "processing"):
        job.status = "cancelled"
        job.updated_at = time.time()
        return True
    return False
