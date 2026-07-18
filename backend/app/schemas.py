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
    name: str
    email: EmailStr

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
