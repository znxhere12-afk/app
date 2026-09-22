import { useQuery } from "@tanstack/react-query";
import { Copy, TimerReset } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import { copyText, fmtDate, fmtNumber } from "@/lib/format";
import type { Coupon } from "@/lib/types";

function daysLeft(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

// Warns creators about their own unredeemed codes lapsing within a week.
export default function ExpiryRemindersCard() {
  const { data: expiring } = useQuery({
    queryKey: ["coupons-expiring"],
    queryFn: () => apiGet<Coupon[]>("/coupons/expiring"),
    retry: false,
  });

  if (!expiring || expiring.length === 0) return null;

  return (
    <Card
      data-testid="expiry-reminders-card"
      className="rounded-xl border-[#FACC15]/40 bg-[#2B2304]/40 shadow-xl backdrop-blur-sm"
    >
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="flex items-center gap-2 font-heading text-sm font-bold tracking-tight text-[#FACC15]">
            <TimerReset className="h-4 w-4" />
            {expiring.length} coupon{expiring.length > 1 ? "s" : ""} about to lapse unused
          </p>
          <div className="flex flex-wrap gap-2">
            {expiring.slice(0, 4).map((c) => {
              const left = daysLeft(c.expires_at!);
              return (
                <span
                  key={c.id}
                  data-testid={`expiring-coupon-${c.id}`}
                  className="flex items-center gap-2 rounded-lg border border-[#FACC15]/30 bg-[#15181E] px-2.5 py-1.5 text-xs"
                >
                  <span className="font-mono font-bold">{c.code}</span>
                  <span
                    className={`font-mono ${
                      c.credit_type === "premium" ? "text-[#FACC15]" : "text-[#4ADE80]"
                    }`}
                  >
                    {fmtNumber(c.amount)}
                  </span>
                  <span
                    data-testid={`expiring-coupon-days-${c.id}`}
                    className="text-muted-foreground"
                  >
                    {left === 0 ? "expires today" : `${left}d left`} · {fmtDate(c.expires_at!)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Copy coupon ${c.code}`}
                    data-testid={`copy-expiring-coupon-btn-${c.id}`}
                    onClick={async () => {
                      const ok = await copyText(c.code);
                      if (ok) toast.success("Copied coupon code", { description: c.code });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </span>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Share them before the deadline — an expired code cannot be redeemed and its credits stay
            locked.
          </p>
        </div>
        <Link
          to="/coupons"
          data-testid="expiry-reminders-manage-link"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Manage coupons
        </Link>
      </CardContent>
    </Card>
  );
}
