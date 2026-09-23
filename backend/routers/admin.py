import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING

from lib.dates import now_utc
from lib.db import db
from lib.deps import clean_doc, require_admin
from models.accounts import AccessCode, AccessCodeCreate
from models.auth import UserOut
from models.coupons import Coupon, CouponCreate
from models.groups import Group, GroupEvent
from models.payments import CreditType, Payment
from routers.coupons import expiry_from_days, generate_code

router = APIRouter(prefix="/admin", tags=["admin"])


class CreditAdjust(BaseModel):
    credit_type: CreditType
    delta: int = Field(ge=-1000000, le=1000000)


def to_payment(doc: dict) -> Payment:
    return Payment(**clean_doc(doc))


def to_coupon(doc: dict) -> Coupon:
    return Coupon(**clean_doc(doc))


# --- users ---------------------------------------------------------------


@router.get("/users", response_model=list[UserOut])
async def all_users(admin: UserOut = Depends(require_admin)):
    docs = await db.users.find({}).sort("created_at", ASCENDING).to_list(1000)
    return [UserOut(**clean_doc(d)) for d in docs]


@router.post("/users/{user_id}/credits", response_model=UserOut)
async def adjust_credits(user_id: str, payload: CreditAdjust, admin: UserOut = Depends(require_admin)):
    doc = await db.users.find_one({"id": user_id})
    if doc is None:
        raise HTTPException(status_code=404, detail="User not found")
    field = "basic_credits" if payload.credit_type == "basic" else "premium_credits"
    doc[field] = max(0, doc.get(field, 0) + payload.delta)
    await db.users.update_one({"id": user_id}, {"$set": {field: doc[field]}})
    return UserOut(**clean_doc(doc))


# --- payments ------------------------------------------------------------


@router.get("/payments", response_model=list[Payment])
async def all_payments(admin: UserOut = Depends(require_admin)):
    docs = await db.payments.find({}).sort("created_at", DESCENDING).to_list(1000)
    return [to_payment(d) for d in docs]


@router.post("/payments/{payment_id}/approve", response_model=Payment)
async def approve_payment(payment_id: str, admin: UserOut = Depends(require_admin)):
    doc = await db.payments.find_one({"id": payment_id})
    if doc is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if doc["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending payments can be approved")
    field = "basic_credits" if doc["credit_type"] == "basic" else "premium_credits"
    await db.users.update_one({"id": doc["user_id"]}, {"$inc": {field: doc["credits"]}})
    await db.payments.update_one(
        {"id": payment_id},
        {"$set": {"status": "approved", "reviewed_at": now_utc(), "reviewed_by": admin.username}},
    )
    doc.update({"status": "approved", "reviewed_at": now_utc(), "reviewed_by": admin.username})
    return to_payment(doc)


@router.post("/payments/{payment_id}/reject", response_model=Payment)
async def reject_payment(payment_id: str, admin: UserOut = Depends(require_admin)):
    doc = await db.payments.find_one({"id": payment_id})
    if doc is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if doc["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending payments can be rejected")
    await db.payments.update_one(
        {"id": payment_id},
        {"$set": {"status": "rejected", "reviewed_at": now_utc(), "reviewed_by": admin.username}},
    )
    doc.update({"status": "rejected", "reviewed_at": now_utc(), "reviewed_by": admin.username})
    return to_payment(doc)


@router.post("/payments/{payment_id}/refund", response_model=Payment)
async def refund_payment(payment_id: str, admin: UserOut = Depends(require_admin)):
    doc = await db.payments.find_one({"id": payment_id})
    if doc is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if doc["status"] != "approved":
        raise HTTPException(status_code=400, detail="Only approved payments can be refunded")
    field = "basic_credits" if doc["credit_type"] == "basic" else "premium_credits"
    user_doc = await db.users.find_one({"id": doc["user_id"]})
    new_balance = max(0, (user_doc or {}).get(field, 0) - doc["credits"])
    await db.users.update_one({"id": doc["user_id"]}, {"$set": {field: new_balance}})
    await db.payments.update_one(
        {"id": payment_id},
        {"$set": {"status": "refunded", "reviewed_at": now_utc(), "reviewed_by": admin.username}},
    )
    doc.update({"status": "refunded", "reviewed_at": now_utc(), "reviewed_by": admin.username})
    return to_payment(doc)


# --- groups --------------------------------------------------------------


@router.get("/groups", response_model=list[Group])
async def all_groups(admin: UserOut = Depends(require_admin)):
    docs = await db.groups.find({}).sort("launched_at", DESCENDING).to_list(1000)
    return [Group(**clean_doc(d)) for d in docs]


@router.post("/groups/{group_id}/refund", response_model=Group)
async def refund_group(group_id: str, admin: UserOut = Depends(require_admin)):
    """Return a group's credits to its owner and mark it refunded."""
    doc = await db.groups.find_one({"id": group_id})
    if doc is None:
        raise HTTPException(status_code=404, detail="Group not found")
    if doc["status"] == "refunded":
        raise HTTPException(status_code=400, detail="Group is already refunded")
    field = "basic_credits" if doc["tier"] == "basic" else "premium_credits"
    await db.users.update_one({"id": doc["user_id"]}, {"$inc": {field: doc["cost"]}})
    await db.groups.update_one({"id": group_id}, {"$set": {"status": "refunded"}})
    doc["status"] = "refunded"
    event = GroupEvent(
        id=str(uuid.uuid4()),
        user_id=doc["user_id"],
        action="refunded",
        clan_id=doc["clan_id"],
        region_name=doc["region_name"],
        tier=doc["tier"],
        server_number=doc["server_number"],
        cost=doc["cost"],
        created_at=now_utc(),
    )
    await db.group_events.insert_one(event.model_dump())
    return Group(**clean_doc(doc))


# --- coupons -------------------------------------------------------------


@router.get("/access-codes", response_model=list[AccessCode])
async def all_access_codes(admin: UserOut = Depends(require_admin)):
    docs = await db.access_codes.find({}).sort("created_at", DESCENDING).to_list(500)
    return [AccessCode(**clean_doc(d)) for d in docs]


@router.post("/access-codes", response_model=AccessCode, status_code=201)
async def mint_access_code(payload: AccessCodeCreate, admin: UserOut = Depends(require_admin)):
    """Generate a code a new player redeems at sign-up to unlock their account."""
    code = f"FF-{generate_code().removeprefix('NX-')}"
    while await db.access_codes.find_one({"code": code}):
        code = f"FF-{generate_code().removeprefix('NX-')}"
    doc = AccessCode(
        id=str(uuid.uuid4()),
        code=code,
        created_by=admin.username,
        note=payload.note.strip() if payload.note else None,
        created_at=now_utc(),
    )
    await db.access_codes.insert_one(doc.model_dump())
    return doc


@router.get("/coupons", response_model=list[Coupon])
async def all_coupons(admin: UserOut = Depends(require_admin)):
    docs = await db.coupons.find({}).sort("created_at", DESCENDING).to_list(1000)
    return [to_coupon(d) for d in docs]


@router.post("/coupons", response_model=Coupon, status_code=201)
async def mint_coupon(payload: CouponCreate, admin: UserOut = Depends(require_admin)):
    """Mint a giveaway coupon funded by the system — no balance deduction."""
    code = generate_code()
    while await db.coupons.find_one({"code": code}):
        code = generate_code()
    coupon = Coupon(
        id=str(uuid.uuid4()),
        code=code,
        credit_type=payload.credit_type,
        amount=payload.amount,
        creator_id=admin.id,
        creator_username=admin.username,
        status="active",
        created_at=now_utc(),
        expires_at=expiry_from_days(payload.expires_in_days),
    )
    await db.coupons.insert_one(coupon.model_dump())
    return coupon
