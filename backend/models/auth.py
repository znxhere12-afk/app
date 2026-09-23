from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class SignupCreate(BaseModel):
    username: str = Field(min_length=3, max_length=24, pattern=r"^[A-Za-z0-9_]+$")
    password: str = Field(min_length=6, max_length=72)
    email: EmailStr | None = None
    # Optional admin-issued code; a valid one unlocks the account with bonus credits.
    access_code: str | None = Field(default=None, max_length=24)


class LoginCreate(BaseModel):
    identifier: str = Field(min_length=1, max_length=72)  # username or email
    password: str = Field(min_length=1, max_length=72)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=6, max_length=72)


class UserOut(BaseModel):
    id: str
    username: str
    email: str | None = None
    basic_credits: int
    premium_credits: int
    is_admin: bool = False
    created_at: datetime
    # Set once the Free Fire clan-war rules have been accepted.
    rules_accepted_at: datetime | None = None
    # True when the account was unlocked with an admin access code.
    unlocked: bool = False
