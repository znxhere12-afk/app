import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import type { Catalog } from "@/lib/types";

// Free Fire clan-war terms. Accepting happens at launch time (LaunchGroupCard checkbox).
export default function ClanWarRulesCard() {
  const { data: me } = useMe();
  const { data: catalog } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => apiGet<Catalog>("/catalog"),
    retry: false,
  });

  const rules = catalog?.clan_war_rules ?? [];

  return (
    <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 font-heading text-lg tracking-tight">
            <ScrollText className="h-4 w-4 text-[#FACC15]" />
            {catalog?.game ?? "Free Fire"} Clan War Rules
          </CardTitle>
          <CardDescription>
            These terms apply to every clan-war run launched from this panel.
          </CardDescription>
        </div>
        <Badge
          variant="outline"
          data-testid="rules-accepted-badge"
          className={
            me?.rules_accepted_at
              ? "border-[#22C55E]/40 text-[#4ADE80]"
              : "border-[#F97316]/40 text-[#FB923C]"
          }
        >
          {me?.rules_accepted_at ? "Accepted" : "Not accepted"}
        </Badge>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <p data-testid="rules-empty" className="text-sm text-muted-foreground">
            Rules unavailable right now.
          </p>
        ) : (
          <ol data-testid="clan-war-rules-list" className="space-y-2">
            {rules.map((rule, i) => (
              <li
                key={rule}
                data-testid={`clan-war-rule-${i}`}
                className="flex gap-3 text-sm text-muted-foreground"
              >
                <span className="font-mono text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
                <span>{rule}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
