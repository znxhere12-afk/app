from pydantic import BaseModel

from models.groups import Region
from models.payments import Pack


class Catalog(BaseModel):
    regions: list[Region]
    packs: list[Pack]
    binance_pay_id: str
