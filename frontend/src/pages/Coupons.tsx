import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Gift, Ticket } from "lucide-react";
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
import { apiErrorMessage, copyText, fmtDate, fmtDateTime, fmtNumber } from "@/lib/format";
import type { Coupon, CouponStatus, CreditType } from "@/lib/types";

function tierLabel(t: CreditType) {
  return t === "premium" ? "Premium" : "Basic";
}

function tierTextClass(t: CreditType) {
  return t === "premium" ? "text-[#FACC15]" : "text-[#4ADE80]";
}

const EXPIRY_OPTIONS: { value: string; label: string }[] = [
  { value: "never", label: "Never expires" },
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

const COUPON_STATUS_CLASS: Record<CouponStatus, string> = {
  active: "border-[#22C55E]/40 text-[#4ADE80]",
  redeemed: "border-[#2E3646] text-muted-foreground",
  expired: "border-[#EF4444]/40 text-[#F87171]",
};

export default function Coupons() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [type, setType] = useState<CreditType>("basic");
  const [amount, setAmount] = useState("");
  const [expiry, setExpiry] = useState("never");
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const mine = useQuery({
    queryKey: ["coupons-mine"],
    queryFn: () => apiGet<Coupon[]>("/coupons/mine"),
    retry: false,
  });
  const redeemed = useQuery({
    queryKey: ["coupons-redeemed"],
    queryFn: () => apiGet<Coupon[]>("/coupons/redeemed"),
    retry: false,
  });

  const redeem = useMutation({
    mutationFn: () => apiPost<Coupon>("/coupons/redeem", { code: code.trim() }),
    onSuccess: (c) => {
      toast.success("Coupon redeemed", {
        description: `+${fmtNumber(c.amount)} ${tierLabel(c.credit_type)} credits added.`,
      });
      setCode("");
      void qc.invalidateQueries({ queryKey: ["me"] });
      void qc.invalidateQueries({ queryKey: ["coupons-mine"] });
      void qc.invalidateQueries({ queryKey: ["coupons-redeemed"] });
    },
    onError: (e) => toast.error("Redeem failed", { description: apiErrorMessage(e) }),
  });

  const create = useMutation({
    mutationFn: () =>
      apiPost<Coupon>("/coupons", {
        credit_type: type,
        amount: Number(amount),
        expires_in_days: expiry === "never" ? undefined : Number(expiry),
      }),
    onSuccess: (c) => {
      toast.success("Coupon created", {
        description: `${c.code} funded with ${fmtNumber(c.amount)} ${tierLabel(c.credit_type)} credits${
          c.expires_at ? ` · expires ${fmtDate(c.expires_at)}` : ""
        }.`,
      });
      setCreatedCode(c.code);
      setAmount("");
      void qc.invalidateQueries({ queryKey: ["me"] });
      void qc.invalidateQueries({ queryKey: ["coupons-mine"] });
    },
    onError: (e) => toast.error("Could not create coupon", { description: apiErrorMessage(e) }),
  });

  const amountValid = /^\d+$/.test(amount) && Number(amount) >= 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Gift Coupons</h1>
        <p className="text-sm text-muted-foreground">
          Mint codes from your own balance, or claim codes you received.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Redeem */}
        <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg tracking-tight">
              <Gift className="h-4 w-4 text-primary" />
              Redeem a Coupon
            </CardTitle>
            <CardDescription>Enter a code to claim its credits instantly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="coupon-code">Coupon Code</Label>
              <Input
                id="coupon-code"
                placeholder="NX-XXXXXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                data-testid="coupon-code-input"
                className="font-mono uppercase"
              />
            </div>
            <Button
              className="w-full font-semibold"
              data-testid="redeem-coupon-btn"
              disabled={code.trim().length < 4 || redeem.isPending}
              onClick={() => redeem.mutate()}
            >
              {redeem.isPending ? "Redeeming…" : "Redeem"}
            </Button>
          </CardContent>
        </Card>

        {/* Create */}
        <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg tracking-tight">
              <Ticket className="h-4 w-4 text-[#FACC15]" />
              Create a Coupon
            </CardTitle>
            <CardDescription>
              Fund a code with Basic or Premium credits — the amount leaves your balance immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="coupon-type">Credit Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as CreditType)}>
                  <SelectTrigger id="coupon-type" data-testid="coupon-type-select" className="w-full">
                    <SelectValue>{tierLabel(type)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic" data-testid="coupon-type-basic">
                      Basic
                    </SelectItem>
                    <SelectItem value="premium" data-testid="coupon-type-premium">
                      Premium
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-amount">Amount</Label>
                <Input
                  id="coupon-amount"
                  inputMode="numeric"
                  placeholder="e.g. 100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  data-testid="coupon-amount-input"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-expiry">Expires After</Label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger id="coupon-expiry" data-testid="coupon-expiry-select" className="w-full">
                  <SelectValue>
                    {EXPIRY_OPTIONS.find((o) => o.value === expiry)?.label ?? "Never expires"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} data-testid={`coupon-expiry-${o.value}`}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full font-semibold"
              data-testid="create-coupon-btn"
              disabled={!amountValid || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Generating…" : "Generate Coupon Code"}
            </Button>
            {createdCode && (
              <div
                data-testid="created-coupon-box"
                className="flex items-center justify-between gap-3 rounded-lg border border-[#22C55E]/40 bg-[#062E1A] px-3 py-2"
              >
                <span
                  data-testid="generated-coupon-code"
                  className="font-mono font-bold text-[#4ADE80]"
                >
                  {createdCode}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="copy-created-coupon-btn"
                  aria-label="Copy coupon code"
                  onClick={async () => {
                    const ok = await copyText(createdCode);
                    if (ok) toast.success("Copied coupon code");
                    else toast.error("Copy failed");
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Logs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-heading text-base tracking-tight">My Generated Coupons</CardTitle>
            <CardDescription>Codes you minted and their status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(mine.data ?? []).length === 0 ? (
              <p
                data-testid="no-generated-coupons"
                className="py-6 text-center text-sm text-muted-foreground"
              >
                You haven't generated any coupons yet.
              </p>
            ) : (
              (mine.data ?? []).map((c) => (
                <div
                  key={c.id}
                  data-testid={`generated-coupon-${c.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#232834] bg-[#181D26] px-3 py-2"
                >
                  <span className="flex flex-col">
                    <span className="font-mono text-sm font-bold">{c.code}</span>
                    <span
                      data-testid={`coupon-expiry-label-${c.id}`}
                      className="text-[10px] text-muted-foreground"
                    >
                      {c.expires_at
                        ? `${c.status === "expired" ? "Expired" : "Expires"} ${fmtDate(c.expires_at)}`
                        : "No expiry"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-xs">
                    <span className={`font-mono font-semibold ${tierTextClass(c.credit_type)}`}>
                      +{fmtNumber(c.amount)} {tierLabel(c.credit_type)}
                    </span>
                    <Badge
                      variant="outline"
                      data-testid={`coupon-status-${c.id}`}
                      className={COUPON_STATUS_CLASS[c.status]}
                    >
                      {c.status}
                    </Badge>
                    {c.status === "active" && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Copy coupon ${c.code}`}
                        data-testid={`copy-coupon-btn-${c.id}`}
                        onClick={async () => {
                          const ok = await copyText(c.code);
                          if (ok) toast.success("Copied coupon code");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-heading text-base tracking-tight">Coupons I Redeemed</CardTitle>
            <CardDescription>Codes you claimed and the credits they carried.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(redeemed.data ?? []).length === 0 ? (
              <p
                data-testid="no-redeemed-coupons"
                className="py-6 text-center text-sm text-muted-foreground"
              >
                No redeemed coupons yet.
              </p>
            ) : (
              (redeemed.data ?? []).map((c) => (
                <div
                  key={c.id}
                  data-testid={`redeemed-coupon-${c.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#232834] bg-[#181D26] px-3 py-2"
                >
                  <span className="font-mono text-sm font-bold">{c.code}</span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      from <span className="text-foreground">{c.creator_username}</span>
                    </span>
                    <span className={`font-mono font-semibold ${tierTextClass(c.credit_type)}`}>
                      +{fmtNumber(c.amount)} {tierLabel(c.credit_type)}
                    </span>
                    <span className="font-mono">{c.redeemed_at ? fmtDateTime(c.redeemed_at) : ""}</span>
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
