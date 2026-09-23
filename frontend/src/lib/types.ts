// Hand-written mirrors of the backend's Pydantic models — nothing infers across the
// HTTP boundary, so keep this file in sync with backend/models/*.py in the same edit.

export type CreditType = "basic" | "premium";
export type PaymentStatus = "pending" | "approved" | "rejected" | "refunded";
export type GroupStatus = "running" | "stopped" | "refunded";
export type GroupAction = "launched" | "stopped" | "deleted" | "refunded";
export type CouponStatus = "active" | "redeemed" | "expired";

export interface User {
  id: string;
  username: string;
  email: string | null;
  basic_credits: number;
  premium_credits: number;
  is_admin: boolean;
  created_at: string;
  rules_accepted_at: string | null;
  unlocked: boolean;
}

export interface SupportLinks {
  whatsapp_url: string;
  telegram_url: string;
}

export interface Plan {
  id: string;
  name: string;
  account_count: number;
  duration_minutes: number;
  extra_cost: number;
}

export interface PlayerAccount {
  id: string;
  group_id: string;
  user_id: string;
  slot: number;
  ign: string;
  uid: string;
  clan_id: string;
  status: "online" | "offline";
  join_request: "sent" | "accepted";
  cycles: number;
  created_at: string;
}

export interface AccessCode {
  id: string;
  code: string;
  created_by: string;
  note: string | null;
  used_by: string | null;
  used_by_username: string | null;
  created_at: string;
  used_at: string | null;
}

export interface ClanCycleStat {
  clan_id: string;
  region_name: string;
  cycles: number;
  total_cost: number;
  basic_cost: number;
  premium_cost: number;
  first_launch: string;
  last_launch: string;
}

export interface Region {
  id: string;
  name: string;
  tier: CreditType;
  cost: number;
}

export interface Pack {
  id: string;
  credit_type: CreditType;
  amount_usd: number;
  credits: number;
}

export interface Catalog {
  regions: Region[];
  packs: Pack[];
  plans: Plan[];
  binance_pay_id: string;
  game: string;
  clan_war_rules: string[];
}

export interface Payment {
  id: string;
  user_id: string;
  username: string;
  pack_id: string;
  amount_usd: number;
  credit_type: CreditType;
  credits: number;
  binance_order_id: string;
  status: PaymentStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface Group {
  id: string;
  user_id: string;
  username: string;
  clan_id: string;
  region_id: string;
  region_name: string;
  tier: CreditType;
  cost: number;
  server_number: number;
  usage: number;
  usage_limit: number;
  status: GroupStatus;
  launched_at: string;
  game: string;
  plan_id: string;
  plan_name: string;
  account_count: number;
  duration_minutes: number;
  expires_at: string | null;
  auto_stopped: boolean;
  stop_reason: string | null;
  relaunched: boolean;
}

export interface GroupEvent {
  id: string;
  user_id: string;
  action: GroupAction;
  clan_id: string;
  region_name: string;
  tier: CreditType;
  server_number: number | null;
  cost: number;
  created_at: string;
  auto: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  credit_type: CreditType;
  amount: number;
  creator_id: string;
  creator_username: string;
  status: CouponStatus;
  redeemed_by: string | null;
  redeemed_by_username: string | null;
  created_at: string;
  redeemed_at: string | null;
  expires_at: string | null;
}

export interface Transfer {
  id: string;
  from_user_id: string;
  from_username: string;
  to_user_id: string;
  to_username: string;
  credit_type: CreditType;
  amount: number;
  note: string | null;
  created_at: string;
  direction: "in" | "out";
}

export interface UsagePoint {
  at: string;
  total_usage: number;
  total_limit: number;
  active_groups: number;
}

export interface GroupUsagePoint {
  at: string;
  usage: Record<string, number>;
}

export interface GroupTimeline {
  clans: string[];
  points: GroupUsagePoint[];
}

export interface RegionStat {
  region_name: string;
  tier: CreditType;
  launches: number;
  total_cost: number;
}
