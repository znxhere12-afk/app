import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, RotateCcw, X } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import StatusBadge from "@/components/StatusBadge";
import { apiGet, apiPost } from "@/lib/api";
import { apiErrorMessage, copyText, fmtDate, fmtDateTime, fmtNumber, fmtUsd } from "@/lib/format";
import type { Coupon, CreditType, Group, GroupStatus, Payment, User } from "@/lib/types";

function GroupStatusBadge({ status, testid }: { status: GroupStatus; testid?: string }) {
  const cls =
    status === "running"
      ? "border-[#22C55E]/40 bg-[#062E1A] text-[#4ADE80]"
      : status === "stopped"
        ? "border-[#F97316]/40 bg-[#2A1C08] text-[#FB923C]"
        : "border-[#38BDF8]/40 bg-[#0B2430] text-[#7DD3FC]";
  return (
    <Badge variant="outline" className={`capitalize ${cls}`} data-testid={testid}>
      {status}
    </Badge>
  );
}

function tierLabel(t: CreditType) {
  return t === "premium" ? "Premium" : "Basic";
}

export default function Admin() {
  const qc = useQueryClient();
  const payments = useQuery({
    queryKey: ["admin-payments"],
    queryFn: () => apiGet<Payment[]>("/admin/payments"),
    retry: false,
  });
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiGet<User[]>("/admin/users"),
    retry: false,
  });
  const groups = useQuery({
    queryKey: ["admin-groups"],
    queryFn: () => apiGet<Group[]>("/admin/groups"),
    retry: false,
  });
  const coupons = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: () => apiGet<Coupon[]>("/admin/coupons"),
    retry: false,
  });

  const [adjustUser, setAdjustUser] = useState("");
  const [adjustType, setAdjustType] = useState<CreditType>("basic");
  const [adjustDelta, setAdjustDelta] = useState("");

  const [mintType, setMintType] = useState<CreditType>("basic");
  const [mintAmount, setMintAmount] = useState("");
  const [minted, setMinted] = useState<string | null>(null);

  const pending = (payments.data ?? []).filter((p) => p.status === "pending");

  const refreshAfterPaymentReview = () => {
    void qc.invalidateQueries({ queryKey: ["admin-payments"] });
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
    void qc.invalidateQueries({ queryKey: ["payments"] });
    void qc.invalidateQueries({ queryKey: ["me"] });
  };

  const approve = useMutation({
    mutationFn: (id: string) => apiPost<Payment>(`/admin/payments/${id}/approve`),
    onSuccess: (p) => {
      toast.success("Payment approved", {
        description: `+${fmtNumber(p.credits)} ${tierLabel(p.credit_type)} credits added to ${p.username}.`,
      });
      refreshAfterPaymentReview();
    },
    onError: (e) => toast.error("Approve failed", { description: apiErrorMessage(e) }),
  });

  const reject = useMutation({
    mutationFn: (id: string) => apiPost<Payment>(`/admin/payments/${id}/reject`),
    onSuccess: (p) => {
      toast.success("Payment rejected", { description: `Order ${p.binance_order_id} declined.` });
      refreshAfterPaymentReview();
    },
    onError: (e) => toast.error("Reject failed", { description: apiErrorMessage(e) }),
  });

  const refundPayment = useMutation({
    mutationFn: (id: string) => apiPost<Payment>(`/admin/payments/${id}/refund`),
    onSuccess: (p) => {
      toast.success("Payment refunded", {
        description: `${fmtNumber(p.credits)} ${tierLabel(p.credit_type)} credits deducted back from ${p.username}.`,
      });
      refreshAfterPaymentReview();
    },
    onError: (e) => toast.error("Refund failed", { description: apiErrorMessage(e) }),
  });

  const refundGroup = useMutation({
    mutationFn: (id: string) => apiPost<Group>(`/admin/groups/${id}/refund`),
    onSuccess: (g) => {
      toast.success("Group refunded", {
        description: `${g.cost} ${tierLabel(g.tier)} credits returned for clan ${g.clan_id}.`,
      });
      void qc.invalidateQueries({ queryKey: ["admin-groups"] });
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
      void qc.invalidateQueries({ queryKey: ["history"] });
      void qc.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (e) => toast.error("Refund failed", { description: apiErrorMessage(e) }),
  });

  const adjust = useMutation({
    mutationFn: () =>
      apiPost<User>(`/admin/users/${adjustUser}/credits`, {
        credit_type: adjustType,
        delta: Number(adjustDelta),
      }),
    onSuccess: (u) => {
      toast.success("Balance updated", {
        description: `${u.username} now holds ${fmtNumber(u.basic_credits)} Basic / ${fmtNumber(u.premium_credits)} Premium.`,
      });
      setAdjustDelta("");
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e) => toast.error("Adjust failed", { description: apiErrorMessage(e) }),
  });

  const mint = useMutation({
    mutationFn: () =>
      apiPost<Coupon>("/admin/coupons", { credit_type: mintType, amount: Number(mintAmount) }),
    onSuccess: (c) => {
      toast.success("Coupon minted", { description: `${c.code} — system-funded, ready to share.` });
      setMinted(c.code);
      setMintAmount("");
      void qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (e) => toast.error("Mint failed", { description: apiErrorMessage(e) }),
  });

  const adjustValid = adjustUser !== "" && /^\d+$/.test(adjustDelta) && Number(adjustDelta) !== 0;
  const mintValid = /^\d+$/.test(mintAmount) && Number(mintAmount) >= 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">
          Review payments, manage members and mint giveaway coupons.
        </p>
      </div>

      <Tabs defaultValue="payments">
        <TabsList data-testid="admin-tabs">
          <TabsTrigger value="payments" data-testid="admin-tab-payments">
            Payments
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="admin-tab-users">
            Users
          </TabsTrigger>
          <TabsTrigger value="groups" data-testid="admin-tab-groups">
            Groups
          </TabsTrigger>
          <TabsTrigger value="coupons" data-testid="admin-tab-coupons">
            Coupons
          </TabsTrigger>
        </TabsList>

        {/* PAYMENTS */}
        <TabsContent value="payments" className="mt-4 space-y-6">
          <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-heading text-base tracking-tight">
                Pending Payments
              </CardTitle>
              <CardDescription>
                Approve to credit the buyer, reject to decline the claim.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pending.length === 0 ? (
                <p data-testid="no-pending-payments" className="py-6 text-center text-sm text-muted-foreground">
                  No pending payments.
                </p>
              ) : (
                pending.map((p) => (
                  <div
                    key={p.id}
                    data-testid={`pending-payment-${p.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#FACC15]/30 bg-[#2B2304]/30 p-4"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {p.username} ·{" "}
                        <span
                          className={`font-mono font-semibold ${
                            p.credit_type === "premium" ? "text-[#FACC15]" : "text-[#4ADE80]"
                          }`}
                        >
                          +{fmtNumber(p.credits)} {tierLabel(p.credit_type)}
                        </span>
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {p.binance_order_id} · {fmtUsd(p.amount_usd)} · {fmtDateTime(p.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        data-testid={`approve-payment-btn-${p.id}`}
                        disabled={approve.isPending}
                        onClick={() => approve.mutate(p.id)}
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`reject-payment-btn-${p.id}`}
                        disabled={reject.isPending}
                        onClick={() => reject.mutate(p.id)}
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 py-0 shadow-xl backdrop-blur-sm">
            <Table data-testid="admin-payments-table">
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Credit Split</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payments.data ?? []).map((p) => (
                  <TableRow key={p.id} data-testid={`admin-payment-row-${p.id}`}>
                    <TableCell>{p.username}</TableCell>
                    <TableCell className="font-mono text-xs">{p.binance_order_id}</TableCell>
                    <TableCell>
                      <span
                        className={`font-mono text-xs font-semibold ${
                          p.credit_type === "premium" ? "text-[#FACC15]" : "text-[#4ADE80]"
                        }`}
                      >
                        +{fmtNumber(p.credits)} {tierLabel(p.credit_type)}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{fmtUsd(p.amount_usd)}</TableCell>
                    <TableCell className="text-xs">{fmtDateTime(p.created_at)}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} testid={`admin-payment-status-${p.id}`} />
                    </TableCell>
                    <TableCell>
                      {p.status === "approved" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`refund-payment-btn-${p.id}`}
                          disabled={refundPayment.isPending}
                          onClick={() => refundPayment.mutate(p.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Refund
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* USERS */}
        <TabsContent value="users" className="mt-4 space-y-6">
          <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-heading text-base tracking-tight">Adjust Credits</CardTitle>
              <CardDescription>
                Add or remove credits — use a negative delta to deduct (floors at zero).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="adjust-user">User</Label>
                <Select value={adjustUser} onValueChange={setAdjustUser}>
                  <SelectTrigger id="adjust-user" data-testid="admin-adjust-user-select" className="w-full">
                    <SelectValue>
                      {(users.data ?? []).find((u) => u.id === adjustUser)?.username ??
                        "Select user"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(users.data ?? []).map((u) => (
                      <SelectItem key={u.id} value={u.id} data-testid={`admin-adjust-user-${u.id}`}>
                        {u.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjust-type">Credit Type</Label>
                <Select value={adjustType} onValueChange={(v) => setAdjustType(v as CreditType)}>
                  <SelectTrigger id="adjust-type" data-testid="admin-adjust-type-select" className="w-full">
                    <SelectValue>{tierLabel(adjustType)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic" data-testid="admin-adjust-type-basic">
                      Basic
                    </SelectItem>
                    <SelectItem value="premium" data-testid="admin-adjust-type-premium">
                      Premium
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjust-delta">Delta</Label>
                <Input
                  id="adjust-delta"
                  placeholder="e.g. 500 or -100"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  data-testid="admin-adjust-delta-input"
                  className="font-mono"
                />
              </div>
              <Button
                data-testid="admin-adjust-apply-btn"
                disabled={!adjustValid || adjust.isPending}
                onClick={() => adjust.mutate()}
              >
                Apply
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 py-0 shadow-xl backdrop-blur-sm">
            <Table data-testid="admin-users-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Basic</TableHead>
                  <TableHead>Premium</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users.data ?? []).map((u) => (
                  <TableRow key={u.id} data-testid={`admin-user-row-${u.id}`}>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.email ?? "—"}</TableCell>
                    <TableCell data-testid={`admin-user-basic-${u.id}`} className="font-mono text-[#4ADE80]">
                      {fmtNumber(u.basic_credits)}
                    </TableCell>
                    <TableCell data-testid={`admin-user-premium-${u.id}`} className="font-mono text-[#FACC15]">
                      {fmtNumber(u.premium_credits)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          u.is_admin
                            ? "border-[#FACC15]/40 text-[#FACC15]"
                            : "border-[#2E3646] text-muted-foreground"
                        }
                      >
                        {u.is_admin ? "Admin" : "Member"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{fmtDate(u.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* GROUPS */}
        <TabsContent value="groups" className="mt-4">
          <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 py-0 shadow-xl backdrop-blur-sm">
            <Table data-testid="admin-groups-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Clan ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Server</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(groups.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No groups launched yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  (groups.data ?? []).map((g) => (
                    <TableRow key={g.id} data-testid={`admin-group-row-${g.id}`}>
                      <TableCell className="font-mono font-semibold">{g.clan_id}</TableCell>
                      <TableCell>{g.username || `${g.user_id.slice(0, 8)}…`}</TableCell>
                      <TableCell>{g.region_name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            g.tier === "premium"
                              ? "border-[#FACC15]/40 text-[#FACC15]"
                              : "border-[#22C55E]/40 text-[#4ADE80]"
                          }
                        >
                          {tierLabel(g.tier)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">#{g.server_number}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {g.usage} / {g.usage_limit}
                      </TableCell>
                      <TableCell>
                        <GroupStatusBadge status={g.status} testid={`admin-group-status-${g.id}`} />
                      </TableCell>
                      <TableCell>
                        {g.status !== "refunded" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`refund-group-btn-${g.id}`}
                            disabled={refundGroup.isPending}
                            onClick={() => refundGroup.mutate(g.id)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Refund
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* COUPONS */}
        <TabsContent value="coupons" className="mt-4 space-y-6">
          <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-heading text-base tracking-tight">Mint Coupon</CardTitle>
              <CardDescription>
                System-funded code — no balance deduction. Share it as a giveaway.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="mint-type">Credit Type</Label>
                  <Select value={mintType} onValueChange={(v) => setMintType(v as CreditType)}>
                    <SelectTrigger id="mint-type" data-testid="admin-coupon-type-select" className="w-full">
                      <SelectValue>{tierLabel(mintType)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic" data-testid="admin-coupon-type-basic">
                        Basic
                      </SelectItem>
                      <SelectItem value="premium" data-testid="admin-coupon-type-premium">
                        Premium
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mint-amount">Amount</Label>
                  <Input
                    id="mint-amount"
                    inputMode="numeric"
                    placeholder="e.g. 250"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    data-testid="admin-coupon-amount-input"
                    className="font-mono"
                  />
                </div>
                <Button
                  data-testid="admin-mint-coupon-btn"
                  disabled={!mintValid || mint.isPending}
                  onClick={() => mint.mutate()}
                >
                  Mint Coupon
                </Button>
              </div>
              {minted && (
                <div
                  data-testid="admin-minted-box"
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#22C55E]/40 bg-[#062E1A] px-3 py-2"
                >
                  <span data-testid="admin-minted-code" className="font-mono font-bold text-[#4ADE80]">
                    {minted}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Copy minted coupon code"
                    data-testid="admin-copy-minted-btn"
                    onClick={async () => {
                      const ok = await copyText(minted);
                      if (ok) toast.success("Copied coupon code");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 py-0 shadow-xl backdrop-blur-sm">
            <Table data-testid="admin-coupons-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(coupons.data ?? []).map((c) => (
                  <TableRow key={c.id} data-testid={`admin-coupon-row-${c.id}`}>
                    <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                    <TableCell>{tierLabel(c.credit_type)}</TableCell>
                    <TableCell className="font-mono">{fmtNumber(c.amount)}</TableCell>
                    <TableCell>{c.creator_username}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        data-testid={`admin-coupon-status-${c.id}`}
                        className={
                          c.status === "active"
                            ? "border-[#22C55E]/40 text-[#4ADE80]"
                            : c.status === "expired"
                              ? "border-[#EF4444]/40 text-[#F87171]"
                              : "border-[#2E3646] text-muted-foreground"
                        }
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{fmtDateTime(c.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
