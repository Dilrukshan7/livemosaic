import json
from fastapi import APIRouter, File, Form, UploadFile, Depends, HTTPException, Request
from ..deps import current_user_id
from ...models.mosaic import MosaicSettings, JobStatusResponse, JobStatus
from ...services.mosaic_service import create_and_run_job, get_job_progress
from ...services.plan_service import enforce_plan_limits, record_usage
from ...core.rate_limit import limiter
from ...core.database import get_supabase
from ...core.storage import get_signed_url

router = APIRouter(prefix="/mosaic", tags=["mosaic"])

MAX_MAIN_SIZE = 20 * 1024 * 1024    # 20 MB
MAX_ZIP_SIZE = 200 * 1024 * 1024    # 200 MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/generate")
@limiter.limit("5/minute")
async def generate(
    request: Request,
    main_image: UploadFile = File(...),
    tiles_zip: UploadFile = File(...),
    settings_json: str = Form(default="{}"),
    user_id: str = Depends(current_user_id),
):
    # Validate main image
    if main_image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Main image must be JPEG, PNG, or WebP.")
    main_bytes = await main_image.read()
    if len(main_bytes) > MAX_MAIN_SIZE:
        raise HTTPException(status_code=400, detail="Main image exceeds 20 MB limit.")

    # Validate ZIP
    if tiles_zip.content_type not in ("application/zip", "application/x-zip-compressed", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Tiles file must be a ZIP archive.")
    zip_bytes = await tiles_zip.read()
    if len(zip_bytes) > MAX_ZIP_SIZE:
        raise HTTPException(status_code=400, detail="Tiles ZIP exceeds 200 MB limit.")

    # Parse settings
    try:
        raw = json.loads(settings_json)
        settings = MosaicSettings(**raw)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid settings: {exc}")

    # Enforce plan limits (server-side)
    enforce_plan_limits(user_id, settings)

    job_id = await create_and_run_job(user_id, main_bytes, zip_bytes, settings)

    # Record usage immediately (before completion) so limits are enforced
    record_usage(user_id, job_id)

    return {"job_id": job_id}


@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def job_status(job_id: str, user_id: str = Depends(current_user_id)):
    progress = get_job_progress(job_id)
    status = progress.get("status", "pending")

    output_url = None
    if status == "completed":
        storage_path = progress.get("storage_path")
        if not storage_path:
            # Fallback: look up from DB
            sb = get_supabase()
            row = sb.table("mosaic_jobs").select("output_path, user_id").eq("id", job_id).single().execute()
            if row.data:
                if row.data["user_id"] != user_id:
                    raise HTTPException(status_code=403, detail="Not your job.")
                storage_path = row.data.get("output_path")
        if storage_path:
            output_url = get_signed_url(storage_path, expires_in=600)

    return JobStatusResponse(
        job_id=job_id,
        status=JobStatus(status),
        progress=progress.get("progress", 0),
        message=progress.get("message", ""),
        output_url=output_url,
        output_format=progress.get("output_format"),
        error=progress.get("message") if status == "failed" else None,
    )


@router.get("/history")
async def history(user_id: str = Depends(current_user_id)):
    sb = get_supabase()
    rows = (
        sb.table("mosaic_jobs")
        .select("id, status, settings, created_at, completed_at, output_path, output_format, tile_count, expires_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    jobs = []
    for row in rows.data or []:
        url = None
        if row.get("output_path") and row.get("status") == "completed":
            try:
                url = get_signed_url(row["output_path"], expires_in=600)
            except Exception:
                pass
        jobs.append({**row, "download_url": url})
    return jobs


@router.get("/tile-count")
async def tile_count_preview(user_id: str = Depends(current_user_id)):
    """Not used for processing — just returns a count after upload for the UI badge."""
    return {"message": "Upload ZIP to /generate; tile count is returned in /status after processing."}
