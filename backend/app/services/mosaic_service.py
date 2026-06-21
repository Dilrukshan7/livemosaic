"""
Manages mosaic job lifecycle: create, run in thread, update status.
"""
import asyncio
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

from ..core.database import get_supabase
from ..engine.mosaic import make_mosaic, extract_tiles_from_zip
from ..models.mosaic import MosaicSettings, JobStatus

_executor = ThreadPoolExecutor(max_workers=2)

# In-memory progress store (keyed by job_id)
_progress: dict[str, dict] = {}


def get_job_progress(job_id: str) -> dict:
    return _progress.get(job_id, {"status": "pending", "progress": 0, "message": ""})


def _progress_cb(job_id: str):
    def cb(step: str, pct: int):
        _progress[job_id] = {"status": "processing", "progress": pct, "message": step}
    return cb


def _run_mosaic_sync(
    job_id: str,
    main_bytes: bytes,
    zip_bytes: bytes,
    settings: MosaicSettings,
):
    """Runs in a thread pool — no async here."""
    sb = get_supabase()
    try:
        _progress[job_id] = {"status": "processing", "progress": 1, "message": "Extracting tiles"}

        tile_images, tile_count = extract_tiles_from_zip(zip_bytes)
        if not tile_images:
            raise ValueError("No valid images found in the ZIP file.")

        _progress[job_id] = {"status": "processing", "progress": 5, "message": "Starting mosaic generation"}

        output_bytes = make_mosaic(
            main_bytes=main_bytes,
            tile_images=tile_images,
            cell_size=settings.cell_size,
            blend=settings.blend,
            output_resolution=settings.output_resolution,
            output_format=settings.output_format.value,
            jpeg_quality=settings.jpeg_quality,
            progress=_progress_cb(job_id),
        )

        # Upload to Supabase Storage
        ext = "png" if settings.output_format.value == "PNG" else "jpg"
        storage_path = f"outputs/{job_id}/result.{ext}"
        content_type = "image/png" if ext == "png" else "image/jpeg"

        sb_client = get_supabase()
        sb_client.storage.from_("mosaicforge").upload(
            storage_path,
            output_bytes,
            {"content-type": content_type},
        )

        expires_at = (datetime.utcnow() + timedelta(minutes=10)).isoformat()

        sb.table("mosaic_jobs").update({
            "status": JobStatus.completed.value,
            "output_path": storage_path,
            "output_format": settings.output_format.value,
            "tile_count": tile_count,
            "expires_at": expires_at,
            "completed_at": datetime.utcnow().isoformat(),
        }).eq("id", job_id).execute()

        _progress[job_id] = {
            "status": "completed",
            "progress": 100,
            "message": "Done",
            "storage_path": storage_path,
            "output_format": settings.output_format.value,
        }

    except Exception as exc:
        sb.table("mosaic_jobs").update({
            "status": JobStatus.failed.value,
            "error_message": str(exc),
        }).eq("id", job_id).execute()
        _progress[job_id] = {
            "status": "failed",
            "progress": 0,
            "message": str(exc),
        }
        raise


async def create_and_run_job(
    user_id: str,
    main_bytes: bytes,
    zip_bytes: bytes,
    settings: MosaicSettings,
) -> str:
    job_id = str(uuid.uuid4())
    sb = get_supabase()
    sb.table("mosaic_jobs").insert({
        "id": job_id,
        "user_id": user_id,
        "status": JobStatus.pending.value,
        "settings": settings.model_dump(),
    }).execute()

    _progress[job_id] = {"status": "pending", "progress": 0, "message": "Queued"}

    loop = asyncio.get_event_loop()
    loop.run_in_executor(
        _executor,
        _run_mosaic_sync,
        job_id,
        main_bytes,
        zip_bytes,
        settings,
    )

    return job_id
