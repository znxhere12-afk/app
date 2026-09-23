import { useQuery } from "@tanstack/react-query";
import { History, RotateCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import { fmtDate, fmtNumber } from "@/lib/format";
import type { ClanCycleStat } from "@/lib/types";

// How many times each clan has been cycled and what those runs cost in total.
export default function RelaunchHistoryCard() {
  const { data: stats } = useQuery({
    queryKey: ["clan-stats"],
    queryFn: () => apiGet<ClanCycleStat[]>("/stats/clans"),
    retry: false,
  });

  const rows = stats ?? [];
  const totalCycles = rows.reduce((acc, r) => acc + r.cycles, 0);
  const totalSpend = rows.reduce((acc, r) => acc + r.total_cost, 0);

  return (
    <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 font-heading text-lg tracking-tight">
            <History className="h-4 w-4 text-primary" />
            Relaunch History
          </CardTitle>
          <CardDescription>
            Cycles per clan and the credits each one has consumed overall.
          </CardDescription>
        </div>
        {rows.length > 0 && (
          <span
            data-testid="relaunch-history-totals"
            className="rounded-full border border-[#22C55E]/40 bg-[#062E1A] px-3 py-1 font-mono text-xs font-semibold text-[#4ADE80]"
          >
            {fmtNumber(totalCycles)} cycles · {fmtNumber(totalSpend)} credits
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p
            data-testid="relaunch-history-empty"
            className="py-8 text-center text-sm text-muted-foreground"
          >
            No launches recorded yet — start a group to build the cycle history.
          </p>
        ) : (
          rows.map((r) => (
            <div
              key={r.clan_id}
              data-testid={`clan-cycle-row-${r.clan_id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#232834] bg-[#181D26] px-4 py-3 transition-colors duration-150 hover:border-[#22C55E]/30"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">Clan {r.clan_id}</span>
                  <Badge
                    variant="outline"
                    data-testid={`clan-cycles-${r.clan_id}`}
                    className="border-[#22C55E]/40 text-[#4ADE80]"
                  >
                    <RotateCw className="mr-1 h-3 w-3" />
                    {r.cycles}×
                  </Badge>
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {r.region_name} · first {fmtDate(r.first_launch)} · last {fmtDate(r.last_launch)}
                </p>
              </div>
              <div className="flex items-center gap-4 font-mono text-xs">
                {r.basic_cost > 0 && (
                  <span data-testid={`clan-basic-cost-${r.clan_id}`} className="text-[#4ADE80]">
                    {fmtNumber(r.basic_cost)} Basic
                  </span>
                )}
                {r.premium_cost > 0 && (
                  <span data-testid={`clan-premium-cost-${r.clan_id}`} className="text-[#FACC15]">
                    {fmtNumber(r.premium_cost)} Premium
                  </span>
                )}
                <span data-testid={`clan-total-cost-${r.clan_id}`} className="font-bold">
                  {fmtNumber(r.total_cost)} total
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
