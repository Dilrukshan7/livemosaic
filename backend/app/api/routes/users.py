from fastapi import APIRouter, Depends
from ..deps import current_user_id
from ...services.plan_service import get_user_plan, get_monthly_usage
from ...core.database import get_supabase

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def me(user_id: str = Depends(current_user_id)):
    sb = get_supabase()
    plan = get_user_plan(user_id)
    used = get_monthly_usage(user_id)
    user_row = sb.auth.admin.get_user_by_id(user_id)
    email = user_row.user.email if user_row and user_row.user else ""
    return {
        "id": user_id,
        "email": email,
        "plan_name": plan.get("name", "free"),
        "plan_display_name": plan.get("display_name", "Free"),
        "mosaics_used_this_month": used,
        "monthly_limit": plan.get("monthly_mosaics"),
        "features": plan.get("features", {}),
        "allowed_formats": plan.get("allowed_formats", ["JPEG"]),
        "max_output_resolution": plan.get("max_output_resolution", 2.0),
        "min_cell_size": plan.get("min_cell_size", 8),
    }
