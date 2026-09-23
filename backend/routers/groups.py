import random
import uuid
from datetime import timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pymongo import DESCENDING

from lib.catalog import PACKS, REGIONS, binance_pay_id, find_region
from lib.dates import now_utc
from lib.db import db
from lib.deps import clean_doc, get_current_user
from models.auth import UserOut
from models.catalog import Catalog
from models.groups import Group, GroupAction, GroupCreate, GroupEvent, Region
from models.payments import CreditType, Pack
from models.usage import GroupTimeline, GroupUsagePoint, RegionStat, UsagePoint

router = APIRouter(tags=["groups"])
_SNAPSHOT_MIN_GAP_SECONDS = 20  # keep the timeline readable instead of one point per poll
_REGION_STATS_WINDOW_DAYS = 30


def to_group(doc: dict) -> Group:
    return Group(**clean_doc(doc))


async def log_event(
    user_id: str,
    action: GroupAction,
    *,
    clan_id: str,
    region_name: str,
    tier: CreditType,
    cost: int,
    server_number: int | None,
    auto: bool = False,
) -> None:
    event = GroupEvent(
        id=str(uuid.uuid4()),
        user_id=user_id,
        action=action,
        clan_id=clan_id,
        region_name=region_name,
        tier=tier,
        server_number=server_number,
        cost=cost,
        created_at=now_utc(),
        auto=auto,
    )
    await db.group_events.insert_one(event.model_dump())


async def record_usage_snapshot(user_id: str, groups: list[dict]) -> None:
    """Append one timeline sample, throttled so polling can't flood the series."""
    now = now_utc()
    last = await db.usage_snapshots.find_one({"user_id": user_id}, sort=[("at", DESCENDING)])
    if last is not None:
        last_at = last["at"]
        if last_at.tzinfo is None:
            last_at = last_at.replace(tzinfo=timezone.utc)
        if (now - last_at).total_seconds() < _SNAPSHOT_MIN_GAP_SECONDS:
            return
    await db.usage_snapshots.insert_one(
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "at": now,
            "total_usage": sum(g["usage"] for g in groups),
            "total_limit": sum(g["usage_limit"] for g in groups),
            "active_groups": len(groups),
            # per-clan breakdown powers the "Per Clan" view of the timeline chart
            "groups": [{"clan_id": g["clan_id"], "usage": g["usage"]} for g in groups],
        }
    )


@router.get("/usage/timeline", response_model=list[UsagePoint])
async def usage_timeline(user: UserOut = Depends(get_current_user)):
    """Oldest-first slot-usage series for the dashboard chart."""
    docs = (
        await db.usage_snapshots.find({"user_id": user.id})
        .sort("at", DESCENDING)
        .to_list(60)
    )
    return [UsagePoint(**clean_doc(d)) for d in reversed(docs)]


@router.get("/usage/timeline/groups", response_model=GroupTimeline)
async def usage_timeline_by_group(user: UserOut = Depends(get_current_user)):
    """Same series split per clan, so a commander can see which group burns slots fastest."""
    docs = (
        await db.usage_snapshots.find({"user_id": user.id, "groups": {"$exists": True}})
        .sort("at", DESCENDING)
        .to_list(60)
    )
    points: list[GroupUsagePoint] = []
    clans: list[str] = []
    for d in reversed(docs):
        usage = {g["clan_id"]: g["usage"] for g in d.get("groups", [])}
        for clan in usage:
            if clan not in clans:
                clans.append(clan)
        points.append(GroupUsagePoint(at=clean_doc(d)["at"], usage=usage))
    return GroupTimeline(clans=clans, points=points)


@router.get("/stats/regions", response_model=list[RegionStat])
async def region_stats(user: UserOut = Depends(get_current_user)):
    """Launch counts and credit spend per region over the trailing 30 days."""
    since = now_utc() - timedelta(days=_REGION_STATS_WINDOW_DAYS)
    docs = await db.group_events.find(
        {"user_id": user.id, "action": "launched", "created_at": {"$gte": since}}
    ).to_list(1000)

    buckets: dict[str, dict] = {}
    for d in docs:
        key = d["region_name"]
        bucket = buckets.setdefault(
            key, {"region_name": key, "tier": d["tier"], "launches": 0, "total_cost": 0}
        )
        bucket["launches"] += 1
        bucket["total_cost"] += d["cost"]

    return [
        RegionStat(**b)
        for b in sorted(buckets.values(), key=lambda b: (-b["launches"], b["region_name"]))
    ]


@router.get("/catalog", response_model=Catalog)
async def get_catalog(user: UserOut = Depends(get_current_user)):
    return Catalog(
        regions=[Region(**r) for r in REGIONS],
        packs=[Pack(**p) for p in PACKS],
        binance_pay_id=binance_pay_id(),
    )


@router.get("/groups", response_model=list[Group])
async def my_active_groups(user: UserOut = Depends(get_current_user)):
    """Running groups for the caller. Each read ticks the usage meter forward (simulated
    telemetry) and auto-stops any group that has filled, so no slots sit idle."""
    docs = (
        await db.groups.find({"user_id": user.id, "status": "running"})
        .sort("launched_at", DESCENDING)
        .to_list(500)
    )
    out = []
    still_running = []
    just_auto_stopped = []
    for d in docs:
        ticked = min(d["usage_limit"], d["usage"] + random.randint(0, 3))
        if ticked != d["usage"]:
            await db.groups.update_one({"id": d["id"]}, {"$set": {"usage": ticked}})
            d["usage"] = ticked

        if d["usage"] >= d["usage_limit"]:
            # capacity reached — stop it here and record why
            await db.groups.update_one(
                {"id": d["id"]}, {"$set": {"status": "stopped", "auto_stopped": True}}
            )
            d["status"] = "stopped"
            d["auto_stopped"] = True
            await log_event(
                user.id,
                "stopped",
                clan_id=d["clan_id"],
                region_name=d["region_name"],
                tier=d["tier"],
                cost=d["cost"],
                server_number=d["server_number"],
                auto=True,
            )
            just_auto_stopped.append(to_group(d))
            continue

        still_running.append(d)
        out.append(to_group(d))
    await record_usage_snapshot(user.id, still_running)
    # The freshly auto-stopped ones ride along for exactly this one response (the next call
    # queries status="running" only), so the client can announce them without guessing.
    return out + just_auto_stopped


@router.post("/groups", response_model=Group, status_code=201)
async def launch_group(payload: GroupCreate, user: UserOut = Depends(get_current_user)):
    region = find_region(payload.region_id)
    if region is None:
        raise HTTPException(status_code=404, detail="Unknown region")
    credit_field = "basic_credits" if region["tier"] == "basic" else "premium_credits"
    charged = await db.users.update_one(
        {"id": user.id, credit_field: {"$gte": region["cost"]}},
        {"$inc": {credit_field: -region["cost"]}},
    )
    if charged.modified_count == 0:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient {region['tier'].title()} credits — top up in the Buy Credits panel",
        )
    group = Group(
        id=str(uuid.uuid4()),
        user_id=user.id,
        username=user.username,
        clan_id=payload.clan_id,
        region_id=region["id"],
        region_name=region["name"],
        tier=region["tier"],
        cost=region["cost"],
        server_number=random.randint(1, 64),
        usage=0,
        usage_limit=100,
        status="running",
        launched_at=now_utc(),
    )
    await db.groups.insert_one(group.model_dump())
    await log_event(
        user.id,
        "launched",
        clan_id=group.clan_id,
        region_name=group.region_name,
        tier=group.tier,
        cost=group.cost,
        server_number=group.server_number,
    )
    return group


@router.post("/groups/{group_id}/stop", response_model=Group)
async def stop_group(group_id: str, user: UserOut = Depends(get_current_user)):
    doc = await db.groups.find_one({"id": group_id, "user_id": user.id})
    if doc is None:
        raise HTTPException(status_code=404, detail="Group not found")
    if doc["status"] != "running":
        raise HTTPException(status_code=400, detail="Group is not running")
    await db.groups.update_one({"id": group_id}, {"$set": {"status": "stopped"}})
    doc["status"] = "stopped"
    await log_event(
        user.id,
        "stopped",
        clan_id=doc["clan_id"],
        region_name=doc["region_name"],
        tier=doc["tier"],
        cost=doc["cost"],
        server_number=doc["server_number"],
    )
    return to_group(doc)


@router.delete("/groups/{group_id}")
async def delete_group(group_id: str, user: UserOut = Depends(get_current_user)):
    doc = await db.groups.find_one_and_delete({"id": group_id, "user_id": user.id})
    if doc is None:
        raise HTTPException(status_code=404, detail="Group not found")
    await log_event(
        user.id,
        "deleted",
        clan_id=doc["clan_id"],
        region_name=doc["region_name"],
        tier=doc["tier"],
        cost=doc["cost"],
        server_number=doc["server_number"],
    )
    return {"ok": True}


@router.get("/history", response_model=list[GroupEvent])
async def group_history(user: UserOut = Depends(get_current_user)):
    docs = (
        await db.group_events.find({"user_id": user.id})
        .sort("created_at", DESCENDING)
        .to_list(200)
    )
    return [GroupEvent(**clean_doc(d)) for d in docs]
