import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api";
import { apiErrorMessage, fmtDate, fmtNumber } from "@/lib/format";
import { useMe } from "@/lib/useMe";

export default function Settings() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const update = useMutation({
    mutationFn: () =>
      apiPost<{ ok: boolean }>("/auth/password", {
        current_password: current,
        new_password: next,
      }),
    onSuccess: () => {
      toast.success("Password updated", { description: "Use your new password next time you sign in." });
      setCurrent("");
      setNext("");
      setConfirm("");
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e) => toast.error("Update failed", { description: apiErrorMessage(e) }),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 6) {
      toast.error("New password is too short", { description: "Use at least 6 characters." });
      return;
    }
    if (next !== confirm) {
      toast.error("Passwords don't match", { description: "New password and confirmation differ." });
      return;
    }
    update.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Settings / Account</h1>
        <p className="text-sm text-muted-foreground">Manage your credentials.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg tracking-tight">
              <KeyRound className="h-4 w-4 text-primary" />
              Change Password
            </CardTitle>
            <CardDescription>Rotate your password — the session stays active.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  data-testid="settings-current-password-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="min. 6 characters"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  data-testid="settings-new-password-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  data-testid="settings-confirm-password-input"
                />
              </div>
              <Button
                type="submit"
                className="w-full font-semibold"
                data-testid="update-password-btn"
                disabled={update.isPending || !current || !next || !confirm}
              >
                {update.isPending ? "Updating…" : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg tracking-tight">Account</CardTitle>
            <CardDescription>Your profile on Clan Nexus.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-[#232834] bg-[#181D26] px-3 py-2">
              <span className="text-muted-foreground">Username</span>
              <span data-testid="account-username" className="font-mono font-semibold">
                {me?.username ?? "…"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#232834] bg-[#181D26] px-3 py-2">
              <span className="text-muted-foreground">Email</span>
              <span data-testid="account-email" className="font-mono">
                {me?.email ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#232834] bg-[#181D26] px-3 py-2">
              <span className="text-muted-foreground">Role</span>
              <Badge
                variant="outline"
                data-testid="account-role"
                className={
                  me?.is_admin
                    ? "border-[#FACC15]/40 text-[#FACC15]"
                    : "border-[#22C55E]/40 text-[#4ADE80]"
                }
              >
                {me?.is_admin ? "Admin" : "Member"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#232834] bg-[#181D26] px-3 py-2">
              <span className="text-muted-foreground">Balances</span>
              <span className="font-mono">
                <span data-testid="account-basic-credits" className="text-[#4ADE80]">
                  {fmtNumber(me?.basic_credits ?? 0)} Basic
                </span>
                {" · "}
                <span data-testid="account-premium-credits" className="text-[#FACC15]">
                  {fmtNumber(me?.premium_credits ?? 0)} Premium
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#232834] bg-[#181D26] px-3 py-2">
              <span className="text-muted-foreground">Member since</span>
              <span data-testid="account-member-since" className="font-mono">
                {me ? fmtDate(me.created_at) : "…"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
