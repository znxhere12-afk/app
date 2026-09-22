import type { Group } from "@/lib/types";

// A clan is "near capacity" once it has burned 90% of its slots (9 of 10, 90 of 100, …).
export const SLOT_ALERT_RATIO = 0.9;

export function usageRatio(g: Group): number {
  return g.usage_limit > 0 ? g.usage / g.usage_limit : 0;
}

export function isNearCapacity(g: Group): boolean {
  return usageRatio(g) >= SLOT_ALERT_RATIO;
}

export function isAtCapacity(g: Group): boolean {
  return g.usage >= g.usage_limit;
}
