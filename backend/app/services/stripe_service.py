import stripe
from fastapi import HTTPException
from ..core.config import settings
from ..core.database import get_supabase

stripe.api_key = settings.stripe_secret_key


def create_checkout_session(user_id: str, plan_name: str, success_url: str, cancel_url: str) -> str:
    sb = get_supabase()
    plan = sb.table("plans").select("*").eq("name", plan_name).single().execute().data
    if not plan or not plan.get("stripe_price_id"):
        raise HTTPException(status_code=400, detail="Plan not found or has no Stripe price.")

    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": plan["stripe_price_id"], "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        client_reference_id=user_id,
        metadata={"user_id": user_id, "plan_name": plan_name},
    )
    return session.url


def create_portal_session(stripe_customer_id: str, return_url: str) -> str:
    session = stripe.billing_portal.Session.create(
        customer=stripe_customer_id,
        return_url=return_url,
    )
    return session.url


def handle_webhook(payload: bytes, sig_header: str) -> dict:
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature.")

    sb = get_supabase()

    # Log every event
    sb.table("stripe_events").upsert({
        "stripe_event_id": event["id"],
        "event_type": event["type"],
        "data": dict(event["data"]),
    }).execute()

    if event["type"] == "checkout.session.completed":
        sess = event["data"]["object"]
        user_id = sess.get("client_reference_id")
        plan_name = sess.get("metadata", {}).get("plan_name")
        stripe_sub_id = sess.get("subscription")
        stripe_cust_id = sess.get("customer")
        if user_id and plan_name:
            plan = sb.table("plans").select("id").eq("name", plan_name).single().execute().data
            if plan:
                sb.table("subscriptions").upsert({
                    "user_id": user_id,
                    "plan_id": plan["id"],
                    "stripe_subscription_id": stripe_sub_id,
                    "stripe_customer_id": stripe_cust_id,
                    "status": "active",
                }).execute()

    elif event["type"] in ("customer.subscription.deleted", "customer.subscription.updated"):
        sub = event["data"]["object"]
        sb.table("subscriptions").update({
            "status": sub.get("status", "canceled"),
        }).eq("stripe_subscription_id", sub["id"]).execute()

    return {"status": "ok"}
