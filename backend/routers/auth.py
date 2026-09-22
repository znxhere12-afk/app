import uuid

from fastapi import APIRouter, Depends, HTTPException, Response

from lib.dates import now_utc
from lib.db import db
from lib.deps import doc_to_user, get_current_user
from lib.security import COOKIE_NAME, create_session_token, hash_password, verify_password
from models.auth import LoginCreate, PasswordChange, SignupCreate, UserOut

router = APIRouter(tags=["auth"])
_SESSION_MAX_AGE = 60 * 60 * 24 * 7  # seconds


def _set_session_cookie(response: Response, user_id: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=create_session_token(user_id),
        max_age=_SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
        path="/",
    )


@router.post("/auth/signup", response_model=UserOut, status_code=201)
async def signup(payload: SignupCreate, response: Response):
    username_lower = payload.username.lower()
    if await db.users.find_one({"username_lower": username_lower}):
        raise HTTPException(status_code=409, detail="Username is already taken")
    if payload.email and await db.users.find_one({"email": payload.email.lower()}):
        raise HTTPException(status_code=409, detail="Email is already registered")

    user_doc = {
        "id": str(uuid.uuid4()),
        "username": payload.username,
        "username_lower": username_lower,
        "email": payload.email.lower() if payload.email else None,
        "password_hash": hash_password(payload.password),
        # welcome credits so a new commander can launch their first group right away
        "basic_credits": 200,
        "premium_credits": 50,
        "is_admin": False,
        "created_at": now_utc(),
    }
    await db.users.insert_one(user_doc)
    _set_session_cookie(response, user_doc["id"])
    return doc_to_user(user_doc)


@router.post("/auth/login", response_model=UserOut)
async def login(payload: LoginCreate, response: Response):
    identifier = payload.identifier.strip().lower()
    doc = await db.users.find_one({"username_lower": identifier})
    if doc is None and identifier:
        doc = await db.users.find_one({"email": identifier})
    if doc is None or not verify_password(payload.password, doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials — check username and password")
    _set_session_cookie(response, doc["id"])
    return doc_to_user(doc)


@router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/auth/me", response_model=UserOut)
async def me(user: UserOut = Depends(get_current_user)):
    return user


@router.post("/auth/password")
async def change_password(payload: PasswordChange, user: UserOut = Depends(get_current_user)):
    doc = await db.users.find_one({"id": user.id})
    if doc is None or not verify_password(payload.current_password, doc.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one(
        {"id": user.id},
        {"$set": {"password_hash": hash_password(payload.new_password)}},
    )
    return {"ok": True}
