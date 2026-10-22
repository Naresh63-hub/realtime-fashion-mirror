"""
Data models for the AI Fashion Mirror backend API.
Validated with Pydantic v2.
"""

from typing import List, Optional
from pydantic import BaseModel, Field, HttpUrl


class UrlExtractRequest(BaseModel):
    url: str = Field(..., description="Shopping product URL to extract metadata and garment imagery from")


class UrlExtractResponse(BaseModel):
    title: str = Field(..., description="Extracted product title")
    brand: Optional[str] = Field(None, description="Retailer or garment brand name")
    price: Optional[float] = Field(None, description="Extracted price if available")
    currency: Optional[str] = Field("INR", description="Price currency code")
    images: List[str] = Field(default_factory=list, description="Extracted product image candidates")
    selected_image_url: str = Field(..., description="Primary or highest resolution product image")
    original_url: str = Field(..., description="Preserved original shopping URL")
    category: str = Field(default="t-shirt", description="Inferred or extracted garment category")
    retailer: str = Field(default="generic", description="Retailer domain identifier")
    description: Optional[str] = Field(None, description="Brief product description")
    sizes: Optional[List[str]] = Field(default_factory=lambda: ["S", "M", "L", "XL"])


class TryOnConfigResponse(BaseModel):
    configured: bool = Field(..., description="True if a valid external AI diffusion provider is configured")
    provider: str = Field(..., description="Provider name: replicate, custom_http, or none")
    model_name: str = Field(..., description="Active generative model name (e.g. IDM-VTON)")
    model_version: Optional[str] = Field(None, description="Model checkpoint or version identifier")
    supported_categories: List[str] = Field(
        default_factory=lambda: ["upper_body", "lower_body", "dresses", "t-shirt", "shirt", "jacket", "kurti"]
    )
    guidance: str = Field(default="", description="Information on required environment keys and usage restrictions")


class TryOnJobCreateRequest(BaseModel):
    person_image: str = Field(..., description="Data URL or accessible URL of user photo")
    garment_image: str = Field(..., description="Data URL or accessible URL of clothing item")
    garment_name: str = Field(default="Garment", description="Garment product name")
    category: str = Field(default="t-shirt", description="Garment category")
    model_name: Optional[str] = Field("client-high-res", description="Inference engine or model adapter name")
    garment_description: Optional[str] = Field(None, description="Optional text description for diffusion conditioning")
    denoise_steps: Optional[int] = Field(30, description="Number of diffusion denoising steps (10-40)")


class TryOnJobResponse(BaseModel):
    job_id: str
    status: str = Field(..., description="Job status: queued | processing | succeeded | failed | cancelled")
    progress: int = Field(0, description="Progress percentage 0-100")
    created_at: float
    updated_at: float
    person_image_url: str
    garment_image_url: str
    garment_name: str
    category: str
    result_image_url: Optional[str] = None
    error: Optional[str] = None
    error_code: Optional[str] = None
    model_name: str
    provider: str = Field(default="local-canvas", description="Inference provider used")
    can_fallback_to_canvas: bool = Field(default=True, description="Whether client canvas fallback is recommended")


class HealthResponse(BaseModel):
    status: str
    version: str
    service: str
    features: List[str]


class LiveSessionCreateResponse(BaseModel):
    session_id: str
    status: str
    created_at: float
    max_inactivity_seconds: int = 600
    guidance: str = ""


class LiveFrameSubmitRequest(BaseModel):
    frame_image: str = Field(..., description="Captured live video frame as Data URL")
    garment_image: str = Field(..., description="Garment image Data URL or asset path")
    garment_name: str = Field(default="Garment", description="Garment product name")
    category: str = Field(default="t-shirt", description="Garment category")


class LiveFrameSubmitResponse(BaseModel):
    session_id: str
    status: str = Field(..., description="processed | busy | unconfigured | failed")
    dropped: bool = Field(default=False, description="True if frame was discarded due to in-flight processing")
    message: str = ""
    result_image_url: Optional[str] = None
    can_fallback_to_canvas: bool = True


class LiveSessionStatusResponse(BaseModel):
    session_id: str
    status: str = Field(..., description="active | closed | not_found")
    is_processing: bool = False
    active_job_id: Optional[str] = None
    job_progress: int = 0
    latest_result_url: Optional[str] = None
    frames_received: int = 0
    frames_dropped: int = 0
    ai_configured: bool = False

