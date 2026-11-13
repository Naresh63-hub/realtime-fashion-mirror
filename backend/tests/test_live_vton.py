"""
Pytest suite for Live AI Virtual Try-On Session Management and Frame Dispatcher.

Verifies:
1. Session lifecycle: creation, status polling, termination.
2. Honest reporting: unconfigured returns status="unconfigured" and can_fallback_to_canvas=True.
3. In-flight concurrency guard: obsolete incoming frames are dropped (dropped=True, status="busy").
4. Completion workflow: synthesized diffusion result URL is updated and accessible.
5. Error handling: invalid session ID handling.
"""

import time
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.vton import set_test_inference_hook, JOBS
from backend.services.live_vton import LIVE_SESSIONS

client = TestClient(app)

VALID_B64_IMAGE = (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def setup_function():
    LIVE_SESSIONS.clear()
    set_test_inference_hook(None)


def teardown_function():
    LIVE_SESSIONS.clear()
    set_test_inference_hook(None)


def test_live_session_lifecycle():
    # 1. Create session
    resp = client.post("/api/live/sessions")
    assert resp.status_code == 201
    data = resp.json()
    assert "session_id" in data
    assert data["status"] == "active"
    session_id = data["session_id"]

    # 2. Get status
    resp = client.get(f"/api/live/sessions/{session_id}")
    assert resp.status_code == 200
    status_data = resp.json()
    assert status_data["session_id"] == session_id
    assert status_data["status"] == "active"
    assert status_data["is_processing"] is False

    # 3. Close session
    resp = client.delete(f"/api/live/sessions/{session_id}")
    assert resp.status_code == 200
    assert resp.json()["closed"] is True

    # 4. Status after close -> 404
    resp = client.get(f"/api/live/sessions/{session_id}")
    assert resp.status_code == 404


def test_live_session_unconfigured(monkeypatch):
    monkeypatch.delenv("VTON_API_KEY", raising=False)
    monkeypatch.delenv("VTON_API_URL", raising=False)
    set_test_inference_hook(None)

    resp = client.post("/api/live/sessions")
    session_id = resp.json()["session_id"]

    resp = client.post(
        f"/api/live/sessions/{session_id}/frame",
        json={
            "frame_image": VALID_B64_IMAGE,
            "garment_image": VALID_B64_IMAGE,
            "garment_name": "Summer Top",
            "category": "top",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "unconfigured"
    assert data["can_fallback_to_canvas"] is True
    assert data["result_image_url"] is None


def test_live_session_concurrency_guard_and_drop(monkeypatch):
    monkeypatch.setenv("VTON_API_KEY", "test_key")

    # Provide an in-flight mock hook
    set_test_inference_hook(lambda req: {"status": "processing", "progress": 40})

    resp = client.post("/api/live/sessions")
    session_id = resp.json()["session_id"]

    # Submit first frame -> triggers background inference
    resp1 = client.post(
        f"/api/live/sessions/{session_id}/frame",
        json={
            "frame_image": VALID_B64_IMAGE,
            "garment_image": VALID_B64_IMAGE,
            "garment_name": "Tee",
            "category": "t-shirt",
        },
    )
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "busy"
    assert resp1.json()["dropped"] is False

    # Submit second frame immediately -> MUST be dropped to prevent queue backlog
    resp2 = client.post(
        f"/api/live/sessions/{session_id}/frame",
        json={
            "frame_image": VALID_B64_IMAGE,
            "garment_image": VALID_B64_IMAGE,
            "garment_name": "Tee",
            "category": "t-shirt",
        },
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["status"] == "busy"
    assert data2["dropped"] is True
    assert "In-flight generative inference" in data2["message"]

    # Check session status reflects dropped frame
    status_resp = client.get(f"/api/live/sessions/{session_id}")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["frames_dropped"] >= 1
    assert status_data["frames_received"] >= 2


def test_live_session_completion(monkeypatch):
    monkeypatch.setenv("VTON_API_KEY", "test_key")

    # Fast synchronous mock
    set_test_inference_hook(
        lambda req: {
            "status": "succeeded",
            "result_image_url": "https://cdn.example.com/synth_output.png",
        }
    )

    resp = client.post("/api/live/sessions")
    session_id = resp.json()["session_id"]

    resp = client.post(
        f"/api/live/sessions/{session_id}/frame",
        json={
            "frame_image": VALID_B64_IMAGE,
            "garment_image": VALID_B64_IMAGE,
            "garment_name": "Blazer",
            "category": "jacket",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "processed"
    assert data["result_image_url"] == "https://cdn.example.com/synth_output.png"


def test_live_session_invalid_session_id():
    resp = client.post(
        "/api/live/sessions/nonexistent_session_999/frame",
        json={
            "frame_image": VALID_B64_IMAGE,
            "garment_image": VALID_B64_IMAGE,
            "garment_name": "Shirt",
            "category": "shirt",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "failed"
    assert "not found" in data["message"].lower()


def test_live_session_auth_failure(monkeypatch):
    """Simulates provider authentication failure (e.g. invalid VTON_API_KEY)."""
    monkeypatch.setenv("VTON_API_KEY", "invalid_key")
    set_test_inference_hook(
        lambda req: {
            "status": "failed",
            "error": "Authentication failed: Invalid VTON_API_KEY.",
            "error_code": "ERR_AUTH_FAILED",
        }
    )

    resp = client.post("/api/live/sessions")
    session_id = resp.json()["session_id"]

    resp = client.post(
        f"/api/live/sessions/{session_id}/frame",
        json={
            "frame_image": VALID_B64_IMAGE,
            "garment_image": VALID_B64_IMAGE,
            "garment_name": "T-Shirt",
            "category": "t-shirt",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "failed"
    assert "Authentication failed" in data["message"]

    status_resp = client.get(f"/api/live/sessions/{session_id}")
    assert status_resp.status_code == 200
    assert status_resp.json()["last_error"] == "Authentication failed: Invalid VTON_API_KEY."


def test_live_session_timeout(monkeypatch):
    """Simulates provider timeout during frame inference."""
    monkeypatch.setenv("VTON_API_KEY", "test_key")
    set_test_inference_hook(
        lambda req: {
            "status": "failed",
            "error": "Cloud AI try-on inference timed out after 90 seconds.",
            "error_code": "ERR_TIMEOUT",
        }
    )

    resp = client.post("/api/live/sessions")
    session_id = resp.json()["session_id"]

    resp = client.post(
        f"/api/live/sessions/{session_id}/frame",
        json={
            "frame_image": VALID_B64_IMAGE,
            "garment_image": VALID_B64_IMAGE,
            "garment_name": "T-Shirt",
            "category": "t-shirt",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "failed"
    assert "timed out" in data["message"].lower()


def test_live_session_failed_prediction(monkeypatch):
    """Simulates generative diffusion model inference failure."""
    monkeypatch.setenv("VTON_API_KEY", "test_key")
    set_test_inference_hook(
        lambda req: {
            "status": "failed",
            "error": "Generative AI diffusion inference failed: CUDA out of memory",
            "error_code": "ERR_DIFFUSION_FAILED",
        }
    )

    resp = client.post("/api/live/sessions")
    session_id = resp.json()["session_id"]

    resp = client.post(
        f"/api/live/sessions/{session_id}/frame",
        json={
            "frame_image": VALID_B64_IMAGE,
            "garment_image": VALID_B64_IMAGE,
            "garment_name": "Kurti",
            "category": "kurti",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "failed"
    assert "CUDA out of memory" in data["message"]


def test_live_session_invalid_image_input(monkeypatch):
    """Rejects malformed frame payload."""
    monkeypatch.setenv("VTON_API_KEY", "test_key")

    resp = client.post("/api/live/sessions")
    session_id = resp.json()["session_id"]

    resp = client.post(
        f"/api/live/sessions/{session_id}/frame",
        json={
            "frame_image": "not_an_image",
            "garment_image": VALID_B64_IMAGE,
            "garment_name": "Shirt",
            "category": "shirt",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "failed"
    assert "invalid" in data["message"].lower() or "unsupported" in data["message"].lower()


def test_live_session_cancel_inference(monkeypatch):
    """Cancels in-flight frame inference without closing the live session."""
    monkeypatch.setenv("VTON_API_KEY", "test_key")
    set_test_inference_hook(lambda req: {"status": "processing", "progress": 30})

    resp = client.post("/api/live/sessions")
    session_id = resp.json()["session_id"]

    # Submit frame -> busy
    client.post(
        f"/api/live/sessions/{session_id}/frame",
        json={
            "frame_image": VALID_B64_IMAGE,
            "garment_image": VALID_B64_IMAGE,
            "garment_name": "Shirt",
            "category": "shirt",
        },
    )

    # Cancel in-flight frame
    cancel_resp = client.post(f"/api/live/sessions/{session_id}/cancel")
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["cancelled"] is True

    # Session is still active and can accept new frame
    status_resp = client.get(f"/api/live/sessions/{session_id}")
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "active"
    assert status_resp.json()["is_processing"] is False


def test_live_session_inactivity_cleanup(monkeypatch):
    """Verifies that inactive live sessions are pruned after timeout."""
    from backend.services.live_vton import cleanup_expired_sessions, LIVE_SESSIONS

    resp = client.post("/api/live/sessions")
    session_id = resp.json()["session_id"]
    assert session_id in LIVE_SESSIONS

    # Fast-forward last activity past 600s
    LIVE_SESSIONS[session_id].last_activity = time.time() - 700.0

    cleanup_expired_sessions()
    assert session_id not in LIVE_SESSIONS

