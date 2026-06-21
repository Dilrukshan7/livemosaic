import httpx
from fastapi import APIRouter, Depends, HTTPException
from ...core.database import get_supabase
from ..deps import current_user_id

router = APIRouter(prefix="/plans", tags=["plans"])

CURRENCY_CACHE: dict = {}


@router.get("/")
async def list_plans():
    sb = get_supabase()
    result = sb.table("plans").select("*").eq("is_active", True).order("price_usd").execute()
    return result.data or []


@router.get("/currency-rates")
async def currency_rates(base: str = "USD"):
    """Fetch live rates from frankfurter.app (free, no key required)."""
    cache_key = base.upper()
    if cache_key in CURRENCY_CACHE:
        return CURRENCY_CACHE[cache_key]
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"https://api.frankfurter.app/latest?from={cache_key}", timeout=5)
            data = resp.json()
            CURRENCY_CACHE[cache_key] = data
            return data
    except Exception:
        raise HTTPException(status_code=503, detail="Currency service unavailable.")


@router.post("/checkout/{plan_name}")
async def create_checkout(plan_name: str, user_id: str = Depends(current_user_id)):
    """Initiate Stripe checkout for the authenticated user."""
    from ...services.stripe_service import create_checkout_session
    from ...core.config import settings
    success = f"{settings.frontend_url}/dashboard?upgraded=1"
    cancel = f"{settings.frontend_url}/pricing"
    url = create_checkout_session(user_id, plan_name, success, cancel)
    return {"checkout_url": url}
