"""Shared Mongo handle — import `client`/`db` from here (server.py, routers, seed.py)."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

load_dotenv(Path(__file__).parent.parent / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logger = logging.getLogger(__name__)

# One entry per collection: every field a route filters, sorts, or dedupes on. Applied by ensure_indexes() at startup.
INDEXES: dict[str, list[IndexModel]] = {
    "status_checks": [IndexModel([("timestamp", DESCENDING)], name="timestamp_desc")],
    "users": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("username_lower", ASCENDING)], name="username_lower", unique=True),
        IndexModel(
            [("email", ASCENDING)],
            name="email_unique",
            unique=True,
            partialFilterExpression={"email": {"$type": "string"}},
        ),
    ],
    "payments": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)], name="user_created"),
        IndexModel([("status", ASCENDING), ("created_at", DESCENDING)], name="status_created"),
    ],
    "groups": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("user_id", ASCENDING), ("status", ASCENDING)], name="user_status"),
    ],
    "group_events": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)], name="user_created"),
    ],
    "coupons": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("code", ASCENDING)], name="code", unique=True),
        IndexModel([("creator_id", ASCENDING), ("created_at", DESCENDING)], name="creator_created"),
        IndexModel([("redeemed_by", ASCENDING), ("redeemed_at", DESCENDING)], name="redeemed_by", sparse=True),
        IndexModel([("status", ASCENDING), ("expires_at", ASCENDING)], name="status_expires"),
    ],
    "transfers": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("from_user_id", ASCENDING), ("created_at", DESCENDING)], name="from_created"),
        IndexModel([("to_user_id", ASCENDING), ("created_at", DESCENDING)], name="to_created"),
    ],
    "usage_snapshots": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("user_id", ASCENDING), ("at", DESCENDING)], name="user_at"),
    ],
    "player_accounts": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("group_id", ASCENDING), ("slot", ASCENDING)], name="group_slot"),
        IndexModel([("user_id", ASCENDING)], name="user_id"),
    ],
    "access_codes": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("code", ASCENDING)], name="code", unique=True),
        IndexModel([("created_at", DESCENDING)], name="created_at"),
    ],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:  # one at a time so a bad spec skips only itself
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:  # never block boot on an index; the log line names what to fix
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)
