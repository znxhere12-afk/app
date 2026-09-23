import { useQuery } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { useRelaunchGroup } from "@/lib/useRelaunchGroup";
import type { Group } from "@/lib/types";

// One-tap restart for clans that filled up, on the region they were already running.
export default function RelaunchCard() {
  const { data: me } = useMe();
  const relaunch = useRelaunchGroup();
  const { data: candidates } = useQuery({
    queryKey: ["groups-relaunchable"],
    queryFn: () => apiGet<Group[]>("/groups/relaunchable"),
    refetchInterval: 15000,
    retry: false,
  });

  const rows = candidates ?? [];
  if (rows.length === 0) return null;

  return (
    <Card
      data-testid="relaunch-card"
      className="rounded-xl border-[#22C55E]/40 bg-[#062E1A]/30 shadow-xl backdrop-blur-sm"
    >
      <CardContent className="space-y-3 p-5">
        <p
          data-testid="relaunch-heading"
          className="flex items-center gap-2 font-heading text-sm font-bold tracking-tight text-[#4ADE80]"
        >
          <RotateCw className="h-4 w-4" />
          {rows.length} clan{rows.length > 1 ? "s" : ""} finished — relaunch in one tap
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {rows.map((g) => {
            const balance =
              g.tier === "basic" ? (me?.basic_credits ?? 0) : (me?.premium_credits ?? 0);
            const affordable = balance >= g.cost;
            return (
              <div
                key={g.id}
                data-testid={`relaunch-row-${g.clan_id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#22C55E]/25 bg-[#15181E] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold">Clan {g.clan_id}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Filled {g.usage_limit}/{g.usage_limit} · {g.region_name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      g.tier === "premium"
                        ? "border-[#FACC15]/40 text-[#FACC15]"
                        : "border-[#22C55E]/40 text-[#4ADE80]"
                    }
                  >
                    {g.cost} {g.tier === "premium" ? "Premium" : "Basic"}
                  </Badge>
                  <Button
                    size="sm"
                    data-testid={`relaunch-btn-${g.clan_id}`}
                    disabled={!affordable || relaunch.isPending}
                    onClick={() => relaunch.mutate(g.id)}
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    {affordable ? "Relaunch" : "Low credits"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Same region and Clan ID as before — the cost is charged again on launch.
        </p>
      </CardContent>
    </Card>
  );
}
