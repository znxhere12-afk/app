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


class Plan(BaseModel):
    id: str
    name: str
    account_count: int
    duration_minutes: int
    extra_cost: int


class GroupCreate(BaseModel):
    region_id: str = Field(min_length=1, max_length=40)
    clan_id: str = Field(min_length=4, max_length=18, pattern=r"^[0-9]+$")
    plan_id: str = Field(default="squad-4", min_length=1, max_length=40)
    accept_rules: bool = False


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
    # Free Fire clan-war run details
    game: str = "Free Fire"
    plan_id: str = "squad-4"
    plan_name: str = "Squad"
    account_count: int = 4
    duration_minutes: int = 60
    expires_at: datetime | None = None
    # True when the platform stopped it at capacity rather than a human clicking Stop.
    auto_stopped: bool = False
    # Why it auto-stopped: "capacity" or "time_limit".
    stop_reason: str | None = None
    # True once a replacement run has been launched from this group, so the offer disappears.
    relaunched: bool = False


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
    auto: bool = False
