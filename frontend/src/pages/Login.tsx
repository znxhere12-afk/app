import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { Gamepad2, MessageCircle, Send, Zap, Coins, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiPost } from "@/lib/api";
import { apiErrorMessage } from "@/lib/format";
import { beginSession } from "@/lib/session";
import { useMe } from "@/lib/useMe";
import type { User } from "@/lib/types";

export default function Login() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: me } = useMe();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const afterAuth = (user: User, greeting: string) => {
    beginSession();
    qc.setQueryData(["me"], user);
    toast.success(greeting, { description: `Signed in as ${user.username}` });
    nav("/", { replace: true });
  };

  const login = useMutation({
    mutationFn: () => apiPost<User>("/auth/login", { identifier: identifier.trim(), password }),
    onSuccess: (u) => afterAuth(u, "Welcome back"),
    onError: (e) => toast.error("Sign in failed", { description: apiErrorMessage(e) }),
  });

  const signup = useMutation({
    mutationFn: () =>
      apiPost<User>("/auth/signup", {
        username: username.trim(),
        password: signupPassword,
        email: email.trim() || undefined,
      }),
    onSuccess: (u) =>
      afterAuth(u, "Account created — 200 Basic + 50 Premium welcome credits added"),
    onError: (e) => toast.error("Sign up failed", { description: apiErrorMessage(e) }),
  });

  if (me) return <Navigate to="/" replace />;

  const onLogin = (e: FormEvent) => {
    e.preventDefault();
    login.mutate();
  };
  const onSignup = (e: FormEvent) => {
    e.preventDefault();
    signup.mutate();
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-[#232834] bg-[#0D0F12] p-10 lg:flex">
        <div className="pointer-events-none absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[#FACC15]/5 blur-[120px]" />

        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary shadow-[0_0_12px_rgba(34,197,94,0.25)]">
            <Gamepad2 className="h-5 w-5" />
          </span>
          <span className="font-heading text-xl font-bold tracking-tight">
            CLAN<span className="text-primary">NEXUS</span>
          </span>
        </div>

        <div className="relative space-y-6">
          <h1 className="font-heading text-5xl font-bold leading-[1.05] tracking-tight">
            Run your clan
            <br />
            like a <span className="text-primary">pro op.</span>
          </h1>
          <p className="max-w-md text-muted-foreground">
            Launch account groups across six regions, manage Basic &amp; Premium credit balances,
            mint gift coupons and audit every move — from one tactical dashboard.
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <Zap className="h-4 w-4 text-primary" /> Launch groups in seconds with live slot
              telemetry
            </li>
            <li className="flex items-center gap-3">
              <Coins className="h-4 w-4 text-sky-400" /> Two-credit economy: Basic &amp; Premium
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-[#FACC15]" /> Admin-verified Binance deposits
            </li>
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">Clan Nexus · Operations v1.0</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-5">
          <div className="lg:hidden">
            <div className="mb-6 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Gamepad2 className="h-5 w-5" />
              </span>
              <span className="font-heading text-xl font-bold tracking-tight">
                CLAN<span className="text-primary">NEXUS</span>
              </span>
            </div>
          </div>

          <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
            <CardContent className="p-6">
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2" data-testid="auth-tabs">
                  <TabsTrigger value="signin" data-testid="login-tab-signin">
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="signup" data-testid="login-tab-signup">
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-5 space-y-4">
                  <div className="space-y-1">
                    <h2 className="font-heading text-2xl font-bold tracking-tight">Welcome Back</h2>
                    <p className="text-sm text-muted-foreground">
                      Sign in to your command dashboard.
                    </p>
                  </div>
                  <form className="space-y-4" onSubmit={onLogin}>
                    <div className="space-y-2">
                      <Label htmlFor="login-username">Username</Label>
                      <Input
                        id="login-username"
                        placeholder="username or email"
                        autoComplete="username"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        data-testid="login-username-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        data-testid="login-password-input"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full font-semibold"
                      data-testid="login-submit-btn"
                      disabled={login.isPending}
                    >
                      {login.isPending ? "Signing in…" : "Sign In"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      data-testid="demo-fill-btn"
                      onClick={() => {
                        setIdentifier("player1");
                        setPassword("player1234");
                      }}
                    >
                      Fill demo account (player1)
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-5 space-y-4">
                  <div className="space-y-1">
                    <h2 className="font-heading text-2xl font-bold tracking-tight">Create Account</h2>
                    <p className="text-sm text-muted-foreground">
                      New commanders get 200 Basic + 50 Premium credits.
                    </p>
                  </div>
                  <form className="space-y-4" onSubmit={onSignup}>
                    <div className="space-y-2">
                      <Label htmlFor="signup-username">Username</Label>
                      <Input
                        id="signup-username"
                        placeholder="3–24 letters, digits or _"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        data-testid="signup-username-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email (optional)</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        data-testid="signup-email-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="min. 6 characters"
                        autoComplete="new-password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        data-testid="signup-password-input"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full font-semibold"
                      data-testid="signup-submit-btn"
                      disabled={signup.isPending}
                    >
                      {signup.isPending ? "Creating account…" : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-[#232834] bg-[#15181E]/95 shadow-xl backdrop-blur-sm">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Need help? Contact Admin</p>
                <p className="text-xs text-muted-foreground">
                  Payments, coupons or access — reach the operations desk.
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href="https://wa.me/8801700000000"
                  target="_blank"
                  rel="noreferrer"
                  data-testid="contact-whatsapp-btn"
                  aria-label="Contact admin on WhatsApp"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <MessageCircle className="h-4 w-4 text-[#4ADE80]" />
                  WhatsApp
                </a>
                <a
                  href="https://t.me/clannexus_admin"
                  target="_blank"
                  rel="noreferrer"
                  data-testid="contact-telegram-btn"
                  aria-label="Contact admin on Telegram"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Send className="h-4 w-4 text-sky-400" />
                  Telegram
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
