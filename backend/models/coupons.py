from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from models.payments import CreditType

# "expired" is derived on read from expires_at — never stored as-is.
CouponStatus = Literal["active", "redeemed", "expired"]


class CouponCreate(BaseModel):
    credit_type: CreditType
    amount: int = Field(ge=1, le=100000)
    # None = never expires; otherwise the code dies this many days after creation.
    expires_in_days: int | None = Field(default=None, ge=1, le=365)


class CouponRedeem(BaseModel):
    code: str = Field(min_length=4, max_length=24)


class Coupon(BaseModel):
    id: str
    code: str
    credit_type: CreditType
    amount: int
    creator_id: str
    creator_username: str
    status: CouponStatus
    redeemed_by: str | None = None
    redeemed_by_username: str | None = None
    created_at: datetime
    redeemed_at: datetime | None = None
    expires_at: datetime | None = None
