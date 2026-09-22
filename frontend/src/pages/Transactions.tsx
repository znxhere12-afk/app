import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import StatusBadge from "@/components/StatusBadge";
import { apiGet } from "@/lib/api";
import { fmtDate, fmtNumber, fmtTime, fmtUsd } from "@/lib/format";
import type { Payment } from "@/lib/types";

const FILTERS = ["all", "pending", "approved", "refunded", "rejected"] as const;

export default function Transactions() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const { data: payments, isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => apiGet<Payment[]>("/payments"),
    retry: false,
  });

  const filtered = (payments ?? []).filter((p) => filter === "all" || p.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Transaction History</h1>
        <p className="text-sm text-muted-foreground">
          Every Binance deposit you submitted, with its review status.
        </p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as (typeof FILTERS)[number])}>
        <TabsList data-testid="transaction-filters">
          {FILTERS.map((f) => (
            <TabsTrigger key={f} value={f} data-testid={`transaction-filter-${f}`} className="capitalize">
              {f}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 py-0 shadow-xl backdrop-blur-sm">
        <Table data-testid="transactions-table">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Binance Order ID</TableHead>
              <TableHead>Credit Split</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  data-testid="no-transactions"
                  className="text-center text-muted-foreground"
                >
                  No transactions yet — submit a payment from the dashboard.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id} data-testid={`transaction-row-${p.id}`}>
                  <TableCell>{fmtDate(p.created_at)}</TableCell>
                  <TableCell className="font-mono text-xs">{fmtTime(p.created_at)}</TableCell>
                  <TableCell className="font-mono text-xs">{p.binance_order_id}</TableCell>
                  <TableCell>
                    <span
                      className={`font-mono text-xs font-semibold ${
                        p.credit_type === "premium" ? "text-[#FACC15]" : "text-[#4ADE80]"
                      }`}
                    >
                      +{fmtNumber(p.credits)} {p.credit_type === "premium" ? "Premium" : "Basic"}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{fmtUsd(p.amount_usd)}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} testid={`transaction-status-${p.id}`} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
