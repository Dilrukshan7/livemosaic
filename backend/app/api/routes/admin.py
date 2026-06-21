"""
Admin API — localhost-only, protected by secret key.
Never expose this router to the public internet.
"""
from fastapi import APIRouter, HTTPException, Header, Request, Depends
from ...core.config import settings
from ...core.database import get_supabase
from ...models.plan import PlanUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(x_admin_key: str = Header(...)):
    if x_admin_key != settings.admin_secret_key:
        raise HTTPException(status_code=403, detail="Invalid admin key.")


def require_localhost(request: Request):
    host = request.client.host if request.client else ""
    if host not in ("127.0.0.1", "::1", "localhost"):
        raise HTTPException(status_code=403, detail="Admin API is localhost-only.")


# ── Plans ──────────────────────────────────────────────────────────────────────

@router.get("/plans", dependencies=[Depends(require_localhost), Depends(require_admin)])
async def admin_list_plans():
    sb = get_supabase()
    return sb.table("plans").select("*").execute().data


@router.patch("/plans/{plan_name}", dependencies=[Depends(require_localhost), Depends(require_admin)])
async def admin_update_plan(plan_name: str, update: PlanUpdate):
    sb = get_supabase()
    payload = {k: v for k, v in update.model_dump().items() if v is not None}
    if "features" in payload and payload["features"]:
        payload["features"] = payload["features"]
    result = sb.table("plans").update(payload).eq("name", plan_name).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Plan not found.")
    return result.data[0]


# ── Statistics ─────────────────────────────────────────────────────────────────

@router.get("/stats", dependencies=[Depends(require_localhost), Depends(require_admin)])
async def admin_stats():
    sb = get_supabase()
    from datetime import date
    period_start = date.today().replace(day=1).isoformat()

    total_users_res = sb.table("subscriptions").select("user_id", count="exact").execute()
    mosaics_month_res = (
        sb.table("usage")
        .select("id", count="exact")
        .gte("created_at", period_start)
        .execute()
    )
    active_subs_res = (
        sb.table("subscriptions")
        .select("id", count="exact")
        .eq("status", "active")
        .execute()
    )
    return {
        "total_subscribed_users": total_users_res.count,
        "mosaics_this_month": mosaics_month_res.count,
        "active_subscriptions": active_subs_res.count,
    }


# ── User overrides ─────────────────────────────────────────────────────────────

@router.post("/users/{user_id}/plan", dependencies=[Depends(require_localhost), Depends(require_admin)])
async def admin_override_user_plan(user_id: str, plan_name: str, reason: str = ""):
    sb = get_supabase()
    plan = sb.table("plans").select("id").eq("name", plan_name).single().execute()
    if not plan.data:
        raise HTTPException(status_code=404, detail="Plan not found.")
    sb.table("subscriptions").upsert({
        "user_id": user_id,
        "plan_id": plan.data["id"],
        "status": "active",
        "stripe_subscription_id": None,
        "stripe_customer_id": None,
    }).execute()
    return {"user_id": user_id, "plan": plan_name, "reason": reason}


@router.get("/users/{user_id}", dependencies=[Depends(require_localhost), Depends(require_admin)])
async def admin_get_user(user_id: str):
    sb = get_supabase()
    sub = (
        sb.table("subscriptions")
        .select("*, plans(name, display_name)")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    usage = sb.table("usage").select("id", count="exact").eq("user_id", user_id).execute()
    return {
        "user_id": user_id,
        "subscription": sub.data[0] if sub.data else None,
        "total_mosaics": usage.count,
    }


# ── Stripe events ──────────────────────────────────────────────────────────────

@router.get("/stripe-events", dependencies=[Depends(require_localhost), Depends(require_admin)])
async def admin_stripe_events(limit: int = 50):
    sb = get_supabase()
    return sb.table("stripe_events").select("*").order("created_at", desc=True).limit(limit).execute().data
