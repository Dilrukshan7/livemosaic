from fastapi import APIRouter, Request, HTTPException, Depends
from ...services.stripe_service import handle_webhook, create_portal_session
from ..deps import current_user_id
from ...core.database import get_supabase

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    return handle_webhook(payload, sig)


@router.post("/portal")
async def billing_portal(user_id: str = Depends(current_user_id)):
    sb = get_supabase()
    sub = (
        sb.table("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user_id)
        .eq("status", "active")
        .single()
        .execute()
    )
    if not sub.data or not sub.data.get("stripe_customer_id"):
        raise HTTPException(status_code=404, detail="No active subscription found.")
    from ...core.config import settings
    return_url = f"{settings.frontend_url}/dashboard"
    url = create_portal_session(sub.data["stripe_customer_id"], return_url)
    return {"portal_url": url}
