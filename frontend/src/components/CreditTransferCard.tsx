import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Send } from "lucide-react";
import { toast } from "sonner";

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
import { apiErrorMessage, fmtDateTime, fmtNumber } from "@/lib/format";
import type { CreditType, Transfer } from "@/lib/types";

function tierLabel(t: CreditType) {
  return t === "premium" ? "Premium" : "Basic";
}

// Member-to-member credit transfers: send from your balance, see both directions in one log.
export default function CreditTransferCard() {
  const qc = useQueryClient();
  const [to, setTo] = useState("");
  const [type, setType] = useState<CreditType>("basic");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const { data: transfers } = useQuery({
    queryKey: ["transfers"],
    queryFn: () => apiGet<Transfer[]>("/transfers"),
    retry: false,
  });

  const send = useMutation({
    mutationFn: () =>
      apiPost<Transfer>("/transfers", {
        to_username: to.trim(),
        credit_type: type,
        amount: Number(amount),
        note: note.trim() || undefined,
      }),
    onSuccess: (t) => {
      toast.success("Credits sent", {
        description: `${fmtNumber(t.amount)} ${tierLabel(t.credit_type)} credits delivered to ${t.to_username}.`,
      });
      setTo("");
      setAmount("");
      setNote("");
      void qc.invalidateQueries({ queryKey: ["me"] });
      void qc.invalidateQueries({ queryKey: ["transfers"] });
    },
    onError: (e) => toast.error("Transfer failed", { description: apiErrorMessage(e) }),
  });

  const valid = to.trim().length >= 3 && /^\d+$/.test(amount) && Number(amount) >= 1;

  return (
    <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-lg tracking-tight">
          <Send className="h-4 w-4 text-sky-400" />
          Send Credits
        </CardTitle>
        <CardDescription>
          Transfer Basic or Premium credits straight to another member's balance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="transfer-to">Recipient Username</Label>
          <Input
            id="transfer-to"
            placeholder="e.g. player1"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            data-testid="transfer-username-input"
            className="font-mono"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="transfer-type">Credit Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as CreditType)}>
              <SelectTrigger id="transfer-type" data-testid="transfer-type-select" className="w-full">
                <SelectValue>{tierLabel(type)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic" data-testid="transfer-type-basic">
                  Basic
                </SelectItem>
                <SelectItem value="premium" data-testid="transfer-type-premium">
                  Premium
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="transfer-amount">Amount</Label>
            <Input
              id="transfer-amount"
              inputMode="numeric"
              placeholder="e.g. 100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              data-testid="transfer-amount-input"
              className="font-mono"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="transfer-note">Note (optional)</Label>
          <Input
            id="transfer-note"
            placeholder="e.g. tournament prize"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            data-testid="transfer-note-input"
          />
        </div>
        <Button
          className="w-full font-semibold"
          data-testid="send-transfer-btn"
          disabled={!valid || send.isPending}
          onClick={() => send.mutate()}
        >
          {send.isPending ? "Sending…" : "Send Credits"}
        </Button>

        <div className="space-y-2 border-t border-[#232834] pt-3">
          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            Transfer log
          </p>
          {(transfers ?? []).length === 0 ? (
            <p data-testid="no-transfers" className="py-4 text-center text-sm text-muted-foreground">
              No transfers yet.
            </p>
          ) : (
            (transfers ?? []).slice(0, 6).map((t) => {
              const out = t.direction === "out";
              return (
                <div
                  key={t.id}
                  data-testid={`transfer-row-${t.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#232834] bg-[#181D26] px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {out ? (
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-[#FB923C]" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4 shrink-0 text-[#4ADE80]" />
                    )}
                    <span className="truncate text-xs">
                      {out ? "to " : "from "}
                      <span className="font-mono font-semibold text-foreground">
                        {out ? t.to_username : t.from_username}
                      </span>
                      {t.note && <span className="text-muted-foreground"> · {t.note}</span>}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span
                      data-testid={`transfer-amount-${t.id}`}
                      className={`font-mono text-xs font-semibold ${
                        out ? "text-[#FB923C]" : "text-[#4ADE80]"
                      }`}
                    >
                      {out ? "−" : "+"}
                      {fmtNumber(t.amount)} {tierLabel(t.credit_type)}
                    </span>
                    <span className="hidden text-[10px] text-muted-foreground sm:inline">
                      {fmtDateTime(t.created_at)}
                    </span>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
