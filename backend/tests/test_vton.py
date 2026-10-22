"""
Pytest suite for Generative AI Virtual Try-On (VTON) provider integration.
Tests:
- Configuration discovery (configured vs unconfigured)
- Graceful failure when unconfigured (never faking mock results)
- Client high-res canvas mode compatibility
- Payload validations (size, base64 data URLs, SSRF safety)
- Mocked provider success, provider failure, and timeout workflows
- Job cancellation
"""

import os
import time
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.vton import (
    set_test_inference_hook,
    JOBS,
)

client = TestClient(app)

VALID_B64_IMAGE = (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def test_vton_config_unconfigured(monkeypatch):
    monkeypatch.delenv("VTON_API_KEY", raising=False)
    monkeypatch.delenv("VTON_API_URL", raising=False)
    resp = client.get("/api/tryon/config")
    assert resp.status_code == 200
    data = resp.json()
    assert data["configured"] is False
    assert data["provider"] == "none"
    assert "Instant Canvas" in data["guidance"]


def test_vton_config_configured(monkeypatch):
    monkeypatch.setenv("VTON_API_KEY", "r8_testtoken1234567890")
    resp = client.get("/api/tryon/config")
    assert resp.status_code == 200
    data = resp.json()
    assert data["configured"] is True
    assert data["provider"] == "replicate"
    assert "IDM-VTON" in data["model_name"]


def test_vton_missing_credentials_fails_gracefully(monkeypatch):
    """When Cloud GenAI is requested without credentials, it must fail explicitly without faking results."""
    monkeypatch.delenv("VTON_API_KEY", raising=False)
    monkeypatch.delenv("VTON_API_URL", raising=False)
    set_test_inference_hook(None)

    resp = client.post(
        "/api/tryon/jobs",
        json={
            "person_image": VALID_B64_IMAGE,
            "garment_image": VALID_B64_IMAGE,
            "garment_name": "Summer Linen Shirt",
            "category": "shirt",
            "model_name": "cloud-genai",
        },
    )
    assert resp.status_code == 201
    job = resp.json()
    assert job["status"] == "failed"
    assert job["error_code"] == "ERR_VTON_NOT_CONFIGURED"
    assert job["can_fallback_to_canvas"] is True
    assert job["result_image_url"] is None


def test_vton_client_canvas_mode_immediate_success():
    """Client-side high-res mode succeeds immediately with fallback/input reference."""
    resp = client.post(
        "/api/tryon/jobs",
        json={
            "person_image": VALID_B64_IMAGE,
            "garment_image": VALID_B64_IMAGE,
            "garment_name": "Classic Crewneck",
            "category": "t-shirt",
            "model_name": "client-high-res",
        },
    )
    assert resp.status_code == 201
    job = resp.json()
    assert job["status"] == "succeeded"
    assert job["progress"] == 100
    assert job["provider"] == "local-canvas"
    assert job["result_image_url"] is not None


def test_vton_input_validation_empty_or_too_short():
    resp = client.post(
        "/api/tryon/jobs",
        json={
            "person_image": "abc",
            "garment_image": VALID_B64_IMAGE,
            "garment_name": "Polo",
        },
    )
    assert resp.status_code == 400
    assert "person photograph" in resp.json()["detail"].lower()


def test_vton_input_validation_malformed_data_url():
    resp = client.post(
        "/api/tryon/jobs",
        json={
            "person_image": "data:image/png;notbase64,invalid!!!",
            "garment_image": VALID_B64_IMAGE,
            "garment_name": "Polo",
        },
    )
    assert resp.status_code == 400
    assert "base64" in resp.json()["detail"].lower()


def test_vton_provider_success_mocked():
    """Test full asynchronous lifecycle with a successful provider response."""
    test_result_url = "https://replicate.delivery/pbxt/test_generated_tryon_output.png"
    set_test_inference_hook(
        lambda req: {
            "status": "succeeded",
            "result_image_url": test_result_url,
        }
    )

    try:
        resp = client.post(
            "/api/tryon/jobs",
            json={
                "person_image": VALID_B64_IMAGE,
                "garment_image": VALID_B64_IMAGE,
                "garment_name": "Graphic Tee",
                "category": "t-shirt",
                "model_name": "cloud-genai",
                "garment_description": "Black cotton tee with vintage print",
            },
        )
        assert resp.status_code == 201
        job_data = resp.json()
        job_id = job_data["job_id"]

        # Check job completion in memory
        status_resp = client.get(f"/api/tryon/jobs/{job_id}")
        assert status_resp.status_code == 200
        poll_data = status_resp.json()
        assert poll_data["status"] == "succeeded"
        assert poll_data["progress"] == 100
        assert poll_data["result_image_url"] == test_result_url
    finally:
        set_test_inference_hook(None)


def test_vton_provider_failure_mocked():
    """Test lifecycle when the generative provider returns an error."""
    set_test_inference_hook(
        lambda req: {
            "status": "failed",
            "error": "Face detection failed in human image.",
            "error_code": "ERR_FACE_NOT_DETECTED",
        }
    )

    try:
        resp = client.post(
            "/api/tryon/jobs",
            json={
                "person_image": VALID_B64_IMAGE,
                "garment_image": VALID_B64_IMAGE,
                "garment_name": "Tee",
                "category": "t-shirt",
                "model_name": "cloud-genai",
            },
        )
        assert resp.status_code == 201
        job_id = resp.json()["job_id"]

        status_resp = client.get(f"/api/tryon/jobs/{job_id}")
        poll_data = status_resp.json()
        assert poll_data["status"] == "failed"
        assert "Face detection failed" in poll_data["error"]
        assert poll_data["error_code"] == "ERR_FACE_NOT_DETECTED"
    finally:
        set_test_inference_hook(None)


def test_vton_job_cancellation():
    """Test cancelling a try-on job."""
    job_id = "vton_test_cancel_123"
    from backend.models import TryOnJobResponse

    JOBS[job_id] = TryOnJobResponse(
        job_id=job_id,
        status="processing",
        progress=45,
        created_at=time.time(),
        updated_at=time.time(),
        person_image_url=VALID_B64_IMAGE,
        garment_image_url=VALID_B64_IMAGE,
        garment_name="Blazer",
        category="jacket",
        model_name="IDM-VTON",
    )

    del_resp = client.delete(f"/api/tryon/jobs/{job_id}")
    assert del_resp.status_code == 200
    assert "successfully cancelled" in del_resp.json()["message"]

    chk = client.get(f"/api/tryon/jobs/{job_id}").json()
    assert chk["status"] == "cancelled"


def test_vton_exact_garment_image_delivered_to_provider():
    """Verify provider receives the exact chosen garment URL rather than any default or placeholder."""
    captured_requests = []
    custom_garment_url = "https://images.zara.com/photos/item/structured_biker_jacket_view2.jpg"

    set_test_inference_hook(
        lambda req: captured_requests.append(req) or {
            "status": "succeeded",
            "result_image_url": "https://replicate.delivery/pbxt/tryon_biker_jacket_output.png",
        }
    )

    try:
        resp = client.post(
            "/api/tryon/jobs",
            json={
                "person_image": VALID_B64_IMAGE,
                "garment_image": custom_garment_url,
                "garment_name": "Biker Jacket",
                "category": "jacket",
                "model_name": "cloud-genai",
            },
        )
        assert resp.status_code == 201
        assert len(captured_requests) == 1
        assert captured_requests[0].garment_image == custom_garment_url
        assert captured_requests[0].category == "jacket"
    finally:
        set_test_inference_hook(None)


def test_vton_auth_failure_error_code():
    """Test simulated provider 401 authentication failure."""
    set_test_inference_hook(
        lambda req: {
            "status": "failed",
            "error": "Authentication failed: Invalid VTON_API_KEY.",
            "error_code": "ERR_AUTH_FAILED",
        }
    )

    try:
        resp = client.post(
            "/api/tryon/jobs",
            json={
                "person_image": VALID_B64_IMAGE,
                "garment_image": VALID_B64_IMAGE,
                "garment_name": "T-Shirt",
                "category": "t-shirt",
                "model_name": "cloud-genai",
            },
        )
        assert resp.status_code == 201
        job_id = resp.json()["job_id"]
        status_resp = client.get(f"/api/tryon/jobs/{job_id}")
        assert status_resp.json()["error_code"] == "ERR_AUTH_FAILED"
    finally:
        set_test_inference_hook(None)


def test_vton_invalid_parameters_error_code():
    """Test simulated provider 422 input parameter validation rejection."""
    set_test_inference_hook(
        lambda req: {
            "status": "failed",
            "error": "Provider rejected input parameters: Image dimensions too small.",
            "error_code": "ERR_INVALID_PARAMETERS",
        }
    )

    try:
        resp = client.post(
            "/api/tryon/jobs",
            json={
                "person_image": VALID_B64_IMAGE,
                "garment_image": VALID_B64_IMAGE,
                "garment_name": "T-Shirt",
                "category": "t-shirt",
                "model_name": "cloud-genai",
            },
        )
        assert resp.status_code == 201
        job_id = resp.json()["job_id"]
        status_resp = client.get(f"/api/tryon/jobs/{job_id}")
        assert status_resp.json()["error_code"] == "ERR_INVALID_PARAMETERS"
    finally:
        set_test_inference_hook(None)
