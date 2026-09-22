import uuid

from fastapi import APIRouter, Depends, HTTPException
from pymongo import DESCENDING

from lib.dates import now_utc
from lib.db import db
from lib.deps import clean_doc, get_current_user
from models.auth import UserOut
from models.transfers import Transfer, TransferCreate

router = APIRouter(tags=["transfers"])


@router.get("/transfers", response_model=list[Transfer])
async def my_transfers(user: UserOut = Depends(get_current_user)):
    """Both directions in one feed, newest first — direction is stamped per row."""
    docs = (
        await db.transfers.find({"$or": [{"from_user_id": user.id}, {"to_user_id": user.id}]})
        .sort("created_at", DESCENDING)
        .to_list(200)
    )
    out: list[Transfer] = []
    for d in docs:
        cleaned = clean_doc(d)
        cleaned["direction"] = "out" if cleaned["from_user_id"] == user.id else "in"
        out.append(Transfer(**cleaned))
    return out


@router.post("/transfers", response_model=Transfer, status_code=201)
async def send_credits(payload: TransferCreate, user: UserOut = Depends(get_current_user)):
    target_name = payload.to_username.strip()
    if target_name.lower() == user.username.lower():
        raise HTTPException(status_code=400, detail="You cannot transfer credits to yourself")

    recipient = await db.users.find_one({"username_lower": target_name.lower()})
    if recipient is None:
        raise HTTPException(status_code=404, detail=f"No member named '{target_name}'")

    field = "basic_credits" if payload.credit_type == "basic" else "premium_credits"
    charged = await db.users.update_one(
        {"id": user.id, field: {"$gte": payload.amount}},
        {"$inc": {field: -payload.amount}},
    )
    if charged.modified_count == 0:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient {payload.credit_type.title()} credits for this transfer",
        )
    await db.users.update_one({"id": recipient["id"]}, {"$inc": {field: payload.amount}})

    transfer = Transfer(
        id=str(uuid.uuid4()),
        from_user_id=user.id,
        from_username=user.username,
        to_user_id=recipient["id"],
        to_username=recipient["username"],
        credit_type=payload.credit_type,
        amount=payload.amount,
        note=payload.note.strip() if payload.note else None,
        created_at=now_utc(),
        direction="out",
    )
    doc = transfer.model_dump()
    doc.pop("direction", None)  # direction is per-viewer, never stored
    await db.transfers.insert_one(doc)
    return transfer
