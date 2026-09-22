from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from models.payments import CreditType

GroupStatus = Literal["running", "stopped", "refunded"]
GroupAction = Literal["launched", "stopped", "deleted", "refunded"]


class Region(BaseModel):
    id: str
    name: str
    tier: CreditType
    cost: int


class GroupCreate(BaseModel):
    region_id: str = Field(min_length=1, max_length=40)
    clan_id: str = Field(min_length=4, max_length=18, pattern=r"^[0-9]+$")


class Group(BaseModel):
    id: str
    user_id: str
    username: str = ""
    clan_id: str
    region_id: str
    region_name: str
    tier: CreditType
    cost: int
    server_number: int
    usage: int
    usage_limit: int
    status: GroupStatus
    launched_at: datetime


class GroupEvent(BaseModel):
    id: str
    user_id: str
    action: GroupAction
    clan_id: str
    region_name: str
    tier: CreditType
    server_number: int | None = None
    cost: int
    created_at: datetime
