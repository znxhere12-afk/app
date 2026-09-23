from fastapi import APIRouter, Depends

from lib.db import db
from lib.deps import require_admin
from models.auth import UserOut
from models.settings import SupportLinks, SupportLinksUpdate

router = APIRouter(tags=["settings"])

_SETTINGS_KEY = "support_links"


async def _read_links() -> SupportLinks:
    doc = await db.app_settings.find_one({"key": _SETTINGS_KEY})
    if doc is None:
        return SupportLinks()
    return SupportLinks(
        whatsapp_url=doc.get("whatsapp_url") or SupportLinks().whatsapp_url,
        telegram_url=doc.get("telegram_url") or SupportLinks().telegram_url,
    )


@router.get("/support-links", response_model=SupportLinks)
async def support_links() -> SupportLinks:
    """Public — the login screen reads the current admin contact links."""
    return await _read_links()


@router.put("/admin/support-links", response_model=SupportLinks)
async def update_support_links(
    payload: SupportLinksUpdate, admin: UserOut = Depends(require_admin)
) -> SupportLinks:
    links = SupportLinks(
        whatsapp_url=payload.whatsapp_url.strip(),
        telegram_url=payload.telegram_url.strip(),
    )
    await db.app_settings.update_one(
        {"key": _SETTINGS_KEY},
        {"$set": {"key": _SETTINGS_KEY, **links.model_dump()}},
        upsert=True,
    )
    return links
