import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import { isAtCapacity, isNearCapacity } from "@/lib/slots";
import type { Group } from "@/lib/types";

// Warns the moment a running clan crosses its slot threshold. Reads the same ["groups"]
// cache entry the active-groups list polls, so no extra request and no extra endpoint.
export default function SlotAlertsCard() {
  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: () => apiGet<Group[]>("/groups"),
    refetchInterval: 15000,
    retry: false,
  });

  const critical = (groups ?? []).filter(isNearCapacity);
  // Ids already toasted, so a steady-state alert doesn't re-toast on every poll.
  const announced = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const g of critical) {
      if (announced.current.has(g.id)) continue;
      announced.current.add(g.id);
      toast.warning(`Clan ${g.clan_id} is near capacity`, {
        description: `${g.usage} / ${g.usage_limit} slots used on server #${g.server_number} (${g.region_name}).`,
      });
    }
    // drop ids that fell back below the line so a later re-crossing toasts again
    const stillCritical = new Set(critical.map((g) => g.id));
    for (const id of announced.current) {
      if (!stillCritical.has(id)) announced.current.delete(id);
    }
  }, [critical]);

  if (critical.length === 0) return null;

  return (
    <Card
      data-testid="slot-alerts-card"
      className="rounded-xl border-[#F97316]/50 bg-[#2A1C08]/40 shadow-xl backdrop-blur-sm"
    >
      <CardContent className="space-y-3 p-5">
        <p
          data-testid="slot-alerts-heading"
          className="flex items-center gap-2 font-heading text-sm font-bold tracking-tight text-[#FB923C]"
        >
          <TriangleAlert className="h-4 w-4" />
          {critical.length} clan{critical.length > 1 ? "s" : ""} near slot capacity
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {critical.map((g) => {
            const pct = Math.min(100, Math.round((g.usage / g.usage_limit) * 100));
            const full = isAtCapacity(g);
            return (
              <div
                key={g.id}
                data-testid={`slot-alert-${g.clan_id}`}
                className="space-y-2 rounded-lg border border-[#F97316]/30 bg-[#15181E] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold">Clan {g.clan_id}</span>
                  <span
                    data-testid={`slot-alert-usage-${g.clan_id}`}
                    className={`font-mono text-xs font-semibold ${
                      full ? "text-[#F87171]" : "text-[#FB923C]"
                    }`}
                  >
                    {g.usage} / {g.usage_limit} slots
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1E232F]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      full ? "bg-[#EF4444]" : "bg-[#F97316]"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {full
                    ? "Capacity reached — stop the group or launch a fresh one."
                    : `${g.usage_limit - g.usage} slots left · ${g.region_name} · server #${g.server_number}`}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
