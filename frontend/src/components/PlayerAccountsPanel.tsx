import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api";
import type { PlayerAccount } from "@/lib/types";

// The plan's generated Free Fire accounts: live status, join request and online/offline cycles.
export default function PlayerAccountsPanel({ groupId }: { groupId: string }) {
  const { data: accounts } = useQuery({
    queryKey: ["group-accounts", groupId],
    queryFn: () => apiGet<PlayerAccount[]>(`/groups/${groupId}/accounts`),
    refetchInterval: 15000,
    retry: false,
  });

  const rows = accounts ?? [];
  if (rows.length === 0) return null;

  return (
    <div className="space-y-1.5 border-t border-[#232834] pt-3" data-testid={`accounts-panel-${groupId}`}>
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        Player accounts ({rows.length})
      </p>
      {rows.map((a) => (
        <div
          key={a.id}
          data-testid={`player-account-${a.id}`}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-[#15181E] px-2.5 py-1.5 text-xs"
        >
          <span className="flex items-center gap-2">
            <span
              data-testid={`account-status-${a.id}`}
              className={`h-1.5 w-1.5 rounded-full ${
                a.status === "online" ? "bg-[#22C55E]" : "bg-[#4B5563]"
              }`}
              title={a.status}
            />
            <span className="font-mono font-semibold">{a.ign}</span>
            <span className="font-mono text-[10px] text-muted-foreground">UID {a.uid}</span>
          </span>
          <span className="flex items-center gap-3 text-[10px]">
            <span
              data-testid={`account-join-${a.id}`}
              className={a.join_request === "accepted" ? "text-[#4ADE80]" : "text-[#FB923C]"}
            >
              join {a.join_request}
            </span>
            <span data-testid={`account-cycles-${a.id}`} className="font-mono text-muted-foreground">
              {a.cycles}/3 cycles
            </span>
            <span className={`font-mono ${a.status === "online" ? "text-[#4ADE80]" : "text-muted-foreground"}`}>
              {a.status}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
