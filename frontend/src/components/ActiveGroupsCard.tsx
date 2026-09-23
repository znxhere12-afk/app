import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { apiErrorMessage, fmtDateTime, fmtNumber } from "@/lib/format";
import { isAtCapacity, isNearCapacity } from "@/lib/slots";
import type { Group } from "@/lib/types";

function tierBadgeClass(tier: "basic" | "premium") {
  return tier === "premium"
    ? "border-[#FACC15]/40 text-[#FACC15]"
    : "border-[#22C55E]/40 text-[#4ADE80]";
}

// Live tracker for running groups — refresh pulls fresh telemetry, Stop/Delete act on a group.
export default function ActiveGroupsCard() {
  const qc = useQueryClient();
  const { data: groups, isFetching, refetch } = useQuery({
    queryKey: ["groups"],
    queryFn: () => apiGet<Group[]>("/groups"),
    refetchInterval: 15000,
  });

  // The backend rides freshly auto-stopped groups along for one response; show only the live ones.
  const running = (groups ?? []).filter((g) => g.status === "running");
  const autoStopped = (groups ?? []).filter((g) => g.status === "stopped" && g.auto_stopped);
  const announced = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (autoStopped.length === 0) return;
    let fresh = false;
    for (const g of autoStopped) {
      if (announced.current.has(g.id)) continue;
      announced.current.add(g.id);
      fresh = true;
      toast.warning(`Clan ${g.clan_id} auto-stopped at capacity`, {
        description: `All ${g.usage_limit} slots were used on server #${g.server_number} (${g.region_name}) — no slots wasted.`,
      });
    }
    if (fresh) void qc.invalidateQueries({ queryKey: ["history"] });
  }, [autoStopped, qc]);

  const totalUsage = running.reduce((acc, g) => acc + g.usage, 0);
  const totalLimit = running.reduce((acc, g) => acc + g.usage_limit, 0);

  const stop = useMutation({
    mutationFn: (id: string) => apiPost<Group>(`/groups/${id}/stop`),
    onSuccess: (g) => {
      toast.success("Group stopped", { description: `Clan ${g.clan_id} is no longer running.` });
      void qc.invalidateQueries({ queryKey: ["groups"] });
      void qc.invalidateQueries({ queryKey: ["history"] });
    },
    onError: (e) => toast.error("Could not stop group", { description: apiErrorMessage(e) }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/groups/${id}`),
    onSuccess: () => {
      toast.success("Group deleted");
      void qc.invalidateQueries({ queryKey: ["groups"] });
      void qc.invalidateQueries({ queryKey: ["history"] });
    },
    onError: (e) => toast.error("Could not delete group", { description: apiErrorMessage(e) }),
  });

  return (
    <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="font-heading text-lg tracking-tight">My Active Groups</CardTitle>
          <CardDescription>
            <span data-testid="active-groups-usage-counter" className="font-mono">
              {fmtNumber(totalUsage)} / {fmtNumber(totalLimit)}
            </span>{" "}
            slots in use
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          data-testid="refresh-groups-btn"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {running.length === 0 ? (
          <p data-testid="no-active-groups" className="py-8 text-center text-sm text-muted-foreground">
            No active groups — launch one above.
          </p>
        ) : (
          running.map((g) => {
            const pct = Math.min(100, Math.round((g.usage / g.usage_limit) * 100));
            const full = isAtCapacity(g);
            const near = isNearCapacity(g);
            const barClass = full ? "bg-[#EF4444]" : near ? "bg-[#F97316]" : "bg-primary";
            return (
              <div
                key={g.id}
                data-testid={`active-group-${g.id}`}
                className="space-y-3 rounded-xl border border-[#232834] bg-[#181D26] p-4 transition-colors duration-150 hover:border-[#22C55E]/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-base font-bold">Clan {g.clan_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.region_name} · Server #{g.server_number} · launched {fmtDateTime(g.launched_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      data-testid={`active-group-tier-${g.id}`}
                      className={tierBadgeClass(g.tier)}
                    >
                      {g.tier === "premium" ? "Premium" : "Basic"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Stop group ${g.clan_id}`}
                      data-testid={`stop-group-btn-${g.id}`}
                      disabled={stop.isPending}
                      onClick={() => stop.mutate(g.id)}
                    >
                      <Pause className="h-4 w-4 text-[#FB923C]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete group ${g.clan_id}`}
                      data-testid={`delete-group-btn-${g.id}`}
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(g.id)}
                    >
                      <Trash2 className="h-4 w-4 text-[#F87171]" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span data-testid={`group-usage-${g.id}`} className="font-mono">
                      {g.usage} / {g.usage_limit} slots
                    </span>
                    <span
                      className={`font-mono ${
                        full ? "text-[#F87171]" : near ? "text-[#FB923C]" : ""
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1E232F]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barClass}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
        <p className="pt-1 text-center text-[11px] text-muted-foreground">
          Groups stop automatically the moment they fill, so no slots are wasted.
        </p>
      </CardContent>
    </Card>
  );
}
