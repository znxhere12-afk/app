import uuid

from fastapi import APIRouter, Depends, HTTPException
from pymongo import DESCENDING

from lib.dates import now_utc
from lib.catalog import find_pack
from lib.db import db
from lib.deps import clean_doc, get_current_user
from models.auth import UserOut
from models.payments import Payment, PaymentCreate

router = APIRouter(tags=["payments"])


def to_payment(doc: dict) -> Payment:
    return Payment(**clean_doc(doc))


@router.get("/payments", response_model=list[Payment])
async def my_payments(user: UserOut = Depends(get_current_user)):
    docs = await db.payments.find({"user_id": user.id}).sort("created_at", DESCENDING).to_list(500)
    return [to_payment(d) for d in docs]


@router.post("/payments", response_model=Payment, status_code=201)
async def submit_payment(payload: PaymentCreate, user: UserOut = Depends(get_current_user)):
    """Record a Binance transfer claim — stays pending until an admin approves it."""
    pack = find_pack(payload.pack_id)
    if pack is None:
        raise HTTPException(status_code=404, detail="Unknown credit pack")
    payment = Payment(
        id=str(uuid.uuid4()),
        user_id=user.id,
        username=user.username,
        pack_id=pack["id"],
        amount_usd=pack["amount_usd"],
        credit_type=pack["credit_type"],
        credits=pack["credits"],
        binance_order_id=payload.binance_order_id.strip(),
        status="pending",
        created_at=now_utc(),
    )
    await db.payments.insert_one(payment.model_dump())
    return payment
