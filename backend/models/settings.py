from pydantic import BaseModel, Field


class SupportLinks(BaseModel):
    """Admin-editable contact links shown on the login screen."""

    whatsapp_url: str = Field(default="https://wa.me/8801700000000", max_length=500)
    telegram_url: str = Field(default="https://t.me/clannexus_admin", max_length=500)


class SupportLinksUpdate(BaseModel):
    whatsapp_url: str = Field(min_length=1, max_length=500)
    telegram_url: str = Field(min_length=1, max_length=500)
