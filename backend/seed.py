"""Idempotent seed: admin account, demo player, and sample ledger data.

Run: cd /app/backend && python seed.py
Not imported by server.py — standalone script that reuses the shared Mongo handle.
"""

import uuid
from datetime import timedelta

from lib.dates import now_utc
from lib.db import client, db, ensure_indexes
from lib.security import hash_password

ADMIN_USERNAME = "znxhere12"
ADMIN_EMAIL = "znxhere12@gmail.com"
ADMIN_PASSWORD = "54321znxhere12@gmail"
DEMO_USERNAME = "player1"
DEMO_PASSWORD = "player1234"


async def upsert_user(
    username: str,
    email: str | None,
    password: str,
    basic: int,
    premium: int,
    is_admin: bool = False,
) -> dict:
    doc = await db.users.find_one({"username_lower": username.lower()})
    if doc:
        return doc
    doc = {
        "id": str(uuid.uuid4()),
        "username": username,
        "username_lower": username.lower(),
        "email": email.lower() if email else None,
        "password_hash": hash_password(password),
        "basic_credits": basic,
        "premium_credits": premium,
        "is_admin": is_admin,
        "created_at": now_utc() - timedelta(days=30),
    }
    await db.users.insert_one(doc)
    return doc


def payment_doc(
    user_id: str,
    username: str,
    pack_id: str,
    credit_type: str,
    usd: float,
    credits: int,
    order_id: str,
    status: str,
    created_at,
    reviewed_at=None,
) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "username": username,
        "pack_id": pack_id,
        "amount_usd": usd,
        "credit_type": credit_type,
        "credits": credits,
        "binance_order_id": order_id,
        "status": status,
        "created_at": created_at,
        "reviewed_at": reviewed_at,
        "reviewed_by": "znxhere12" if reviewed_at else None,
    }


def group_doc(
    user_id: str,
    username: str,
    clan_id: str,
    region_id: str,
    region_name: str,
    tier: str,
    cost: int,
    server_number: int,
    usage: int,
    status: str,
    launched_at,
) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "username": username,
        "clan_id": clan_id,
        "region_id": region_id,
        "region_name": region_name,
        "tier": tier,
        "cost": cost,
        "server_number": server_number,
        "usage": usage,
        "usage_limit": 100,
        "status": status,
        "launched_at": launched_at,
    }


def event_doc(
    user_id: str,
    action: str,
    clan_id: str,
    region_name: str,
    tier: str,
    cost: int,
    server_number: int | None,
    created_at,
) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": action,
        "clan_id": clan_id,
        "region_name": region_name,
        "tier": tier,
        "server_number": server_number,
        "cost": cost,
        "created_at": created_at,
    }


def coupon_doc(
    code: str,
    credit_type: str,
    amount: int,
    creator_id: str,
    creator_username: str,
    created_at,
    redeemed_by: str | None = None,
    redeemed_by_username: str | None = None,
    redeemed_at=None,
    expires_at=None,
) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "code": code,
        "credit_type": credit_type,
        "amount": amount,
        "creator_id": creator_id,
        "creator_username": creator_username,
        "status": "redeemed" if redeemed_by else "active",
        "redeemed_by": redeemed_by,
        "redeemed_by_username": redeemed_by_username,
        "created_at": created_at,
        "redeemed_at": redeemed_at,
        "expires_at": expires_at,
    }


async def main() -> None:
    await ensure_indexes()
    now = now_utc()

    admin = await upsert_user(ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD, 5000, 2500, is_admin=True)
    demo = await upsert_user(DEMO_USERNAME, None, DEMO_PASSWORD, 800, 300)

    if await db.payments.count_documents({}) == 0:
        await db.payments.insert_many(
            [
                payment_doc(
                    demo["id"], demo["username"], "basic-1050", "basic", 10, 1050,
                    "BIN-8816234105", "approved", now - timedelta(days=3),
                    reviewed_at=now - timedelta(days=3) + timedelta(minutes=12),
                ),
                payment_doc(
                    demo["id"], demo["username"], "premium-250", "premium", 5, 250,
                    "BIN-4471203987", "approved", now - timedelta(days=5),
                    reviewed_at=now - timedelta(days=5) + timedelta(minutes=40),
                ),
                payment_doc(
                    demo["id"], demo["username"], "basic-500", "basic", 5, 500,
                    "BIN-9903417551", "pending", now - timedelta(hours=1),
                ),
            ]
        )

    if await db.groups.count_documents({}) == 0:
        await db.groups.insert_many(
            [
                group_doc(demo["id"], demo["username"], "584213676", "bangladesh", "Bangladesh", "basic", 100, 7, 34, "running", now - timedelta(days=1)),
                group_doc(demo["id"], demo["username"], "771902455", "europe", "Europe", "premium", 150, 23, 12, "running", now - timedelta(hours=4)),
                group_doc(demo["id"], demo["username"], "630118842", "india", "India", "basic", 120, 11, 100, "stopped", now - timedelta(days=3)),
                group_doc(demo["id"], demo["username"], "200945531", "singapore", "Singapore", "premium", 140, 5, 88, "refunded", now - timedelta(days=6)),
            ]
        )

    if await db.group_events.count_documents({}) == 0:
        await db.group_events.insert_many(
            [
                event_doc(demo["id"], "launched", "584213676", "Bangladesh", "basic", 100, 7, now - timedelta(days=1)),
                event_doc(demo["id"], "launched", "771902455", "Europe", "premium", 150, 23, now - timedelta(hours=4)),
                event_doc(demo["id"], "stopped", "630118842", "India", "basic", 120, 11, now - timedelta(days=2)),
                event_doc(demo["id"], "launched", "630118842", "India", "basic", 120, 11, now - timedelta(days=3)),
                event_doc(demo["id"], "refunded", "200945531", "Singapore", "premium", 140, 5, now - timedelta(days=5)),
            ]
        )

    if await db.coupons.count_documents({}) == 0:
        await db.coupons.insert_many(
            [
                coupon_doc(
                    "NX-WELCOME7", "premium", 50, admin["id"], admin["username"],
                    now - timedelta(days=2), expires_at=now + timedelta(days=30),
                ),
                coupon_doc("NX-PLAYR100", "basic", 100, demo["id"], demo["username"], now - timedelta(days=1)),
                # player1-owned code lapsing soon — drives the dashboard expiry reminder
                coupon_doc(
                    "NX-SOON48H", "basic", 60, demo["id"], demo["username"],
                    now - timedelta(days=5), expires_at=now + timedelta(days=2),
                ),
                coupon_doc(
                    "NX-GIFT4YOU", "basic", 50, admin["id"], admin["username"], now - timedelta(days=4),
                    redeemed_by=demo["id"], redeemed_by_username=demo["username"],
                    redeemed_at=now - timedelta(days=2),
                ),
                # already lapsed — proves the expiry path renders an "expired" badge
                coupon_doc(
                    "NX-LAPSED22", "basic", 75, admin["id"], admin["username"],
                    now - timedelta(days=10), expires_at=now - timedelta(days=3),
                ),
            ]
        )

    if await db.transfers.count_documents({}) == 0:
        await db.transfers.insert_many(
            [
                {
                    "id": str(uuid.uuid4()),
                    "from_user_id": admin["id"],
                    "from_username": admin["username"],
                    "to_user_id": demo["id"],
                    "to_username": demo["username"],
                    "credit_type": "basic",
                    "amount": 150,
                    "note": "Tournament prize payout",
                    "created_at": now - timedelta(days=2),
                },
                {
                    "id": str(uuid.uuid4()),
                    "from_user_id": demo["id"],
                    "from_username": demo["username"],
                    "to_user_id": admin["id"],
                    "to_username": admin["username"],
                    "credit_type": "premium",
                    "amount": 25,
                    "note": "Thanks for the boost",
                    "created_at": now - timedelta(hours=8),
                },
            ]
        )

    if await db.usage_snapshots.count_documents({}) == 0:
        # 24 hourly samples so the timeline chart is populated on first load
        samples = []
        usage_a = 4
        usage_b = 2
        for i in range(24, 0, -1):
            usage_a = min(100, usage_a + (2 + (i * 5) % 6))
            usage_b = min(100, usage_b + (1 + (i * 3) % 4))
            samples.append(
                {
                    "id": str(uuid.uuid4()),
                    "user_id": demo["id"],
                    "at": now - timedelta(hours=i),
                    "total_usage": usage_a + usage_b,
                    "total_limit": 200,
                    "active_groups": 2,
                    # per-clan breakdown powers the "Per Clan" timeline view
                    "groups": [
                        {"clan_id": "584213676", "usage": usage_a},
                        {"clan_id": "771902455", "usage": usage_b},
                    ],
                }
            )
        await db.usage_snapshots.insert_many(samples)

    print(f"Seed complete — admin: {ADMIN_USERNAME} / {ADMIN_PASSWORD} · demo: {DEMO_USERNAME} / {DEMO_PASSWORD}")
    client.close()


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
