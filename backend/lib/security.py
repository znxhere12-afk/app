"""Password hashing + session JWT helpers. Secret lives in backend/.env (SESSION_SECRET)."""

import os
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

COOKIE_NAME = "cn_session"
_ALGORITHM = "HS256"
_SESSION_TTL = timedelta(days=7)


def session_secret() -> str:
    return os.environ.get("SESSION_SECRET", "clan-nexus-dev-secret-change-me")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(password, password_hash)
    except Exception:
        return False


def create_session_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + _SESSION_TTL}
    return jwt.encode(payload, session_secret(), algorithm=_ALGORITHM)


def decode_session_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, session_secret(), algorithms=[_ALGORITHM])
        sub = payload.get("sub")
        return str(sub) if sub else None
    except JWTError:
        return None
