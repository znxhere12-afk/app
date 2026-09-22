from datetime import datetime

from pydantic import BaseModel, Field

from models.payments import CreditType


class TransferCreate(BaseModel):
    to_username: str = Field(min_length=3, max_length=24)
    credit_type: CreditType
    amount: int = Field(ge=1, le=100000)
    note: str | None = Field(default=None, max_length=120)


class Transfer(BaseModel):
    id: str
    from_user_id: str
    from_username: str
    to_user_id: str
    to_username: str
    credit_type: CreditType
    amount: int
    note: str | None = None
    created_at: datetime
    # "out" when the caller sent it, "in" when the caller received it — set per request.
    direction: str = "out"
