"""
Live Virtual Try-On Session Management and Frame Dispatcher.

Handles:
1. Session lifecycle: creation, activity tracking, automatic expiry cleanup.
2. In-flight concurrency guard: drops obsolete/rapid incoming frames to prevent queue backlog.
3. Transparent status reporting: reports unconfigured state honestly when credentials are missing.
4. Clean cancellation and memory reclamation when user navigates away.
"""

import time
import uuid
import logging
from typing import Dict, Optional

from backend.models import (
    LiveFrameSubmitRequest,
    LiveFrameSubmitResponse,
    LiveSessionCreateResponse,
    LiveSessionStatusResponse,
    TryOnJobCreateRequest,
)
from backend.services.vton import (
    create_tryon_job,
    get_job_status,
    cancel_job,
    is_vton_configured,
)

logger = logging.getLogger(__name__)

SESSION_TIMEOUT_SECONDS = 600.0  # 10 minutes inactivity


class LiveSession:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.created_at = time.time()
        self.last_activity = time.time()
        self.is_processing = False
        self.active_job_id: Optional[str] = None
        self.latest_result_url: Optional[str] = None
        self.frames_received = 0
        self.frames_dropped = 0

    def touch(self):
        self.last_activity = time.time()

    def is_expired(self) -> bool:
        return (time.time() - self.last_activity) > SESSION_TIMEOUT_SECONDS


LIVE_SESSIONS: Dict[str, LiveSession] = {}


def cleanup_expired_sessions() -> None:
    """Removes sessions inactive for longer than SESSION_TIMEOUT_SECONDS."""
    now = time.time()
    expired_ids = [
        sid for sid, s in LIVE_SESSIONS.items() if (now - s.last_activity) > SESSION_TIMEOUT_SECONDS
    ]
    for sid in expired_ids:
        s = LIVE_SESSIONS.pop(sid, None)
        if s and s.active_job_id:
            cancel_job(s.active_job_id)
        logger.debug("Cleaned up expired live session %s", sid)


def create_live_session() -> LiveSessionCreateResponse:
    """Initializes a new live virtual try-on sampling session."""
    cleanup_expired_sessions()
    session_id = f"live_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    session = LiveSession(session_id)
    LIVE_SESSIONS[session_id] = session

    configured = is_vton_configured()
    guidance = (
        "AI Live Preview session active. Frames will be sampled and enhanced via generative diffusion."
        if configured
        else "Cloud AI is unconfigured. Real-time Canvas 2D tracker operates locally as fallback."
    )

    return LiveSessionCreateResponse(
        session_id=session_id,
        status="active",
        created_at=session.created_at,
        max_inactivity_seconds=int(SESSION_TIMEOUT_SECONDS),
        guidance=guidance,
    )


def get_live_session_status(session_id: str) -> Optional[LiveSessionStatusResponse]:
    """Retrieves live session status, active job progress, and latest synthesized frame."""
    session = LIVE_SESSIONS.get(session_id)
    if not session:
        return None

    session.touch()
    progress = 0
    if session.active_job_id:
        job = get_job_status(session.active_job_id)
        if job:
            progress = job.progress
            if job.status == "succeeded" and job.result_image_url:
                session.latest_result_url = job.result_image_url
                session.is_processing = False
                session.active_job_id = None
            elif job.status in ("failed", "cancelled"):
                session.is_processing = False
                session.active_job_id = None

    return LiveSessionStatusResponse(
        session_id=session.session_id,
        status="active",
        is_processing=session.is_processing,
        active_job_id=session.active_job_id,
        job_progress=progress,
        latest_result_url=session.latest_result_url,
        frames_received=session.frames_received,
        frames_dropped=session.frames_dropped,
        ai_configured=is_vton_configured(),
    )


def close_live_session(session_id: str) -> bool:
    """Terminates session and cancels any in-flight inference."""
    session = LIVE_SESSIONS.pop(session_id, None)
    if not session:
        return False
    if session.active_job_id:
        cancel_job(session.active_job_id)
    return True


def submit_live_frame(session_id: str, req: LiveFrameSubmitRequest) -> LiveFrameSubmitResponse:
    """
    Submits a sampled live video frame for AI enhancement.
    Applies concurrency protection: if an inference is currently running for this session,
    the incoming frame is immediately dropped without queue backlog.
    """
    session = LIVE_SESSIONS.get(session_id)
    if not session:
        return LiveFrameSubmitResponse(
            session_id=session_id,
            status="failed",
            dropped=False,
            message="Session expired or not found. Please re-initialize.",
            can_fallback_to_canvas=True,
        )

    session.touch()
    session.frames_received += 1

    # Check if a previously dispatched job completed
    if session.active_job_id:
        job = get_job_status(session.active_job_id)
        if job:
            if job.status == "succeeded" and job.result_image_url:
                session.latest_result_url = job.result_image_url
                session.is_processing = False
                session.active_job_id = None
            elif job.status in ("failed", "cancelled"):
                session.is_processing = False
                session.active_job_id = None

    # In-flight concurrency guard: drop frame if busy
    if session.is_processing:
        session.frames_dropped += 1
        return LiveFrameSubmitResponse(
            session_id=session_id,
            status="busy",
            dropped=True,
            message="In-flight generative inference in progress. Dropped frame to preserve live camera frame rate.",
            result_image_url=session.latest_result_url,
            can_fallback_to_canvas=True,
        )

    # If Cloud AI is not configured, report honestly
    if not is_vton_configured():
        return LiveFrameSubmitResponse(
            session_id=session_id,
            status="unconfigured",
            dropped=False,
            message="Cloud Generative AI is unconfigured. Live camera is powered by local Canvas 2D tracking.",
            result_image_url=None,
            can_fallback_to_canvas=True,
        )

    # Dispatch frame to VTON adapter
    try:
        session.is_processing = True
        job = create_tryon_job(
            TryOnJobCreateRequest(
                person_image=req.frame_image,
                garment_image=req.garment_image,
                garment_name=req.garment_name,
                category=req.category,
                model_name="cloud-genai",
                denoise_steps=25,
            )
        )
        session.active_job_id = job.job_id

        # If job completed synchronously (e.g. mock test hook)
        if job.status == "succeeded" and job.result_image_url:
            session.latest_result_url = job.result_image_url
            session.is_processing = False
            session.active_job_id = None
            return LiveFrameSubmitResponse(
                session_id=session_id,
                status="processed",
                dropped=False,
                message="AI try-on frame synthesized.",
                result_image_url=job.result_image_url,
                can_fallback_to_canvas=True,
            )

        return LiveFrameSubmitResponse(
            session_id=session_id,
            status="busy",
            dropped=False,
            message="Frame submitted to diffusion pipeline.",
            result_image_url=session.latest_result_url,
            can_fallback_to_canvas=True,
        )

    except Exception as exc:
        session.is_processing = False
        session.active_job_id = None
        logger.error("Failed to submit live frame for session %s: %s", session_id, exc)
        return LiveFrameSubmitResponse(
            session_id=session_id,
            status="failed",
            dropped=False,
            message=f"Live AI inference error: {str(exc)}",
            result_image_url=session.latest_result_url,
            can_fallback_to_canvas=True,
        )
