"""Static catalog: launch regions with credit costs, top-up packs, Binance Pay ID."""

import os
from typing import Literal

Tier = Literal["basic", "premium"]

REGIONS: list[dict] = [
    {"id": "bangladesh", "name": "Bangladesh", "tier": "basic", "cost": 100},
    {"id": "india", "name": "India", "tier": "basic", "cost": 120},
    {"id": "indonesia", "name": "Indonesia", "tier": "basic", "cost": 110},
    {"id": "europe", "name": "Europe", "tier": "premium", "cost": 150},
    {"id": "usa", "name": "USA", "tier": "premium", "cost": 160},
    {"id": "singapore", "name": "Singapore", "tier": "premium", "cost": 140},
]

PACKS: list[dict] = [
    {"id": "basic-500", "credit_type": "basic", "amount_usd": 5, "credits": 500},
    {"id": "basic-1050", "credit_type": "basic", "amount_usd": 10, "credits": 1050},
    {"id": "basic-2200", "credit_type": "basic", "amount_usd": 20, "credits": 2200},
    {"id": "premium-250", "credit_type": "premium", "amount_usd": 5, "credits": 250},
    {"id": "premium-520", "credit_type": "premium", "amount_usd": 10, "credits": 520},
    {"id": "premium-1100", "credit_type": "premium", "amount_usd": 20, "credits": 1100},
]


def binance_pay_id() -> str:
    return os.environ.get("BINANCE_PAY_ID", "482917365")


def find_region(region_id: str) -> dict | None:
    return next((r for r in REGIONS if r["id"] == region_id), None)


def find_pack(pack_id: str) -> dict | None:
    return next((p for p in PACKS if p["id"] == pack_id), None)
