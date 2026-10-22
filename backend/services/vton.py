"""
Virtual Try-On (VTON) job and inference service.
Provides a production-grade provider adapter for generative diffusion try-on
(e.g., IDM-VTON on Replicate or custom inference endpoints), image validation,
asynchronous polling with exponential backoff, and graceful unconfigured fallbacks.
"""

import asyncio
import base64
import logging
import os
import time
import uuid
from collections import OrderedDict
from typing import Any, Callable, Dict, Optional

import httpx
from backend.models import (
    TryOnConfigResponse,
    TryOnJobCreateRequest,
    TryOnJobResponse,
)
from backend.security import validate_url_ssrf_safe

logger = logging.getLogger(__name__)

MAX_JOBS = 100
MAX_IMAGE_PAYLOAD_BYTES = 10 * 1024 * 1024  # 10 MB per image
INFERENCE_TIMEOUT_SECONDS = 90.0

JOBS: OrderedDict[str, TryOnJobResponse] = OrderedDict()
JOB_CANCEL_URLS: Dict[str, str] = {}

# Test hook to allow mocking external API calls in unit tests without paid network calls
_TEST_INFERENCE_HOOK: Optional[Callable[[TryOnJobCreateRequest], Dict[str, Any]]] = None


def set_test_inference_hook(hook: Optional[Callable[[TryOnJobCreateRequest], Dict[str, Any]]]) -> None:
    """Sets a test hook for mocking inference provider responses."""
    global _TEST_INFERENCE_HOOK
    _TEST_INFERENCE_HOOK = hook


def get_vton_api_key() -> str:
    """Reads VTON API credentials exclusively from backend environment variables."""
    return os.getenv("VTON_API_KEY", "").strip()


def get_vton_provider_name() -> str:
    """Determines active provider name."""
    explicit = os.getenv("VTON_PROVIDER", "").strip().lower()
    if explicit:
        return explicit
    key = get_vton_api_key()
    if key.startswith("r8_") or "replicate" in os.getenv("VTON_API_URL", "").lower():
        return "replicate"
    if os.getenv("VTON_API_URL", "").strip():
        return "custom_http"
    return "none"


def is_vton_configured() -> bool:
    """Returns True if a real generative AI inference provider is configured."""
    key = get_vton_api_key()
    url = os.getenv("VTON_API_URL", "").strip()
    return bool(key or url)


def get_vton_config() -> TryOnConfigResponse:
    """Reports whether a real generative AI provider is configured."""
    configured = is_vton_configured()
    provider = get_vton_provider_name()
    model_version = os.getenv(
        "VTON_MODEL_VERSION",
        "c871bb9b046607b680449ecbae55fd8c6d8bc1a2b1d981d76326496738469db1",
    ).strip()

    if configured:
        return TryOnConfigResponse(
            configured=True,
            provider=provider,
            model_name="IDM-VTON (Diffusion)",
            model_version=model_version,
            supported_categories=["upper_body", "lower_body", "dresses", "t-shirt", "shirt", "jacket", "kurti"],
            guidance=(
                "Generative AI provider is active. Research/Academic model IDM-VTON under CC BY-NC-SA 4.0. "
                "Commercial use requires bilateral author agreement."
            ),
        )
    return TryOnConfigResponse(
        configured=False,
        provider="none",
        model_name="IDM-VTON (Unconfigured)",
        model_version=None,
        supported_categories=["upper_body", "lower_body", "dresses", "t-shirt", "shirt", "jacket", "kurti"],
        guidance=(
            "Cloud Generative AI is unconfigured. Set VTON_API_KEY in the backend .env to enable IDM-VTON diffusion. "
            "Instant Canvas Try-On is available with 0s latency."
        ),
    )


def _validate_image_payload(payload: str, field_name: str) -> None:
    """Validates image payload size, encoding, and safety."""
    if not payload or not isinstance(payload, str) or len(payload.strip()) < 10:
        raise ValueError(f"Invalid {field_name}: image payload missing or empty.")
    
    cleaned = payload.strip()
    if len(cleaned.encode("utf-8")) > MAX_IMAGE_PAYLOAD_BYTES:
        raise ValueError(f"Invalid {field_name}: payload exceeds maximum allowed size of 10 MB.")

    if cleaned.startswith("data:image/"):
        parts = cleaned.split(",", 1)
        if len(parts) != 2:
            raise ValueError(f"Invalid {field_name}: malformed data URL.")
        header, b64_data = parts
        if ";base64" not in header:
            raise ValueError(f"Invalid {field_name}: data URL must be base64-encoded.")
        try:
            # Validate decode on a leading slice to verify encoding integrity
            sample = base64.b64decode(b64_data[:128] + "==")
            if len(sample) == 0 and len(b64_data) > 0:
                raise ValueError(f"Invalid {field_name}: empty base64 content.")
        except Exception as exc:
            raise ValueError(f"Invalid {field_name}: invalid base64 encoding: {exc}")
    elif cleaned.startswith("http://") or cleaned.startswith("https://"):
        validate_url_ssrf_safe(cleaned)
    elif cleaned.startswith("/"):
        # Local asset path
        pass
    else:
        raise ValueError(
            f"Invalid {field_name}: unsupported format. Must be a valid Data URL (data:image/...) or safe HTTP/HTTPS URL."
        )


def validate_tryon_inputs(req: TryOnJobCreateRequest) -> None:
    """Validates person and garment image payloads before queuing."""
    _validate_image_payload(req.person_image, "person photograph")
    _validate_image_payload(req.garment_image, "garment image")


def create_tryon_job(req: TryOnJobCreateRequest) -> TryOnJobResponse:
    """
    Submits a virtual try-on job for asynchronous processing.
    Ensures that unconfigured states, instant canvas modes, and cloud diffusion jobs are properly routed.
    """
    validate_tryon_inputs(req)
    job_id = f"vton_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    now = time.time()
    mode = req.model_name or "client-high-res"

    if mode == "client-high-res":
        # Instant local synthesis
        result_url = req.garment_image if "data:image" in req.garment_image else req.person_image
        job = TryOnJobResponse(
            job_id=job_id,
            status="succeeded",
            progress=100,
            created_at=now,
            updated_at=now,
            person_image_url=req.person_image,
            garment_image_url=req.garment_image,
            garment_name=req.garment_name,
            category=req.category,
            result_image_url=result_url,
            model_name="Client High-Res Mesh Warp",
            provider="local-canvas",
            can_fallback_to_canvas=True,
        )
    else:
        # Cloud Generative AI Diffusion mode
        if not is_vton_configured() and _TEST_INFERENCE_HOOK is None:
            # Explicit unconfigured failure — never fake an AI result!
            job = TryOnJobResponse(
                job_id=job_id,
                status="failed",
                progress=0,
                created_at=now,
                updated_at=now,
                person_image_url=req.person_image,
                garment_image_url=req.garment_image,
                garment_name=req.garment_name,
                category=req.category,
                result_image_url=None,
                error="Cloud Generative AI is unconfigured. VTON_API_KEY environment variable is not set. Please use Instant Canvas Try-On.",
                error_code="ERR_VTON_NOT_CONFIGURED",
                model_name="IDM-VTON (Diffusion)",
                provider="none",
                can_fallback_to_canvas=True,
            )
        else:
            provider_name = get_vton_provider_name()
            job = TryOnJobResponse(
                job_id=job_id,
                status="queued",
                progress=10,
                created_at=now,
                updated_at=now,
                person_image_url=req.person_image,
                garment_image_url=req.garment_image,
                garment_name=req.garment_name,
                category=req.category,
                result_image_url=None,
                model_name="IDM-VTON (Diffusion)",
                provider=provider_name,
                can_fallback_to_canvas=True,
            )
            # If test hook is installed, run it immediately to support synchronous test clients
            if _TEST_INFERENCE_HOOK is not None:
                _execute_test_hook(job, req)
            else:
                dispatch_cloud_worker(job_id, req)

    if len(JOBS) >= MAX_JOBS:
        oldest_id, _ = JOBS.popitem(last=False)
        JOB_CANCEL_URLS.pop(oldest_id, None)

    JOBS[job_id] = job
    return job


def _execute_test_hook(job: TryOnJobResponse, req: TryOnJobCreateRequest) -> None:
    """Executes test mock hook synchronously during test runner execution."""
    if _TEST_INFERENCE_HOOK is None:
        return
    try:
        mock_resp = _TEST_INFERENCE_HOOK(req)
        if mock_resp.get("status") == "succeeded":
            job.status = "succeeded"
            job.progress = 100
            job.result_image_url = mock_resp.get("result_image_url")
            job.updated_at = time.time()
        elif mock_resp.get("status") == "processing":
            job.status = "processing"
            job.progress = mock_resp.get("progress", 30)
            job.updated_at = time.time()
        else:
            job.status = "failed"
            job.error = mock_resp.get("error", "Simulated mock provider error.")
            job.error_code = mock_resp.get("error_code", "ERR_MOCK_FAILURE")
            job.updated_at = time.time()
    except Exception as exc:
        job.status = "failed"
        job.error = str(exc)
        job.error_code = "ERR_TEST_HOOK_EXCEPTION"
        job.updated_at = time.time()


def dispatch_cloud_worker(job_id: str, req: TryOnJobCreateRequest) -> None:
    """Dispatches background cloud worker safely across async server and sync test environments."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(run_cloud_vton_worker(job_id, req))
    except RuntimeError:
        import threading

        def _runner():
            asyncio.run(run_cloud_vton_worker(job_id, req))

        thread = threading.Thread(target=_runner, daemon=True)
        thread.start()


async def run_cloud_vton_worker(job_id: str, req: TryOnJobCreateRequest) -> None:
    """
    Background worker that communicates with the real diffusion provider (e.g., Replicate IDM-VTON)
    or executes the test hook during unit test runs.
    """
    job = JOBS.get(job_id)
    if not job:
        return

    # Check for test mock hook first to avoid external network calls during tests
    if _TEST_INFERENCE_HOOK is not None:
        try:
            job.status = "processing"
            job.progress = 50
            job.updated_at = time.time()
            mock_resp = _TEST_INFERENCE_HOOK(req)
            if mock_resp.get("status") == "succeeded":
                job.status = "succeeded"
                job.progress = 100
                job.result_image_url = mock_resp.get("result_image_url")
                job.updated_at = time.time()
            else:
                job.status = "failed"
                job.error = mock_resp.get("error", "Simulated mock provider error.")
                job.error_code = mock_resp.get("error_code", "ERR_MOCK_FAILURE")
                job.updated_at = time.time()
        except Exception as exc:
            job.status = "failed"
            job.error = str(exc)
            job.error_code = "ERR_TEST_HOOK_EXCEPTION"
            job.updated_at = time.time()
        return

    api_key = get_vton_api_key()
    api_url = os.getenv("VTON_API_URL", "https://api.replicate.com/v1/predictions").strip()
    model_version = os.getenv(
        "VTON_MODEL_VERSION",
        "c871bb9b046607b680449ecbae55fd8c6d8bc1a2b1d981d76326496738469db1",
    ).strip()

    category_map = {
        "t-shirt": "upper_body",
        "shirt": "upper_body",
        "jacket": "upper_body",
        "top": "upper_body",
        "kurti": "upper_body",
        "dress": "dresses",
        "lower_body": "lower_body",
    }
    replicate_category = category_map.get(req.category.lower(), "upper_body")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "version": model_version,
        "input": {
            "human_img": req.person_image,
            "garm_img": req.garment_image,
            "garment_des": req.garment_description or f"{req.garment_name} ({req.category})",
            "category": replicate_category,
            "crop": False,
            "steps": min(max(req.denoise_steps or 30, 15), 40),
            "seed": 42,
        },
    }

    start_time = time.time()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            job.status = "processing"
            job.progress = 25
            job.updated_at = time.time()

            # 1. Create prediction
            resp = await client.post(api_url, headers=headers, json=payload)
            if resp.status_code == 401:
                job.status = "failed"
                job.error = "Authentication failed: Invalid VTON_API_KEY."
                job.error_code = "ERR_AUTH_FAILED"
                job.updated_at = time.time()
                return
            elif resp.status_code == 422:
                job.status = "failed"
                job.error = f"Provider rejected input parameters: {resp.text}"
                job.error_code = "ERR_INVALID_PARAMETERS"
                job.updated_at = time.time()
                return
            elif resp.status_code not in (200, 201):
                job.status = "failed"
                job.error = f"Inference provider returned HTTP {resp.status_code}: {resp.text}"
                job.error_code = f"ERR_HTTP_{resp.status_code}"
                job.updated_at = time.time()
                return

            prediction = resp.json()
            poll_url = prediction.get("urls", {}).get("get")
            cancel_url = prediction.get("urls", {}).get("cancel")

            if cancel_url:
                JOB_CANCEL_URLS[job_id] = cancel_url

            if not poll_url:
                # Direct synchronous return (if endpoint returns output immediately)
                output = prediction.get("output")
                if output:
                    job.status = "succeeded"
                    job.progress = 100
                    job.result_image_url = output[0] if isinstance(output, list) else str(output)
                    job.updated_at = time.time()
                    return
                else:
                    job.status = "failed"
                    job.error = "Provider response missing output and status polling URL."
                    job.error_code = "ERR_MALFORMED_PROVIDER_RESPONSE"
                    job.updated_at = time.time()
                    return

            # 2. Polling loop with exponential backoff & timeout
            delay = 2.0
            while (time.time() - start_time) < INFERENCE_TIMEOUT_SECONDS:
                if job.status == "cancelled":
                    # User cancelled the job
                    if cancel_url:
                        try:
                            await client.post(cancel_url, headers=headers)
                        except Exception:
                            pass
                    return

                await asyncio.sleep(delay)
                poll_resp = await client.get(poll_url, headers=headers)
                if poll_resp.status_code != 200:
                    continue

                poll_data = poll_resp.json()
                pred_status = poll_data.get("status")

                if pred_status == "succeeded":
                    output = poll_data.get("output")
                    out_url = output[0] if isinstance(output, list) and output else str(output)
                    if out_url and out_url != "None":
                        job.status = "succeeded"
                        job.progress = 100
                        job.result_image_url = out_url
                        job.updated_at = time.time()
                        return
                    else:
                        job.status = "failed"
                        job.error = "Inference succeeded but provider output image was empty."
                        job.error_code = "ERR_EMPTY_OUTPUT"
                        job.updated_at = time.time()
                        return
                elif pred_status == "failed":
                    job.status = "failed"
                    job.error = poll_data.get("error", "Generative AI diffusion inference failed.")
                    job.error_code = "ERR_DIFFUSION_FAILED"
                    job.updated_at = time.time()
                    return
                elif pred_status == "canceled":
                    job.status = "cancelled"
                    job.error = "Job cancelled by provider."
                    job.updated_at = time.time()
                    return
                else:
                    # Starting or processing
                    job.progress = min(job.progress + 10, 90)
                    job.updated_at = time.time()
                    delay = min(delay * 1.25, 5.0)

            # Timeout exceeded
            job.status = "failed"
            job.error = f"Cloud AI try-on inference timed out after {int(INFERENCE_TIMEOUT_SECONDS)} seconds."
            job.error_code = "ERR_TIMEOUT"
            job.updated_at = time.time()

    except httpx.TimeoutException:
        job.status = "failed"
        job.error = "Connection to cloud AI provider timed out."
        job.error_code = "ERR_CONNECT_TIMEOUT"
        job.updated_at = time.time()
    except Exception as exc:
        logger.error("Cloud VTON worker error for job %s: %s", job_id, exc)
        job.status = "failed"
        job.error = f"Unexpected inference exception: {str(exc)}"
        job.error_code = "ERR_INTERNAL_EXCEPTION"
        job.updated_at = time.time()


def get_job_status(job_id: str) -> Optional[TryOnJobResponse]:
    """Retrieves current job status."""
    return JOBS.get(job_id)


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

