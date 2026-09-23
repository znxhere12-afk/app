# Clan Nexus — App Spec

Dark-themed gaming & clan management dashboard (Clan Nexus). FastAPI + MongoDB backend,
Vite + React 19 + Tailwind v4 + shadcn/ui frontend. Theme: #0D0F12 background, #15181E cards,
neon green #22C55E + yellow #FACC15 accents. Fonts: Outfit (headings), Plus Jakarta Sans (body),
JetBrains Mono (IDs/numbers). Dark-by-default (`class="dark"` on html).

## Domain model (Mongo collections, string uuid4 ids, aware-UTC datetimes)
- `users` — username (+username_lower unique), email (unique sparse), password_hash (pbkdf2_sha256),
  basic_credits, premium_credits, is_admin. New signups get 200 Basic + 50 Premium welcome credits.
- `payments` — Binance deposit claims: pack_id, amount_usd, credit_type (basic|premium), credits,
  binance_order_id, status pending→approved/rejected/refunded, reviewed_at/by. Credits land ONLY on
  admin approval.
- `groups` — launched service runs: clan_id (4–18 digits), region, tier, cost, server_number (1–64),
  usage/usage_limit (100), status running→stopped/refunded, `auto_stopped` bool.
  **Auto-stop at capacity**: GET /api/groups ticks usage forward (simulated telemetry: +0–3 per
  read) and any group reaching its usage_limit is stopped right there — status `stopped`,
  `auto_stopped=true`, plus a `stopped` group_event with `auto=true`. A freshly auto-stopped group
  rides along in that ONE response (later calls query status="running" only) so the client can
  announce it without guessing; the frontend renders only `status === "running"` and toasts the
  auto-stopped ones.
- `group_events` — audit log: action launched|stopped|deleted|refunded + clan_id, region, tier,
  server_number, cost, `auto` bool (true only for capacity auto-stops, shown as an "auto" badge).
- `coupons` — code (NX-XXXXXXXX unique), credit_type, amount, creator, status active→redeemed,
  redeemed_by/at, `expires_at` (nullable). Creating a coupon deducts the amount from the creator's
  balance; admin minting is system-funded (no deduction). **Expiry**: `expires_at` is set from
  `expires_in_days` (1–365, null = never). Status `expired` is DERIVED ON READ (routers/coupons.py
  `to_coupon`) — never stored — and redeem rejects a lapsed code with 400 "This coupon code has
  expired", so codes die without a cron job.
- `transfers` — member-to-member credit sends: from/to user_id + username, credit_type, amount,
  optional note. Sender is debited with a conditional update (400 on insufficient), recipient
  credited. `direction` ("in"/"out") is computed per viewer, never stored.
- `usage_snapshots` — slot-usage timeline samples {user_id, at, total_usage, total_limit,
  active_groups, groups:[{clan_id, usage}]}. Appended by GET /api/groups, throttled to one sample
  per 20s per user. The `groups` array powers the per-clan chart view.

## Catalog (backend/lib/catalog.py)
- Regions: Bangladesh 100 Basic · India 120 Basic · Indonesia 110 Basic · Europe 150 Premium ·
  USA 160 Premium · Singapore 140 Premium.
- Packs: $5=500 Basic, $10=1050 Basic, $20=2200 Basic, $5=250 Premium, $10=520 Premium, $20=1100 Premium.
- Dummy Binance Pay ID: env `BINANCE_PAY_ID` (default 482917365). Session secret: env `SESSION_SECRET`.

## API (all on api_router under /api)
- /auth/signup POST · /auth/login POST (identifier = username OR email) · /auth/logout POST ·
  /auth/me GET · /auth/password POST (change password). Session = JWT in httpOnly cookie `cn_session`.
- /catalog GET (regions, packs, binance_pay_id) — authed.
- /payments GET/POST (submit claim → pending) — authed.
- /groups GET (active + usage tick + timeline snapshot) · /groups POST (launch; 400 on insufficient
  tier credits) · /groups/{id}/stop POST · /groups/{id} DELETE · /history GET ·
  /usage/timeline GET (oldest-first UsagePoint series, last 60 samples) ·
  /usage/timeline/groups GET (GroupTimeline: clans[] + points[{at, usage{clan_id:slots}}]) ·
  /stats/regions GET (RegionStat[]: launches + total_cost per region, trailing 30 days,
  sorted by launches desc) — authed.
- /coupons POST (create, funded by balance, optional expires_in_days) · /coupons/redeem POST
  (400 on expired/invalid) · /coupons/mine GET · /coupons/redeemed GET ·
  /coupons/expiring GET (own active codes lapsing within 7 days) — authed.
- /transfers GET (both directions, direction stamped) · /transfers POST (400 self-send or
  insufficient, 404 unknown recipient) — authed.
- /admin/* (require_admin): GET users · POST users/{id}/credits (delta, floors at 0) · GET payments ·
  POST payments/{id}/approve|reject|refund · GET groups · POST groups/{id}/refund ·
  GET/POST coupons (mint).

## Frontend
- Routes: /login · / (Dashboard) · /transactions · /coupons · /history · /settings · /admin (admin-only).
- RequireAuth/RequireAdmin gate on the shared `["me"]` query (lib/useMe.ts); lib/session.ts owns cache
  lifecycle (beginSession/endSession with hard redirect).
- Header: sticky, brand, nav, live Basic/Premium balance pills, username, logout.
- Dashboard: SlotAlertsCard (clans at ≥90% of their slot limit — 9/10, 90/100 — with a one-shot
  sonner warning per crossing; hidden when none) + ExpiryRemindersCard banner (own coupons lapsing
  within 7 days, shown only when any exist) + stats row + LaunchGroupCard (region dropdown with
  tier tags + cost, Clan ID input, Start button disabled on insufficient credits with warning) +
  UsageTimelineCard (Total tab = area chart of slots vs capacity; Per Clan tab = one line per clan
  with a "fastest burner" callout; polls every 15s) + ActiveGroupsCard (refresh, usage counter
  0/100 whose meter turns orange at ≥90% and red at capacity, stop/delete) + collapsible
  BuyCreditsCard (pack grid → Binance Pay ID + copy → Order ID → submit) + CreditTransferCard
  (recipient/type/amount/note form + in-out transfer log).
- `frontend/src/lib/slots.ts` owns the capacity threshold (`SLOT_ALERT_RATIO = 0.9`) plus
  `usageRatio`/`isNearCapacity`/`isAtCapacity`, so the alert card and the active-groups meter
  cannot drift. Slot alerts are derived from the existing `["groups"]` query — no extra endpoint.
- History page: RegionComparisonCard (30-day launch/spend totals, tier-coloured bar chart, per-region
  rows) above the colour-coded activity feed.
- Coupons page: create form carries an "Expires After" select (never / 1 / 7 / 30 / 90 days);
  generated list shows the expiry date and an active/redeemed/expired badge.
- All interactive elements carry kebab-case data-testids.

## Auth / credentials
- Login by username or email + password; admin flagged in DB (is_admin), sees nav Admin link + /admin.
- Credentials in memory/test_credentials.md. Seed via `cd /app/backend && python seed.py` (idempotent).
