"""
AI Fashion Mirror — Production Backend API.
Built with FastAPI & Pydantic.
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from backend.models import (
    HealthResponse,
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
)


app = FastAPI(
    title="AI Fashion Mirror API",
    version="1.0.0",
    description="Backend microservices for product extraction, SSRF safety, and virtual try-on inference.",
)

# Cross-Origin Resource Sharing (CORS) configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows frontend in dev & staging
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Product extraction failed: {str(exc)}",
        )


@app.post("/api/tryon/jobs", response_model=TryOnJobResponse, status_code=status.HTTP_201_CREATED)
def submit_tryon_job(payload: TryOnJobCreateRequest):
    """
    Submits an asynchronous virtual try-on job for processing.
    """
    try:
        job = create_tryon_job(payload)
        return job
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
