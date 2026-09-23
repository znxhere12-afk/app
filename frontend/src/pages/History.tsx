import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { Pause, Rocket, RotateCcw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import RegionComparisonCard from "@/components/RegionComparisonCard";
import { apiGet } from "@/lib/api";
import { fmtDateTime, fmtNumber } from "@/lib/format";
import type { GroupAction, GroupEvent } from "@/lib/types";

const ACTION_META: Record<GroupAction, { label: string; icon: LucideIcon; className: string }> = {
  launched: {
    label: "Launched",
    icon: Rocket,
    className: "border-[#22C55E]/40 bg-[#062E1A] text-[#4ADE80]",
  },
  stopped: {
    label: "Stopped",
    icon: Pause,
    className: "border-[#F97316]/40 bg-[#2A1C08] text-[#FB923C]",
  },
  deleted: {
    label: "Deleted",
    icon: Trash2,
    className: "border-[#EF4444]/40 bg-[#2A1215] text-[#F87171]",
  },
  refunded: {
    label: "Refunded",
    icon: RotateCcw,
    className: "border-[#38BDF8]/40 bg-[#0B2430] text-[#7DD3FC]",
  },
};

export default function History() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["history"],
    queryFn: () => apiGet<GroupEvent[]>("/history"),
    retry: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Group History</h1>
        <p className="text-sm text-muted-foreground">
          Full activity log — every launch, stop, delete and refund on your account.
        </p>
      </div>

      <RegionComparisonCard />

      <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
        <CardContent className="space-y-2 p-4">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (events ?? []).length === 0 ? (
            <p data-testid="no-history" className="py-8 text-center text-sm text-muted-foreground">
              No activity yet — launch your first group from the dashboard.
            </p>
          ) : (
            (events ?? []).map((e) => {
              const meta = ACTION_META[e.action];
              const Icon = meta.icon;
              return (
                <div
                  key={e.id}
                  data-testid={`history-row-${e.id}`}
                  className="flex items-start gap-3 rounded-xl border border-[#232834] bg-[#181D26] p-4 transition-colors duration-150 hover:border-[#22C55E]/30"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${meta.className}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        data-testid={`history-action-${e.id}`}
                        className={`capitalize ${meta.className}`}
                      >
                        {meta.label}
                      </Badge>
                      {e.auto && (
                        <Badge
                          variant="outline"
                          data-testid={`history-auto-${e.id}`}
                          className="border-[#38BDF8]/40 text-[#7DD3FC]"
                        >
                          auto
                        </Badge>
                      )}
                      <span className="font-mono text-sm font-bold">Clan {e.clan_id}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {e.region_name} · Server #{e.server_number ?? "—"} ·{" "}
                      <span className="font-mono">
                        {fmtNumber(e.cost)} {e.tier === "premium" ? "Premium" : "Basic"} credits
                      </span>
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {fmtDateTime(e.created_at)}
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
