import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Gamepad2 } from "lucide-react";

import Header from "@/components/Header";
import { useMe } from "@/lib/useMe";

// Static, fetch-free loading shell — renders identically even with no backend behind it.
function Splash() {
  return (
    <div
      data-testid="app-splash"
      className="flex min-h-svh flex-col items-center justify-center gap-3"
    >
      <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Gamepad2 className="h-7 w-7" />
      </span>
      <p className="text-sm text-muted-foreground">Connecting to Clan Nexus…</p>
    </div>
  );
}

// Auth gate + app shell: header and page container render for every authenticated page.
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { data, isPending, isError } = useMe();
  if (isPending) return <Splash />;
  if (isError || !data) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-svh">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

// Admin-only gate — non-admins bounce back to the dashboard.
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { data, isPending, isError } = useMe();
  if (isPending) return <Splash />;
  if (isError || !data) return <Navigate to="/login" replace />;
  if (!data.is_admin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
