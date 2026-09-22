import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Coins, Gamepad2, Gem, LogOut, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fmtNumber } from "@/lib/format";
import { endSession } from "@/lib/session";
import { useMe } from "@/lib/useMe";

const NAV = [
  { to: "/", label: "Dashboard", testid: "nav-dashboard" },
  { to: "/transactions", label: "Transactions", testid: "nav-transactions" },
  { to: "/coupons", label: "Coupons", testid: "nav-coupons" },
  { to: "/history", label: "History", testid: "nav-history" },
  { to: "/settings", label: "Settings", testid: "nav-settings" },
];

function BalancePill({
  testid,
  icon,
  value,
  label,
  iconClass,
}: {
  testid: string;
  icon: ReactNode;
  value: number;
  label: string;
  iconClass: string;
}) {
  return (
    <div
      data-testid={testid}
      title={label}
      className="flex items-center gap-1.5 rounded-full border border-[#232834] bg-[#15181E] px-3 py-1"
    >
      {icon}
      <span className="font-mono text-sm font-semibold tabular-nums">{fmtNumber(value)}</span>
      <span className="hidden text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground sm:inline">
        {label}
      </span>
    </div>
  );
}

export default function Header() {
  const { data: me } = useMe();

  return (
    <header
      data-testid="header"
      className="sticky top-0 z-50 border-b border-[#232834] bg-[#0D0F12]/85 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <NavLink to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary shadow-[0_0_12px_rgba(34,197,94,0.25)]">
            <Gamepad2 className="h-5 w-5" />
          </span>
          <span className="font-heading text-lg font-bold tracking-tight">
            CLAN<span className="text-primary">NEXUS</span>
          </span>
        </NavLink>

        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto md:order-none md:w-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={item.testid}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          {me?.is_admin && (
            <NavLink
              to="/admin"
              data-testid="nav-admin"
              className={({ isActive }) =>
                `flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150 ${
                  isActive
                    ? "bg-[#FACC15]/10 text-[#FACC15]"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <BalancePill
            testid="header-basic-balance"
            icon={<Coins className="h-4 w-4 text-sky-400" />}
            value={me?.basic_credits ?? 0}
            label="Basic"
            iconClass="text-sky-400"
          />
          <BalancePill
            testid="header-premium-balance"
            icon={<Gem className="h-4 w-4 text-[#FACC15]" />}
            value={me?.premium_credits ?? 0}
            label="Premium"
            iconClass="text-[#FACC15]"
          />

          <span
            data-testid="header-username"
            className="hidden items-center gap-1.5 rounded-full border border-[#232834] bg-[#15181E] px-3 py-1 text-sm text-muted-foreground md:flex"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {me?.username ?? "…"}
          </span>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Log out"
            data-testid="header-logout-btn"
            onClick={() => void endSession()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
