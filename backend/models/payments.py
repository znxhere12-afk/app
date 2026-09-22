from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

CreditType = Literal["basic", "premium"]
PaymentStatus = Literal["pending", "approved", "rejected", "refunded"]


class Pack(BaseModel):
    id: str
    credit_type: CreditType
    amount_usd: float
    credits: int


class PaymentCreate(BaseModel):
    pack_id: str = Field(min_length=1, max_length=40)
    binance_order_id: str = Field(min_length=4, max_length=64)


class Payment(BaseModel):
    id: str
    user_id: str
    username: str
    pack_id: str
    amount_usd: float
    credit_type: CreditType
    credits: int
    binance_order_id: str
    status: PaymentStatus
    created_at: datetime
    reviewed_at: datetime | None = None
    reviewed_by: str | None = None
