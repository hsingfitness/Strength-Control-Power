from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str = "user"
    plan: str = "free"
    permissions: dict = Field(default_factory=dict)

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class CheckoutItem(BaseModel):
    id: str
    name: str
    price: float = Field(gt=0)
    qty: int = Field(gt=0, le=99)


class CheckoutRequest(BaseModel):
    items: list[CheckoutItem] = Field(min_length=1)
    # Where to send the browser after Stripe Checkout. Defaults to the cart
    # page (marketplace orders); the assessment paywall passes its own.
    success_path: str = "/cart.html?checkout=success"
    cancel_path: str = "/cart.html?checkout=canceled"


class CheckoutResponse(BaseModel):
    checkout_url: str


class OrderOut(BaseModel):
    id: str
    items: list[dict]
    amount_total: float
    currency: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ReportRequest(BaseModel):
    symptom_details: str = Field(min_length=1, max_length=4000)
    breakfast: str = Field(default="", max_length=300)
    lunch: str = Field(default="", max_length=300)
    dinner: str = Field(default="", max_length=300)
    sleep: str = Field(default="", max_length=300)


class ReportOut(BaseModel):
    id: str
    summary: str
    risk_level: str
    recommendations: list[str]
    disclaimer: str
    tier: str = "free"
    created_at: datetime


# ---------- Marketplace products ----------

class ProductOut(BaseModel):
    id: str
    name: str
    description: str
    price: float
    category: str
    icon: str
    badges: list[str]
    stripe_payment_link: str | None = None
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    id: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=500)
    price: float = Field(gt=0)
    category: str = Field(default="supplements", max_length=40)
    icon: str = Field(default="💊", max_length=10)
    badges: list[str] = Field(default_factory=list)
    stripe_payment_link: str | None = None
    is_active: bool = True
    sort_order: int = 0


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=500)
    price: float | None = Field(default=None, gt=0)
    category: str | None = Field(default=None, max_length=40)
    icon: str | None = Field(default=None, max_length=10)
    badges: list[str] | None = None
    stripe_payment_link: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None


# ---------- Admin: operator management ----------

ALLOWED_PERMISSIONS = ["manage_products"]


class OperatorOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    permissions: dict
    created_at: datetime

    class Config:
        from_attributes = True


class OperatorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    permissions: dict[str, bool] = Field(default_factory=dict)


class OperatorPermissionsUpdate(BaseModel):
    permissions: dict[str, bool]
