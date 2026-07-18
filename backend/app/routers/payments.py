import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_user, get_current_user_optional
from ..models import Order, User
from ..schemas import CheckoutRequest, CheckoutResponse, OrderOut

router = APIRouter(prefix="/payments", tags=["payments"])


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

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=line_items,
            success_url=f"{base_url}/cart.html?checkout=success&order={order.id}",
            cancel_url=f"{base_url}/cart.html?checkout=canceled",
            metadata={"order_id": str(order.id)},
        )
    except stripe.error.StripeError as e:
        db.delete(order)
        db.commit()
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    order.stripe_session_id = session.id
    db.commit()

    return CheckoutResponse(checkout_url=session.url)


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
            order.status = "paid"
            db.commit()

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
