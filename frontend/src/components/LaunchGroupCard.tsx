import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Rocket } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiGet, apiPost } from "@/lib/api";
import { apiErrorMessage } from "@/lib/format";
import { useMe } from "@/lib/useMe";
import type { Catalog, Group } from "@/lib/types";

function tierLabel(tier: "basic" | "premium") {
  return tier === "premium" ? "Premium" : "Basic";
}

// Launch station: region dropdown (tier-tagged), Clan ID, cost-aware Start button.
export default function LaunchGroupCard() {
  const [regionId, setRegionId] = useState("");
  const [clanId, setClanId] = useState("");
  const [planId, setPlanId] = useState("squad-4");
  const [accepted, setAccepted] = useState(false);
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: catalog } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => apiGet<Catalog>("/catalog"),
    retry: false,
  });

  const region = catalog?.regions.find((r) => r.id === regionId) ?? null;
  const plan = catalog?.plans.find((p) => p.id === planId) ?? null;
  const totalCost = region ? region.cost + (plan?.extra_cost ?? 0) : 0;
  const balance = !region
    ? 0
    : region.tier === "basic"
      ? (me?.basic_credits ?? 0)
      : (me?.premium_credits ?? 0);
  const insufficient = region !== null && balance < totalCost;
  const clanValid = /^\d{4,18}$/.test(clanId.trim());
  const rulesOk = Boolean(me?.rules_accepted_at) || accepted;

  const launch = useMutation({
    mutationFn: (payload: {
      region_id: string;
      clan_id: string;
      plan_id: string;
      accept_rules: boolean;
    }) => apiPost<Group>("/groups", payload),
    onSuccess: (g) => {
      toast.success("Group launched", {
        description: `${g.account_count} ${g.game} accounts joining clan ${g.clan_id} on server #${g.server_number} for ${g.duration_minutes} min · −${g.cost} ${tierLabel(g.tier)} credits.`,
      });
      setClanId("");
      void qc.invalidateQueries({ queryKey: ["me"] });
      void qc.invalidateQueries({ queryKey: ["groups"] });
      void qc.invalidateQueries({ queryKey: ["history"] });
      void qc.invalidateQueries({ queryKey: ["clan-stats"] });
    },
    onError: (e) => toast.error("Launch failed", { description: apiErrorMessage(e) }),
  });

  return (
    <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-lg tracking-tight">
          <Rocket className="h-4 w-4 text-primary" />
          Launch New Group
        </CardTitle>
        <CardDescription>
          Start a service run — the exact credit cost is charged from your balance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="region-select-label">Accounts Region</Label>
          <Select value={regionId} onValueChange={(v) => setRegionId(v)}>
            <SelectTrigger id="region-select-label" data-testid="region-select" className="w-full">
              <SelectValue>
                {region ? region.name : "Select accounts region"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(catalog?.regions ?? []).map((r) => (
                <SelectItem key={r.id} value={r.id} data-testid={`region-option-${r.id}`}>
                  <span className="flex items-center gap-2">
                    <span>{r.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        r.tier === "premium"
                          ? "border-[#FACC15]/40 text-[#FACC15]"
                          : "border-[#22C55E]/40 text-[#4ADE80]"
                      }`}
                    >
                      {tierLabel(r.tier)}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">{r.cost}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="plan-select-label">Plan · player accounts</Label>
          <Select value={planId} onValueChange={(v) => setPlanId(v)}>
            <SelectTrigger id="plan-select-label" data-testid="plan-select" className="w-full">
              <SelectValue>
                {plan
                  ? `${plan.name} · ${plan.account_count} accounts · ${plan.duration_minutes} min`
                  : "Select plan"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(catalog?.plans ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id} data-testid={`plan-option-${p.id}`}>
                  {p.name} · {p.account_count} accounts · {p.duration_minutes} min
                  {p.extra_cost > 0 ? ` · +${p.extra_cost}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clan-id-label">Clan ID</Label>
          <Input
            id="clan-id-label"
            inputMode="numeric"
            placeholder="e.g. 123456789"
            value={clanId}
            onChange={(e) => setClanId(e.target.value)}
            data-testid="clan-id-input"
            className="font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            {plan?.account_count ?? 4} {catalog?.game ?? "Free Fire"} accounts are generated and
            send their join request to this clan.
          </p>
        </div>

        {region && (
          <div className="flex items-center justify-between rounded-lg border border-[#232834] bg-[#181D26] px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              Cost{plan && plan.extra_cost > 0 ? ` (${region.cost} + ${plan.extra_cost} plan)` : ""}
            </span>
            <span
              data-testid="start-group-cost"
              className={`font-mono font-bold ${
                region.tier === "premium" ? "text-[#FACC15]" : "text-[#4ADE80]"
              }`}
            >
              {totalCost} {tierLabel(region.tier)} credits
            </span>
          </div>
        )}

        {!me?.rules_accepted_at && (
          <label
            className="flex items-start gap-2 rounded-lg border border-[#FACC15]/30 bg-[#2B2304]/30 px-3 py-2 text-xs"
            htmlFor="accept-rules"
          >
            <Checkbox
              id="accept-rules"
              data-testid="accept-rules-checkbox"
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
            />
            <span className="text-muted-foreground">
              I accept the {catalog?.game ?? "Free Fire"} clan-war rules (shown below) — one Clan ID
              per launch, credits charged at launch.
            </span>
          </label>
        )}

        {insufficient && (
          <p
            data-testid="insufficient-credits-warning"
            className="flex items-center gap-1.5 text-xs text-[#FB923C]"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Insufficient {tierLabel(region!.tier)} credits — you have {balance}, this launch needs{" "}
            {totalCost}. Buy more in the Buy Credits panel.
          </p>
        )}

        <Button
          size="lg"
          data-testid="start-group-btn"
          disabled={!region || !clanValid || insufficient || !rulesOk || launch.isPending}
          onClick={() =>
            launch.mutate({
              region_id: regionId,
              clan_id: clanId.trim(),
              plan_id: planId,
              accept_rules: accepted,
            })
          }
          className="w-full bg-primary font-semibold text-[#051D0F] shadow-[0_0_16px_rgba(34,197,94,0.35)] hover:bg-primary/90"
        >
          {launch.isPending
            ? "Launching…"
            : region
              ? `Start Group · ${totalCost} ${tierLabel(region.tier)}`
              : "Start Group"}
        </Button>
        {region && !clanValid && clanId.trim().length > 0 && (
          <p className="text-center text-[11px] text-muted-foreground">
            Clan ID must be 4–18 digits.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
