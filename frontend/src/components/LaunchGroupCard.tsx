import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Rocket } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: catalog } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => apiGet<Catalog>("/catalog"),
    retry: false,
  });

  const region = catalog?.regions.find((r) => r.id === regionId) ?? null;
  const balance = !region
    ? 0
    : region.tier === "basic"
      ? (me?.basic_credits ?? 0)
      : (me?.premium_credits ?? 0);
  const insufficient = region !== null && balance < region.cost;
  const clanValid = /^\d{4,18}$/.test(clanId.trim());

  const launch = useMutation({
    mutationFn: (payload: { region_id: string; clan_id: string }) =>
      apiPost<Group>("/groups", payload),
    onSuccess: (g) => {
      toast.success("Group launched", {
        description: `Clan ${g.clan_id} is live on server #${g.server_number} · −${g.cost} ${tierLabel(g.tier)} credits.`,
      });
      setClanId("");
      void qc.invalidateQueries({ queryKey: ["me"] });
      void qc.invalidateQueries({ queryKey: ["groups"] });
      void qc.invalidateQueries({ queryKey: ["history"] });
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
        </div>

        {region && (
          <div className="flex items-center justify-between rounded-lg border border-[#232834] bg-[#181D26] px-3 py-2 text-sm">
            <span className="text-muted-foreground">Cost</span>
            <span
              data-testid="start-group-cost"
              className={`font-mono font-bold ${
                region.tier === "premium" ? "text-[#FACC15]" : "text-[#4ADE80]"
              }`}
            >
              {region.cost} {tierLabel(region.tier)} credits
            </span>
          </div>
        )}

        {insufficient && (
          <p
            data-testid="insufficient-credits-warning"
            className="flex items-center gap-1.5 text-xs text-[#FB923C]"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Insufficient {tierLabel(region!.tier)} credits — you have {balance}, this launch needs{" "}
            {region!.cost}. Buy more in the Buy Credits panel.
          </p>
        )}

        <Button
          size="lg"
          data-testid="start-group-btn"
          disabled={!region || !clanValid || insufficient || launch.isPending}
          onClick={() => launch.mutate({ region_id: regionId, clan_id: clanId.trim() })}
          className="w-full bg-primary font-semibold text-[#051D0F] shadow-[0_0_16px_rgba(34,197,94,0.35)] hover:bg-primary/90"
        >
          {launch.isPending
            ? "Launching…"
            : region
              ? `Start Group · ${region.cost} ${tierLabel(region.tier)}`
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
