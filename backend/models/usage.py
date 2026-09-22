from datetime import datetime

from pydantic import BaseModel

from models.payments import CreditType


class UsageGroupSample(BaseModel):
    """Per-clan slice of one timeline sample."""

    clan_id: str
    usage: int


class UsagePoint(BaseModel):
    """One sample of a commander's total slot usage across all running groups."""

    at: datetime
    total_usage: int
    total_limit: int
    active_groups: int


class GroupUsagePoint(BaseModel):
    at: datetime
    # clan_id -> slots in use at that moment
    usage: dict[str, int]


class GroupTimeline(BaseModel):
    clans: list[str]
    points: list[GroupUsagePoint]


class RegionStat(BaseModel):
    region_name: str
    tier: CreditType
    launches: int
    total_cost: int
