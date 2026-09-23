from pydantic import BaseModel

from models.groups import Plan, Region
from models.payments import Pack


class Catalog(BaseModel):
    regions: list[Region]
    packs: list[Pack]
    plans: list[Plan]
    binance_pay_id: str
    game: str
    clan_war_rules: list[str]
