from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID


class PlanFeatures(BaseModel):
    png_download: bool = True
    commercial_use: bool = False
    priority_queue: bool = False
    max_tiles_in_zip: Optional[int] = None  # None = unlimited


class Plan(BaseModel):
    id: Optional[UUID] = None
    name: str
    display_name: str
    stripe_price_id: Optional[str] = None
    price_usd: float = 0.0
    monthly_mosaics: Optional[int] = None  # None = unlimited
    min_cell_size: int = 8
    max_cell_size: int = 64
    max_output_resolution: float = 2.0
    allowed_formats: List[str] = ["JPEG"]
    features: PlanFeatures = PlanFeatures()
    is_active: bool = True


class PlanUpdate(BaseModel):
    display_name: Optional[str] = None
    price_usd: Optional[float] = None
    monthly_mosaics: Optional[int] = None
    min_cell_size: Optional[int] = None
    max_cell_size: Optional[int] = None
    max_output_resolution: Optional[float] = None
    allowed_formats: Optional[List[str]] = None
    features: Optional[PlanFeatures] = None
    is_active: Optional[bool] = None
    stripe_price_id: Optional[str] = None
