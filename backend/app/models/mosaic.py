from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class OutputFormat(str, Enum):
    JPEG = "JPEG"
    PNG = "PNG"


class OutputResolution(float, Enum):
    one = 1.0
    two = 2.0
    three = 3.0
    four = 4.0


class MosaicSettings(BaseModel):
    cell_size: int = Field(default=20, ge=4, le=64)
    blend: float = Field(default=0.40, ge=0.0, le=1.0)
    output_resolution: float = Field(default=2.0, ge=1.0, le=4.0)
    output_format: OutputFormat = OutputFormat.JPEG
    jpeg_quality: int = Field(default=92, ge=1, le=100)


class JobStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: int = 0
    message: str = ""
    output_url: Optional[str] = None
    output_format: Optional[str] = None
    error: Optional[str] = None


class GenerateRequest(BaseModel):
    settings: MosaicSettings = MosaicSettings()
