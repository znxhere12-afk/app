import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import { fmtTime } from "@/lib/format";
import type { UsagePoint } from "@/lib/types";

// Live slot-usage series — samples are appended server-side whenever active groups are polled.
export default function UsageTimelineCard() {
  const { data: points } = useQuery({
    queryKey: ["usage-timeline"],
    queryFn: () => apiGet<UsagePoint[]>("/usage/timeline"),
    refetchInterval: 15000,
    retry: false,
  });

  const series = (points ?? []).map((p) => ({
    label: fmtTime(p.at),
    usage: p.total_usage,
    limit: p.total_limit,
  }));
  const latest = series.at(-1);

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
      <CardContent>
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
                <XAxis
                  dataKey="label"
                  stroke="#94A3B8"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  stroke="#94A3B8"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1A1F29",
                    border: "1px solid #2E3646",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
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
      </CardContent>
    </Card>
  );
}
