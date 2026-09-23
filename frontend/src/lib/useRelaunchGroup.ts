import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiPost } from "@/lib/api";
import { apiErrorMessage } from "@/lib/format";
import type { Group } from "@/lib/types";

// Shared by the relaunch card and the auto-stop toast action — invalidates every view a
// fresh run touches (balances, active groups, the relaunch offer list, history).
export function useRelaunchGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => apiPost<Group>(`/groups/${groupId}/relaunch`),
    onSuccess: (g) => {
      toast.success(`Clan ${g.clan_id} relaunched`, {
        description: `Fresh run on ${g.region_name}, server #${g.server_number} · −${g.cost} ${
          g.tier === "premium" ? "Premium" : "Basic"
        } credits.`,
      });
      void qc.invalidateQueries({ queryKey: ["me"] });
      void qc.invalidateQueries({ queryKey: ["groups"] });
      void qc.invalidateQueries({ queryKey: ["groups-relaunchable"] });
      void qc.invalidateQueries({ queryKey: ["history"] });
    },
    onError: (e) => toast.error("Relaunch failed", { description: apiErrorMessage(e) }),
  });
}
