import { useQuery } from "@tanstack/react-query";
import { Globe2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import { fmtNumber } from "@/lib/format";
import type { RegionStat } from "@/lib/types";

// Trailing-30-day launch mix: which regions a commander actually uses, and what they cost.
export default function RegionComparisonCard() {
  const { data: stats } = useQuery({
    queryKey: ["region-stats"],
    queryFn: () => apiGet<RegionStat[]>("/stats/regions"),
    retry: false,
  });

  const rows = stats ?? [];
  const totalLaunches = rows.reduce((acc, r) => acc + r.launches, 0);
  const basicSpend = rows
    .filter((r) => r.tier === "basic")
    .reduce((acc, r) => acc + r.total_cost, 0);
  const premiumSpend = rows
    .filter((r) => r.tier === "premium")
    .reduce((acc, r) => acc + r.total_cost, 0);
  const favourite = rows[0] ?? null;

  return (
    <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 font-heading text-lg tracking-tight">
            <Globe2 className="h-4 w-4 text-sky-400" />
            Region Comparison
          </CardTitle>
          <CardDescription>
            Launches and credit spend per region over the last 30 days.
          </CardDescription>
        </div>
        {favourite && (
          <span
            data-testid="region-favourite"
            className="rounded-full border border-[#38BDF8]/40 bg-[#0B2430] px-3 py-1 text-xs font-semibold text-[#7DD3FC]"
          >
            Top: {favourite.region_name}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p
            data-testid="region-stats-empty"
            className="py-10 text-center text-sm text-muted-foreground"
          >
            No launches in the last 30 days — start a group to build this breakdown.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-[#232834] bg-[#181D26] px-3 py-2">
                <p data-testid="region-total-launches" className="font-mono text-lg font-bold">
                  {fmtNumber(totalLaunches)}
                </p>
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Launches
                </p>
              </div>
              <div className="rounded-lg border border-[#232834] bg-[#181D26] px-3 py-2">
                <p data-testid="region-basic-spend" className="font-mono text-lg font-bold text-[#4ADE80]">
                  {fmtNumber(basicSpend)}
                </p>
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Basic spent
                </p>
              </div>
              <div className="rounded-lg border border-[#232834] bg-[#181D26] px-3 py-2">
                <p data-testid="region-premium-spend" className="font-mono text-lg font-bold text-[#FACC15]">
                  {fmtNumber(premiumSpend)}
                </p>
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Premium spent
                </p>
              </div>
            </div>

            <div data-testid="region-comparison-chart" className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="#232834" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="region_name"
                    stroke="#94A3B8"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(148,163,184,0.08)" }}
                    contentStyle={{
                      background: "#1A1F29",
                      border: "1px solid #2E3646",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#94A3B8" }}
                    formatter={(value: number) => [`${value} launches`, "Launches"]}
                  />
                  <Bar dataKey="launches" radius={[6, 6, 0, 0]} maxBarSize={72}>
                    {rows.map((r) => (
                      <Cell
                        key={r.region_name}
                        fill={r.tier === "premium" ? "#FACC15" : "#22C55E"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {rows.map((r) => (
                <div
                  key={r.region_name}
                  data-testid={`region-stat-row-${r.region_name}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#232834] bg-[#181D26] px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{r.region_name}</span>
                    <Badge
                      variant="outline"
                      className={
                        r.tier === "premium"
                          ? "border-[#FACC15]/40 text-[#FACC15]"
                          : "border-[#22C55E]/40 text-[#4ADE80]"
                      }
                    >
                      {r.tier === "premium" ? "Premium" : "Basic"}
                    </Badge>
                  </span>
                  <span className="flex items-center gap-4 font-mono text-xs">
                    <span data-testid={`region-launches-${r.region_name}`}>
                      {r.launches} launch{r.launches > 1 ? "es" : ""}
                    </span>
                    <span
                      data-testid={`region-cost-${r.region_name}`}
                      className={r.tier === "premium" ? "text-[#FACC15]" : "text-[#4ADE80]"}
                    >
                      {fmtNumber(r.total_cost)} credits
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
