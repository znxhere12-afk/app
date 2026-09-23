"""Static catalog: launch regions with credit costs, top-up packs, Binance Pay ID."""

import os
from typing import Literal

Tier = Literal["basic", "premium"]

GAME = "Free Fire"

# Clan-war terms a commander must accept once before launching.
CLAN_WAR_RULES: list[str] = [
    "Only Free Fire clan-war accounts may be launched — no other game is supported.",
    "One Clan ID per launch. The generated player accounts send their join request to that clan only.",
    "Player accounts cycle online/offline 2–3 times and stay active for the plan's time limit.",
    "Credits are charged at launch. A run that fills its slots or hits its time limit stops automatically.",
    "Sharing generated account IDs outside your clan is not allowed and may forfeit your credits.",
]

# Each plan decides how many Free Fire player accounts a run creates and how long it lives.
PLANS: list[dict] = [
    {"id": "duo-2", "name": "Duo", "account_count": 2, "duration_minutes": 30, "extra_cost": 0},
    {"id": "squad-4", "name": "Squad", "account_count": 4, "duration_minutes": 60, "extra_cost": 40},
    {"id": "war-6", "name": "Clan War", "account_count": 6, "duration_minutes": 120, "extra_cost": 90},
]

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


def find_plan(plan_id: str) -> dict | None:
    return next((p for p in PLANS if p["id"] == plan_id), None)
