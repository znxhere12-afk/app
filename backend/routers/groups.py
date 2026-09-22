import random
import uuid
from datetime import timezone

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
from models.usage import UsagePoint

router = APIRouter(tags=["groups"])
_SNAPSHOT_MIN_GAP_SECONDS = 20  # keep the timeline readable instead of one point per poll


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


@router.get("/catalog", response_model=Catalog)
async def get_catalog(user: UserOut = Depends(get_current_user)):
    return Catalog(
        regions=[Region(**r) for r in REGIONS],
        packs=[Pack(**p) for p in PACKS],
        binance_pay_id=binance_pay_id(),
    )


@router.get("/groups", response_model=list[Group])
async def my_active_groups(user: UserOut = Depends(get_current_user)):
    """Running groups for the caller. Each read ticks the usage meter forward (simulated telemetry)."""
    docs = (
        await db.groups.find({"user_id": user.id, "status": "running"})
        .sort("launched_at", DESCENDING)
        .to_list(500)
    )
    out = []
    for d in docs:
        ticked = min(d["usage_limit"], d["usage"] + random.randint(0, 3))
        if ticked != d["usage"]:
            await db.groups.update_one({"id": d["id"]}, {"$set": {"usage": ticked}})
            d["usage"] = ticked
        out.append(to_group(d))
    await record_usage_snapshot(user.id, docs)
    return out


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
