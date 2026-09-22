import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet } from "@/lib/api";
import { fmtTime } from "@/lib/format";
import type { GroupTimeline, UsagePoint } from "@/lib/types";

// One neon-family colour per clan line, cycled if a commander runs more than six groups.
const CLAN_COLORS = ["#22C55E", "#FACC15", "#38BDF8", "#FB923C", "#A78BFA", "#F87171"];

// Live slot-usage series — samples are appended server-side whenever active groups are polled.
export default function UsageTimelineCard() {
  const { data: points } = useQuery({
    queryKey: ["usage-timeline"],
    queryFn: () => apiGet<UsagePoint[]>("/usage/timeline"),
    refetchInterval: 15000,
    retry: false,
  });
  const { data: perClan } = useQuery({
    queryKey: ["usage-timeline-groups"],
    queryFn: () => apiGet<GroupTimeline>("/usage/timeline/groups"),
    refetchInterval: 15000,
    retry: false,
  });

  const series = (points ?? []).map((p) => ({
    label: fmtTime(p.at),
    usage: p.total_usage,
    limit: p.total_limit,
  }));
  const latest = series.at(-1);

  const clans = perClan?.clans ?? [];
  const clanSeries = (perClan?.points ?? []).map((p) => {
    const row: Record<string, string | number> = { label: fmtTime(p.at) };
    for (const clan of clans) row[clan] = p.usage[clan] ?? 0;
    return row;
  });

  // Fastest burner: highest slot count in the newest per-clan sample.
  const newest = clanSeries.at(-1);
  const leader = newest
    ? clans.reduce<{ clan: string; usage: number } | null>((best, clan) => {
        const usage = Number(newest[clan] ?? 0);
        return best === null || usage > best.usage ? { clan, usage } : best;
      }, null)
    : null;

  const axisProps = {
    stroke: "#94A3B8",
    tick: { fontSize: 11 },
    tickLine: false,
    axisLine: false,
  } as const;
  const tooltipStyle = {
    background: "#1A1F29",
    border: "1px solid #2E3646",
    borderRadius: 12,
    fontSize: 12,
  } as const;

  return (
    <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 font-heading text-lg tracking-tight">
            <Activity className="h-4 w-4 text-primary" />
            Usage Timeline
          </CardTitle>
          <CardDescription>
            Slots consumed across your running groups, sampled every refresh.
          </CardDescription>
        </div>
        {latest && (
          <span
            data-testid="usage-timeline-latest"
            className="rounded-full border border-[#22C55E]/40 bg-[#062E1A] px-3 py-1 font-mono text-xs font-semibold text-[#4ADE80]"
          >
            {latest.usage} / {latest.limit}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs defaultValue="total">
          <TabsList data-testid="usage-timeline-tabs">
            <TabsTrigger value="total" data-testid="usage-tab-total">
              Total
            </TabsTrigger>
            <TabsTrigger value="per-clan" data-testid="usage-tab-per-clan">
              Per Clan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="total" className="mt-3">
            {series.length < 2 ? (
              <p
                data-testid="usage-timeline-empty"
                className="py-12 text-center text-sm text-muted-foreground"
              >
                Collecting telemetry — refresh your active groups a few times to plot the curve.
              </p>
            ) : (
              <div data-testid="usage-timeline-chart" className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                    <defs>
                      <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22C55E" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#22C55E" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#232834" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" minTickGap={24} {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: "#94A3B8" }}
                      formatter={(value: number, name: string) => [
                        `${value} slots`,
                        name === "usage" ? "In use" : "Capacity",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="limit"
                      stroke="#2E3646"
                      strokeDasharray="4 4"
                      fill="none"
                    />
                    <Area
                      type="monotone"
                      dataKey="usage"
                      stroke="#22C55E"
                      strokeWidth={2}
                      fill="url(#usageFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          <TabsContent value="per-clan" className="mt-3 space-y-3">
            {clanSeries.length < 2 || clans.length === 0 ? (
              <p
                data-testid="per-clan-timeline-empty"
                className="py-12 text-center text-sm text-muted-foreground"
              >
                No per-clan samples yet — hit Refresh on My Active Groups a couple of times.
              </p>
            ) : (
              <>
                {leader && (
                  <p
                    data-testid="per-clan-leader"
                    className="text-xs text-muted-foreground"
                  >
                    Fastest burner:{" "}
                    <span className="font-mono font-semibold text-[#FACC15]">
                      Clan {leader.clan}
                    </span>{" "}
                    at {leader.usage} slots
                  </p>
                )}
                <div data-testid="per-clan-timeline-chart" className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={clanSeries} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                      <CartesianGrid stroke="#232834" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" minTickGap={24} {...axisProps} />
                      <YAxis {...axisProps} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelStyle={{ color: "#94A3B8" }}
                        formatter={(value: number, name: string) => [
                          `${value} slots`,
                          `Clan ${name}`,
                        ]}
                      />
                      <Legend
                        formatter={(value: string) => `Clan ${value}`}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                      {clans.map((clan, i) => (
                        <Line
                          key={clan}
                          type="monotone"
                          dataKey={clan}
                          stroke={CLAN_COLORS[i % CLAN_COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
