"""
Plan enforcement — all limits checked server-side.
"""
from fastapi import HTTPException, status
from ..core.database import get_supabase
from ..models.mosaic import MosaicSettings


def get_user_plan(user_id: str) -> dict:
    """Return the active plan row for this user (joined from subscriptions + plans)."""
    sb = get_supabase()
    result = (
        sb.table("subscriptions")
        .select("*, plans(*)")
        .eq("user_id", user_id)
        .eq("status", "active")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]["plans"]
    # Default: free plan
    free = sb.table("plans").select("*").eq("name", "free").single().execute()
    return free.data


def get_monthly_usage(user_id: str) -> int:
    """Count mosaics generated in the current calendar month."""
    sb = get_supabase()
    from datetime import date
    period_start = date.today().replace(day=1).isoformat()
    result = (
        sb.table("usage")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .gte("created_at", period_start)
        .execute()
    )
    return result.count or 0


def enforce_plan_limits(user_id: str, settings: MosaicSettings) -> dict:
    """
    Raise HTTP 403 if the requested settings exceed the user's plan.
    Returns the plan dict on success.
    """
    plan = get_user_plan(user_id)

    # Monthly quota
    if plan.get("monthly_mosaics") is not None:
        used = get_monthly_usage(user_id)
        if used >= plan["monthly_mosaics"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Monthly mosaic limit reached ({plan['monthly_mosaics']}). Upgrade to continue.",
            )

    # Cell size range
    if settings.cell_size < plan.get("min_cell_size", 4):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cell size {settings.cell_size}px is below your plan minimum ({plan['min_cell_size']}px).",
        )
    if settings.cell_size > plan.get("max_cell_size", 64):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cell size {settings.cell_size}px exceeds your plan maximum ({plan['max_cell_size']}px).",
        )

    # Output resolution
    if settings.output_resolution > plan.get("max_output_resolution", 2.0):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Output resolution {settings.output_resolution}x exceeds your plan maximum.",
        )

    # Format restrictions
    allowed = plan.get("allowed_formats", ["JPEG"])
    if settings.output_format.upper() not in [f.upper() for f in allowed]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"{settings.output_format} output is not available on your plan. Upgrade to unlock PNG.",
        )

    return plan


def record_usage(user_id: str, job_id: str) -> None:
    sb = get_supabase()
    sb.table("usage").insert({"user_id": user_id, "job_id": job_id}).execute()
