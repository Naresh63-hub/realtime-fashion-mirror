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


class TryOnJobCreateRequest(BaseModel):
    person_image: str = Field(..., description="Data URL or accessible URL of user photo")
    garment_image: str = Field(..., description="Data URL or accessible URL of clothing item")
    garment_name: str = Field(default="Garment", description="Garment product name")
    category: str = Field(default="t-shirt", description="Garment category")
    model_name: Optional[str] = Field("client-high-res", description="Inference engine or model adapter name")


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
    model_name: str


class HealthResponse(BaseModel):
    status: str
    version: str
    service: str
    features: List[str]
