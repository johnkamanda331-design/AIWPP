import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MtiririkoLogo } from "@/components/ui/logo";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  Eye, EyeOff, LogIn, ShieldCheck, UserCog,
  Wrench, Eye as EyeIcon, Lock, User,
  AlertTriangle, CheckCircle2, ArrowLeft,
  Shield, Clock,
} from "lucide-react";

// ─── Permission-level metadata (mirrors users.tsx) ──────────────────────────

const ROLES = [
  {
    icon: ShieldCheck,
    label: "Administrator",
    desc: "Full system access — users, config, all data",
    bg: "bg-primary/15 border-primary/30",
    color: "text-primary",
  },
  {
    icon: UserCog,
    label: "Technician",
    desc: "Monitor, control pumps, acknowledge faults",
    bg: "bg-blue-500/15 border-blue-400/30",
    color: "text-blue-300",
  },
  {
    icon: Wrench,
    label: "Maintenance",
    desc: "Schedule and log maintenance tasks",
    bg: "bg-amber-500/15 border-amber-400/30",
    color: "text-amber-300",
  },
  {
    icon: EyeIcon,
    label: "Viewer",
    desc: "Read-only access to dashboards and reports",
    bg: "bg-white/5 border-white/10",
    color: "text-white/50",
  },
] as const;

// ─── Password strength ────────────────────────────────────────────────────────

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: "", color: "" };
  let s = 0;
  if (pw.length >= 8)  s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  if      (s <= 1) return { score: 20, label: "Very weak",  color: "bg-destructive"  };
  else if (s === 2) return { score: 40, label: "Weak",       color: "bg-orange-500"   };
  else if (s === 3) return { score: 60, label: "Moderate",   color: "bg-amber-500"    };
  else if (s === 4) return { score: 80, label: "Strong",     color: "bg-primary/80"   };
  else              return { score: 100, label: "Very strong", color: "bg-primary"     };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const REMEMBER_KEY = "mtiririko_remember_username";
const MAX_CLIENT_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

type Mode = "login" | "setup";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Login() {
  const { login, registerFirst } = useAuth();
  const [, setLocation] = useLocation();

  const [mode, setMode] = useState<Mode>("login");

  // Form state
  const [username,  setUsername]  = useState(() => localStorage.getItem(REMEMBER_KEY) ?? "");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [remember,  setRemember]  = useState(() => !!localStorage.getItem(REMEMBER_KEY));
  const [showPw,    setShowPw]    = useState(false);

  // UX state
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});

  // Client-side lockout
  const [attempts,      setAttempts]      = useState(0);
  const [lockedUntil,   setLockedUntil]   = useState<Date | null>(null);
  const [countdown,     setCountdown]     = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live clock on the left panel
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Lockout countdown
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.ceil((lockedUntil.getTime() - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setCountdown(0);
        setAttempts(0);
        if (countdownRef.current) clearInterval(countdownRef.current);
      } else {
        setCountdown(remaining);
      }
    };
    tick();
    countdownRef.current = setInterval(tick, 500);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && countdown > 0;

  const switchMode = (next: Mode) => {
    setMode(next);
    setPassword("");
    setEmail("");
    setError(null);
    setFieldErrs({});
    setShowPw(false);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!username.trim())        errs.username = "Username is required";
    if (mode === "setup") {
      if (!email.trim())          errs.email    = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email";
    }
    if (!password)               errs.password = "Password is required";
    else if (mode === "setup" && password.length < 8) errs.password = "At least 8 characters required";
    setFieldErrs(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || !validate()) return;

    setIsLoading(true);
    setError(null);

    try {
      await login({ username: username.trim(), password });

      // Persist remember-me
      if (remember) localStorage.setItem(REMEMBER_KEY, username.trim());
      else          localStorage.removeItem(REMEMBER_KEY);

      setAttempts(0);
      setLocation("/");
    } catch (err: any) {
      const msg: string = err?.response?.data?.error ?? err?.message ?? "Authentication failed";

      // Server-side lockout response
      if (err?.response?.data?.remainingSeconds) {
        const until = new Date(Date.now() + err.response.data.remainingSeconds * 1000);
        setLockedUntil(until);
        setError(null);
        return;
      }

      // Client-side attempt tracking
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_CLIENT_ATTEMPTS) {
        setLockedUntil(new Date(Date.now() + LOCKOUT_SECONDS * 1000));
        setError(null);
      } else {
        const left = MAX_CLIENT_ATTEMPTS - next;
        setError(
          msg.includes("locked")
            ? msg
            : `${msg} — ${left} attempt${left !== 1 ? "s" : ""} remaining before temporary lockout.`,
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setError(null);
    try {
      await registerFirst({ username: username.trim(), email: email.trim(), password });
      if (remember) localStorage.setItem(REMEMBER_KEY, username.trim());
      setLocation("/");
    } catch (err: any) {
      const msg: string = err?.message ?? "Setup failed";
      if (msg.includes("Registration is closed") || msg.includes("already exists")) {
        setError("An administrator account already exists. Sign in instead.");
        switchMode("login");
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const pwStrength = passwordStrength(password);

  return (
    <div className="min-h-screen w-full flex">

      {/* ── Left panel — branding + permission tiers ─────────────────────── */}
      <div className="hidden lg:flex flex-col w-[420px] xl:w-[480px] shrink-0 bg-sidebar text-sidebar-foreground p-10 relative overflow-hidden">

        {/* Decorative radial glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-primary/6 blur-2xl pointer-events-none" />

        {/* Logo + title */}
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary mb-6 shadow-lg">
            <MtiririkoLogo size={30} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-sidebar-foreground">Mtiririko</h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mt-1">AIPPMCS</p>
          <p className="text-sm text-sidebar-foreground/60 mt-3 leading-relaxed max-w-xs">
            Adaptive Intelligent Water Pump Protection, Monitoring and Control System
          </p>
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-sidebar-border/60 relative z-10" />

        {/* Role cards */}
        <div className="relative z-10 space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/40 mb-4">
            Access Permission Levels
          </p>
          {ROLES.map(r => {
            const Icon = r.icon;
            return (
              <div
                key={r.label}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border transition-colors",
                  r.bg,
                )}
              >
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", r.bg, "border-0")}>
                  <Icon className={cn("w-3.5 h-3.5", r.color)} />
                </div>
                <div>
                  <div className={cn("text-sm font-semibold", r.color)}>{r.label}</div>
                  <div className="text-xs text-sidebar-foreground/50 mt-0.5 leading-snug">{r.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/40">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono">
              {now.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              {" · "}
              {now.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/4 border border-white/8">
            <Shield className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs text-sidebar-foreground/50 leading-snug">
              Protected system — all access is logged and audited
            </span>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-background relative">

        {/* Subtle radial bg */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,var(--color-primary)_0%,transparent_60%)] opacity-[0.03] pointer-events-none" />

        {/* Mobile logo */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground mb-3 shadow-lg">
            <MtiririkoLogo size={26} />
          </div>
          <h2 className="font-bold text-lg tracking-tight">Mtiririko</h2>
          <p className="text-xs text-muted-foreground">Pump Protection &amp; Control System</p>
        </div>

        <div className="w-full max-w-sm relative z-10">

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {mode === "login" ? "Welcome back" : "System setup"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              {mode === "login"
                ? "Enter your credentials to access the system."
                : "Create the initial administrator account to get started."}
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-lg bg-destructive/8 border border-destructive/25 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Lockout banner */}
          {isLocked && (
            <div className="flex items-center gap-2.5 p-3.5 mb-5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-sm">
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                Too many failed attempts — wait{" "}
                <strong className="font-mono">{countdown}s</strong> before trying again.
              </span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={mode === "login" ? handleLogin : handleSetup} noValidate className="space-y-4">

            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => { setUsername(e.target.value); if (fieldErrs.username) setFieldErrs(f => ({ ...f, username: "" })); }}
                  disabled={isLoading || isLocked}
                  autoComplete="username"
                  className={cn("pl-9", fieldErrs.username && "border-destructive focus-visible:ring-destructive/30")}
                />
              </div>
              {fieldErrs.username && <p className="text-xs text-destructive">{fieldErrs.username}</p>}
            </div>

            {/* Email (setup only) */}
            {mode === "setup" && (
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (fieldErrs.email) setFieldErrs(f => ({ ...f, email: "" })); }}
                  disabled={isLoading}
                  autoComplete="email"
                  className={cn(fieldErrs.email && "border-destructive focus-visible:ring-destructive/30")}
                />
                {fieldErrs.email && <p className="text-xs text-destructive">{fieldErrs.email}</p>}
              </div>
            )}

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder={mode === "setup" ? "Minimum 8 characters" : "Enter your password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); if (fieldErrs.password) setFieldErrs(f => ({ ...f, password: "" })); }}
                  disabled={isLoading || isLocked}
                  autoComplete={mode === "setup" ? "new-password" : "current-password"}
                  className={cn(
                    "pl-9 pr-10",
                    fieldErrs.password && "border-destructive focus-visible:ring-destructive/30",
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrs.password && <p className="text-xs text-destructive">{fieldErrs.password}</p>}

              {/* Password strength (setup only) */}
              {mode === "setup" && password.length > 0 && (
                <div className="space-y-1 pt-0.5">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-300", pwStrength.color)}
                      style={{ width: `${pwStrength.score}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Strength: <span className={cn(
                        "font-medium",
                        pwStrength.score <= 20 ? "text-destructive" :
                        pwStrength.score <= 40 ? "text-orange-500"  :
                        pwStrength.score <= 60 ? "text-amber-500"   : "text-primary",
                      )}>{pwStrength.label}</span>
                    </p>
                    {pwStrength.score === 100 && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Remember me (login only) */}
            {mode === "login" && (
              <label className="flex items-center gap-2.5 cursor-pointer group w-fit">
                <div
                  role="checkbox"
                  aria-checked={remember}
                  onClick={() => setRemember(v => !v)}
                  className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer shrink-0",
                    remember
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border group-hover:border-muted-foreground",
                  )}
                >
                  {remember && <CheckCircle2 className="w-3 h-3" />}
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors select-none">
                  Remember username
                </span>
              </label>
            )}

            {/* Setup hint */}
            {mode === "setup" && (
              <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/15 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Administrator account</p>
                <p>This account will have full system control. Use a strong, unique password and store it securely. Additional users can be created from User Management after setup.</p>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading || isLocked}
              className="w-full gap-2 mt-2"
              size="lg"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {mode === "login" ? "Authenticating…" : "Creating account…"}
                </span>
              ) : isLocked ? (
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Locked — {countdown}s
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {mode === "login" ? <LogIn className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  {mode === "login" ? "Sign In" : "Create Administrator Account"}
                </span>
              )}
            </Button>
          </form>

          {/* Attempt indicator */}
          {mode === "login" && attempts > 0 && attempts < MAX_CLIENT_ATTEMPTS && !isLocked && (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {Array.from({ length: MAX_CLIENT_ATTEMPTS }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    i < attempts ? "bg-destructive" : "bg-muted",
                  )}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-1">
                {MAX_CLIENT_ATTEMPTS - attempts} attempt{MAX_CLIENT_ATTEMPTS - attempts !== 1 ? "s" : ""} left
              </span>
            </div>
          )}

          {/* Mode switch + footer */}
          <div className="mt-8 pt-6 border-t border-border flex flex-col items-center gap-3">
            {mode === "login" ? (
              <button
                type="button"
                onClick={() => switchMode("setup")}
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                First-time setup →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back to sign in
              </button>
            )}
            <p className="text-xs text-muted-foreground/60 text-center">
              Authorized personnel only · All access is logged
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
