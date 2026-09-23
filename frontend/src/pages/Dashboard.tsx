import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { fmtNumber } from "@/lib/format";
import { useMe } from "@/lib/useMe";
import ActiveGroupsCard from "@/components/ActiveGroupsCard";
import BuyCreditsCard from "@/components/BuyCreditsCard";
import CreditTransferCard from "@/components/CreditTransferCard";
import ExpiryRemindersCard from "@/components/ExpiryRemindersCard";
import ClanWarRulesCard from "@/components/ClanWarRulesCard";
import LaunchGroupCard from "@/components/LaunchGroupCard";
import RelaunchCard from "@/components/RelaunchCard";
import SlotAlertsCard from "@/components/SlotAlertsCard";
import UsageTimelineCard from "@/components/UsageTimelineCard";
import type { Group } from "@/lib/types";

function Stat({ label, value, testid }: { label: string; value: string; testid: string }) {
  return (
    <div className="rounded-xl border border-[#232834] bg-[#15181E]/95 p-4 shadow-xl backdrop-blur-sm transition-colors duration-150 hover:border-[#22C55E]/30">
      <p data-testid={testid} className="font-mono text-2xl font-bold tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const { data: me } = useMe();
  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: () => apiGet<Group[]>("/groups"),
    refetchInterval: 15000,
  });

  const activeCount = groups?.filter((g) => g.status === "running").length ?? 0;
  const slotsInUse =
    groups?.filter((g) => g.status === "running").reduce((acc, g) => acc + g.usage, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Command Center</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {me?.username ?? "commander"} — launch groups and track your credits.
        </p>
      </div>

      <RelaunchCard />
      <SlotAlertsCard />
      <ExpiryRemindersCard />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4" data-testid="stats-row">
        <Stat label="Basic Credits" value={fmtNumber(me?.basic_credits ?? 0)} testid="stat-basic-credits" />
        <Stat label="Premium Credits" value={fmtNumber(me?.premium_credits ?? 0)} testid="stat-premium-credits" />
        <Stat label="Active Groups" value={String(activeCount)} testid="stat-active-groups" />
        <Stat label="Slots In Use" value={fmtNumber(slotsInUse)} testid="stat-slots-in-use" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <LaunchGroupCard />
          <UsageTimelineCard />
          <ActiveGroupsCard />
        </div>
        <div className="space-y-6 lg:col-span-5">
          <BuyCreditsCard />
          <CreditTransferCard />
          <ClanWarRulesCard />
        </div>
      </div>
    </div>
  );
}
