"""Server-side date helpers. The pod clock is UTC — anchor "today" here, never in the browser."""

import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo


def today_iso(tz: str | None = None) -> str:
    """Today's date as YYYY-MM-DD in `tz` (default: APP_TZ env, else UTC)."""
    zone = tz or os.environ.get("APP_TZ", "UTC")
    return datetime.now(ZoneInfo(zone)).strftime("%Y-%m-%d")


def now_utc() -> datetime:
    """Aware UTC now — store this on write so Pydantic serialises with an offset."""
    return datetime.now(timezone.utc)


def as_utc(dt: datetime) -> datetime:
    """Normalise a naive datetime handed back by motor to aware UTC on read."""
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
