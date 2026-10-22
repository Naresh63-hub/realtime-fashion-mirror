"""
AI Fashion Mirror — Production Backend API.
Built with FastAPI & Pydantic.
"""

import logging
import os
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)

from backend.models import (
    HealthResponse,
    LiveFrameSubmitRequest,
    LiveFrameSubmitResponse,
    LiveSessionCreateResponse,
    LiveSessionStatusResponse,
    TryOnConfigResponse,
    TryOnJobCreateRequest,
    TryOnJobResponse,
    UrlExtractRequest,
    UrlExtractResponse,
)
from backend.services.extractor import extract_product_from_url
from backend.services.vton import (
    cancel_job,
    create_tryon_job,
    get_job_status,
    get_vton_config,
)
from backend.services.live_vton import (
    create_live_session,
    submit_live_frame,
    get_live_session_status,
    close_live_session,
)


app = FastAPI(
    title="AI Fashion Mirror API",
    version="1.0.0",
    description="Backend microservices for product extraction, SSRF safety, and virtual try-on inference.",
)

# Cross-Origin Resource Sharing (CORS) configuration
ALLOWED_ORIGINS = [
    orig.strip()
    for orig in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000",
    ).split(",")
    if orig.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
def health_check():
    """Health status and supported CV/AI capabilities."""
    return HealthResponse(
        status="ok",
        version="1.0.0",
        service="AI Fashion Mirror Backend",
        features=[
            "ssrf_protection",
            "shopping_url_extraction",
            "virtual_tryon_jobs",
            "client_high_res_mesh_warp",
            "cloud_genai_adapter",
        ],
    )


@app.get("/api/tryon/config", response_model=TryOnConfigResponse)
def get_tryon_configuration():
    """
    Returns virtual try-on configuration status and external provider readiness.
    Used by frontend to discover whether real Cloud Generative AI (IDM-VTON) is configured
    or whether Instant Canvas Try-On is the primary mode.
    """
    return get_vton_config()


@app.post("/api/products/extract", response_model=UrlExtractResponse)
async def extract_product(payload: UrlExtractRequest):
    """
    Extracts product metadata and garment imagery from supported shopping URLs.
    Validates against SSRF, internal IPs, and unsupported protocols.
    """
    try:
        result = await extract_product_from_url(payload.url)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Product extraction internal error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Product extraction failed. Please check the URL and try again.",
        )


@app.post("/api/tryon/jobs", response_model=TryOnJobResponse, status_code=status.HTTP_201_CREATED)
def submit_tryon_job(payload: TryOnJobCreateRequest):
    """
    Submits an asynchronous virtual try-on job for processing.
    """
    try:
        job = create_tryon_job(payload)
        return job
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit try-on job: {str(exc)}",
        )


@app.get("/api/tryon/jobs/{job_id}", response_model=TryOnJobResponse)
def check_job_status(job_id: str):
    """
    Checks the status and retrieves output for a previously submitted try-on job.
    """
    job = get_job_status(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Try-on job '{job_id}' not found.",
        )
    return job


@app.delete("/api/tryon/jobs/{job_id}")
def cancel_tryon_job(job_id: str):
    """
    Cancels an active virtual try-on job.
    """
    success = cancel_job(job_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job '{job_id}' is not in a cancellable state or does not exist.",
        )
    return {"message": f"Job '{job_id}' successfully cancelled.", "job_id": job_id}


# -----------------------------------------------------------------------------
# Live AI Virtual Try-On Session Endpoints
# -----------------------------------------------------------------------------

@app.post("/api/live/sessions", response_model=LiveSessionCreateResponse, status_code=status.HTTP_201_CREATED)
def start_live_session():
    """Initializes a new live AI try-on frame sampling session."""
    return create_live_session()


@app.get("/api/live/sessions/{session_id}", response_model=LiveSessionStatusResponse)
def get_session_status(session_id: str):
    """Retrieves session status, active frame progress, and latest AI synthesized output."""
    status_resp = get_live_session_status(session_id)
    if not status_resp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Live session '{session_id}' not found or has expired.",
        )
    return status_resp


@app.post("/api/live/sessions/{session_id}/frame", response_model=LiveFrameSubmitResponse)
def process_live_frame(session_id: str, payload: LiveFrameSubmitRequest):
    """
    Submits a sampled live camera frame for AI enhancement.
    Applies concurrency protection: in-flight frames drop subsequent frames to prevent queue backlog.
    """
    return submit_live_frame(session_id, payload)


@app.delete("/api/live/sessions/{session_id}")
def end_live_session(session_id: str):
    """Closes live session and cancels active in-flight processing."""
    closed = close_live_session(session_id)
    return {"message": "Session closed", "session_id": session_id, "closed": closed}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
