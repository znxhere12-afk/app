from datetime import datetime
from typing import Literal

from pydantic import BaseModel

AccountStatus = Literal["online", "offline"]
JoinRequest = Literal["sent", "accepted"]


class PlayerAccount(BaseModel):
    """One generated Free Fire player account attached to a launched group."""

    id: str
    group_id: str
    user_id: str
    slot: int
    ign: str
    uid: str
    clan_id: str
    status: AccountStatus
    join_request: JoinRequest
    cycles: int
    created_at: datetime


class AccessCode(BaseModel):
    """Admin-minted code a new player redeems at sign-up to unlock their account."""

    id: str
    code: str
    created_by: str
    note: str | None = None
    used_by: str | None = None
    used_by_username: str | None = None
    created_at: datetime
    used_at: datetime | None = None


class AccessCodeCreate(BaseModel):
    note: str | None = None


class ClanCycleStat(BaseModel):
    """Relaunch history: how often a clan has been cycled and what it cost."""

    clan_id: str
    region_name: str
    cycles: int
    total_cost: int
    basic_cost: int
    premium_cost: int
    first_launch: datetime
    last_launch: datetime
