import secrets
import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from pymongo import ASCENDING, DESCENDING

from lib.dates import now_utc
from lib.db import db
from lib.deps import clean_doc, get_current_user
from models.auth import UserOut
from models.coupons import Coupon, CouponCreate, CouponRedeem

router = APIRouter(tags=["coupons"])
_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no I/O/0/1 — codes stay readable


def to_coupon(doc: dict) -> Coupon:
    """Derive the `expired` status on read so a lapsed code dies without a cron job."""
    cleaned = clean_doc(doc)
    expires_at = cleaned.get("expires_at")
    if cleaned.get("status") == "active" and expires_at is not None and expires_at <= now_utc():
        cleaned["status"] = "expired"
    return Coupon(**cleaned)


def generate_code() -> str:
    body = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(8))
    return f"NX-{body}"


def expiry_from_days(days: int | None):
    return None if days is None else now_utc() + timedelta(days=days)


@router.get("/coupons/expiring", response_model=list[Coupon])
async def expiring_coupons(user: UserOut = Depends(get_current_user)):
    """Own active codes lapsing within a week — drives the dashboard reminder."""
    now = now_utc()
    docs = (
        await db.coupons.find(
            {
                "creator_id": user.id,
                "status": "active",
                "expires_at": {"$gt": now, "$lte": now + timedelta(days=7)},
            }
        )
        .sort("expires_at", ASCENDING)
        .to_list(100)
    )
    return [to_coupon(d) for d in docs]


@router.get("/coupons/mine", response_model=list[Coupon])
async def my_coupons(user: UserOut = Depends(get_current_user)):
    docs = (
        await db.coupons.find({"creator_id": user.id})
        .sort("created_at", DESCENDING)
        .to_list(500)
    )
    return [to_coupon(d) for d in docs]


@router.get("/coupons/redeemed", response_model=list[Coupon])
async def coupons_i_redeemed(user: UserOut = Depends(get_current_user)):
    docs = (
        await db.coupons.find({"redeemed_by": user.id})
        .sort("redeemed_at", DESCENDING)
        .to_list(500)
    )
    return [to_coupon(d) for d in docs]


@router.post("/coupons", response_model=Coupon, status_code=201)
async def create_coupon(payload: CouponCreate, user: UserOut = Depends(get_current_user)):
    """Generate a coupon code funded by the creator's own balance."""
    field = "basic_credits" if payload.credit_type == "basic" else "premium_credits"
    charged = await db.users.update_one(
        {"id": user.id, field: {"$gte": payload.amount}},
        {"$inc": {field: -payload.amount}},
    )
    if charged.modified_count == 0:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient {payload.credit_type.title()} credits to fund this coupon",
        )
    code = generate_code()
    while await db.coupons.find_one({"code": code}):
        code = generate_code()
    coupon = Coupon(
        id=str(uuid.uuid4()),
        code=code,
        credit_type=payload.credit_type,
        amount=payload.amount,
        creator_id=user.id,
        creator_username=user.username,
        status="active",
        created_at=now_utc(),
        expires_at=expiry_from_days(payload.expires_in_days),
    )
    await db.coupons.insert_one(coupon.model_dump())
    return coupon


@router.post("/coupons/redeem", response_model=Coupon)
async def redeem_coupon(payload: CouponRedeem, user: UserOut = Depends(get_current_user)):
    code = payload.code.strip().upper()
    now = now_utc()
    claimed = await db.coupons.update_one(
        {
            "code": code,
            "status": "active",
            "$or": [{"expires_at": None}, {"expires_at": {"$gt": now}}],
        },
        {
            "$set": {
                "status": "redeemed",
                "redeemed_by": user.id,
                "redeemed_by_username": user.username,
                "redeemed_at": now,
            }
        },
    )
    if claimed.modified_count == 0:
        existing = await db.coupons.find_one({"code": code})
        if existing is not None and existing.get("status") == "active":
            raise HTTPException(status_code=400, detail="This coupon code has expired")
        raise HTTPException(status_code=400, detail="Invalid or already-redeemed coupon code")
    doc = await db.coupons.find_one({"code": code})
    field = "basic_credits" if doc["credit_type"] == "basic" else "premium_credits"
    await db.users.update_one({"id": user.id}, {"$inc": {field: doc["amount"]}})
    return to_coupon(doc)
