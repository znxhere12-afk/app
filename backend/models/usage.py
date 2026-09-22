from datetime import datetime

from pydantic import BaseModel


class UsagePoint(BaseModel):
    """One sample of a commander's total slot usage across all running groups."""

    at: datetime
    total_usage: int
    total_limit: int
    active_groups: int
