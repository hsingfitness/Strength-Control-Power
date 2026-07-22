import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_user, get_current_user_optional
from ..models import Order, User
from ..schemas import CheckoutRequest, CheckoutResponse, OrderOut

router = APIRouter(prefix="/payments", tags=["payments"])

# Special product IDs that unlock an assessment plan instead of shipping
# a physical/marketplace item. Keeps this on the generic checkout endpoint
# rather than needing a separate one.
PLAN_PRODUCT_IDS = {"plan-member": "member", "plan-vip": "vip"}


def _frontend_base_url() -> str:
    origins = settings.FRONTEND_ORIGINS.strip()
    if origins in ("", "*"):
        return "http://localhost:8080"
    return origins.split(",")[0].strip().rstrip("/")


@router.post("/create-checkout-session", response_model=CheckoutResponse)
def create_checkout_session(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payments aren't configured yet. Set STRIPE_SECRET_KEY on the server.",
        )

    is_plan_purchase = any(item.id in PLAN_PRODUCT_IDS for item in payload.items)
    if is_plan_purchase and current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please log in before purchasing a plan.",
        )

    stripe.api_key = settings.STRIPE_SECRET_KEY

    line_items = [
        {
            "price_data": {
                "currency": "usd",
                "product_data": {"name": item.name},
                "unit_amount": round(item.price * 100),
            },
            "quantity": item.qty,
        }
        for item in payload.items
    ]

    amount_total = sum(item.price * item.qty for item in payload.items)
    base_url = _frontend_base_url()

    order = Order(
        user_id=str(current_user.id) if current_user else None,
        items=[item.model_dump() for item in payload.items],
        amount_total=amount_total,
        currency="usd",
        status="pending",
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    success_path = payload.success_path if payload.success_path.startswith("/") else "/" + payload.success_path
    cancel_path = payload.cancel_path if payload.cancel_path.startswith("/") else "/" + payload.cancel_path
    joiner = "&" if "?" in success_path else "?"

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=line_items,
            success_url=f"{base_url}{success_path}{joiner}order={order.id}",
            cancel_url=f"{base_url}{cancel_path}",
            metadata={"order_id": str(order.id)},
        )
    except stripe.error.StripeError as e:
        db.delete(order)
        db.commit()
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    order.stripe_session_id = session.id
    db.commit()

    return CheckoutResponse(checkout_url=session.url)


def _finalize_order(order: Order, db: Session) -> None:
    """Mark an order paid and apply any plan unlock. Shared by the webhook
    and the verify-order fallback so both paths behave identically."""
    if order.status == "paid":
        return

    order.status = "paid"

    plan_ids = [PLAN_PRODUCT_IDS[i["id"]] for i in (order.items or []) if i.get("id") in PLAN_PRODUCT_IDS]
    if plan_ids and order.user_id:
        user = db.query(User).filter(User.id == order.user_id).first()
        if user:
            new_plan = "vip" if "vip" in plan_ids else "member"
            if new_plan == "vip" or user.plan != "vip":
                user.plan = new_plan

    db.commit()


@router.post("/orders/{order_id}/verify", response_model=OrderOut)
def verify_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Called when the browser lands back on a success page. Confirms
    payment directly with Stripe and finalizes the order — a safety net
    in case the webhook isn't configured yet or hasn't landed."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order or order.user_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    if order.status != "paid" and order.stripe_session_id and settings.STRIPE_SECRET_KEY:
        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            session = stripe.checkout.Session.retrieve(order.stripe_session_id)
            if session.get("payment_status") == "paid":
                _finalize_order(order, db)
        except stripe.error.StripeError:
            pass  # leave order as-is; webhook may still land

    return OrderOut(
        id=str(order.id),
        items=order.items,
        amount_total=float(order.amount_total),
        currency=order.currency,
        status=order.status,
        created_at=order.created_at,
    )


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Webhook not configured.")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature.")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        order = db.query(Order).filter(Order.stripe_session_id == session["id"]).first()
        if order:
            _finalize_order(order, db)

    return {"received": True}


@router.get("/orders", response_model=list[OrderOut])
def list_my_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    orders = (
        db.query(Order)
        .filter(Order.user_id == str(current_user.id))
        .order_by(Order.created_at.desc())
        .all()
    )
    return [
        OrderOut(
            id=str(o.id),
            items=o.items,
            amount_total=float(o.amount_total),
            currency=o.currency,
            status=o.status,
            created_at=o.created_at,
        )
        for o in orders
    ]
