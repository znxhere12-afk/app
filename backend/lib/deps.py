"""Shared FastAPI dependencies: current-user resolution + admin gate + doc cleaning."""

from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request

from lib.db import db
from lib.security import COOKIE_NAME, decode_session_token
from models.auth import UserOut


def clean_doc(doc: dict) -> dict:
    """Strip Mongo _id and normalise naive motor datetimes to aware UTC."""
    cleaned = {k: v for k, v in doc.items() if k != "_id"}
    for key, value in cleaned.items():
        if isinstance(value, datetime) and value.tzinfo is None:
            cleaned[key] = value.replace(tzinfo=timezone.utc)
    return cleaned


def doc_to_user(doc: dict) -> UserOut:
    return UserOut(**clean_doc(doc))


async def get_current_user(request: Request) -> UserOut:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = decode_session_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    doc = await db.users.find_one({"id": user_id})
    if not doc:
        raise HTTPException(status_code=401, detail="Account no longer exists")
    return doc_to_user(doc)


async def require_admin(user: UserOut = Depends(get_current_user)) -> UserOut:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
