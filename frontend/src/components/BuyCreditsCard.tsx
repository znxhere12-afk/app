import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Copy, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiGet, apiPost } from "@/lib/api";
import { apiErrorMessage, copyText, fmtNumber, fmtUsd } from "@/lib/format";
import type { Catalog, Payment } from "@/lib/types";

const OPEN_KEY = "cn_buycredits_open";

// Collapsible deposit panel: pick a pack → send to the Binance Pay ID → claim with the Order ID.
export default function BuyCreditsCard() {
  const [open, setOpen] = useState(() => localStorage.getItem(OPEN_KEY) !== "0");
  const [packId, setPackId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState("");
  const qc = useQueryClient();

  const { data: catalog } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => apiGet<Catalog>("/catalog"),
    retry: false,
  });

  const submit = useMutation({
    mutationFn: (payload: { pack_id: string; binance_order_id: string }) =>
      apiPost<Payment>("/payments", payload),
    onSuccess: (p) => {
      toast.success("Payment submitted", {
        description: `Order ${p.binance_order_id} is awaiting admin approval.`,
      });
      setOrderId("");
      setPackId(null);
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (e) => toast.error("Could not submit payment", { description: apiErrorMessage(e) }),
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    localStorage.setItem(OPEN_KEY, next ? "1" : "0");
  };

  const copyPayId = async () => {
    const ok = await copyText(catalog?.binance_pay_id ?? "");
    if (ok) toast.success("Copied Binance Pay ID to clipboard");
    else toast.error("Copy failed — select the ID manually");
  };

  return (
    <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 font-heading text-lg tracking-tight">
            <Wallet className="h-4 w-4 text-primary" />
            Buy Credits
          </CardTitle>
          <CardDescription>Top up via Binance Pay — admin verifies each order.</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={open ? "Collapse buy credits panel" : "Expand buy credits panel"}
          data-testid="buy-credits-toggle"
          onClick={toggle}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
          />
        </Button>
      </CardHeader>

      {open && (
        <CardContent className="space-y-5">
          <section className="space-y-2">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              1 · Choose a pack
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(catalog?.packs ?? []).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  data-testid={`pack-option-${p.id}`}
                  onClick={() => setPackId(p.id)}
                  className={`rounded-xl border p-3 text-left transition-all duration-150 hover:-translate-y-0.5 ${
                    packId === p.id
                      ? "border-primary/60 bg-primary/10"
                      : "border-[#2E3646] hover:border-[#22C55E]/40"
                  }`}
                >
                  <span
                    className={`block font-mono text-sm font-bold ${
                      p.credit_type === "premium" ? "text-[#FACC15]" : "text-[#4ADE80]"
                    }`}
                  >
                    +{fmtNumber(p.credits)} {p.credit_type === "premium" ? "Premium" : "Basic"}
                  </span>
                  <span className="text-xs text-muted-foreground">{fmtUsd(p.amount_usd)}</span>
                </button>
              ))}
            </div>
            {!catalog && (
              <p className="text-xs text-muted-foreground">Pack list unavailable right now.</p>
            )}
          </section>

          <section className="space-y-2">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              2 · Send payment
            </p>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#232834] bg-[#181D26] p-3">
              <div>
                <p className="text-[11px] text-muted-foreground">Binance Pay ID</p>
                <p
                  data-testid="binance-pay-id"
                  className="font-mono text-lg font-bold tracking-wider"
                >
                  {catalog?.binance_pay_id ?? "•••••••"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                aria-label="Copy Binance Pay ID"
                data-testid="copy-binance-pay-id-btn"
                onClick={() => void copyPayId()}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              3 · Confirm transfer
            </p>
            <Input
              placeholder="Paste Binance Order ID (e.g. BIN-8816234105)"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              data-testid="binance-order-id-input"
              className="font-mono"
            />
            <Button
              className="w-full font-semibold"
              data-testid="submit-payment-btn"
              disabled={!packId || orderId.trim().length < 4 || submit.isPending}
              onClick={() =>
                packId && submit.mutate({ pack_id: packId, binance_order_id: orderId.trim() })
              }
            >
              {submit.isPending ? "Submitting…" : "Submit Payment"}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Credits land after an admin approves the order — track it under Transactions.
            </p>
          </section>
        </CardContent>
      )}
    </Card>
  );
}
