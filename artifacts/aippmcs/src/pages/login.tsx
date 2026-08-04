import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MtiririkoLogo } from "@/components/ui/logo";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

type Mode = "login" | "setup";

export default function Login() {
  const { login, registerFirst } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("login");
  const [isLoading, setIsLoading] = useState(false);

  // Shared fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // Setup-only fields
  const [email, setEmail] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setIsLoading(true);
    try {
      await login({ username, password });
      setLocation("/");
    } catch {
      toast({
        title: "Authentication Failed",
        description: "Invalid username or password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) return;
    setIsLoading(true);
    try {
      await registerFirst({ username, email, password });
      setLocation("/");
    } catch (err: any) {
      const msg: string = err?.message ?? "Setup failed";
      if (msg.includes("Registration is closed")) {
        toast({
          title: "Setup Unavailable",
          description: "An administrator account already exists. Sign in instead.",
          variant: "destructive",
        });
        setMode("login");
      } else {
        toast({ title: "Setup Failed", description: msg, variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background items-center justify-center p-4">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/5 via-background to-background" />

      <Card className="w-full max-w-md z-10 border-border/60 shadow-2xl bg-card/90 backdrop-blur-md">
        <CardHeader className="space-y-3 pb-6 text-center">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center text-primary-foreground mb-1 shadow-lg mx-auto">
            <MtiririkoLogo size={28} />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Mtiririko</CardTitle>
          <CardDescription className="font-medium text-muted-foreground">
            {mode === "login"
              ? "Pump Protection & Control System"
              : "First-time setup — create the administrator account"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="operator"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="bg-background"
                />
              </div>
              <Button className="w-full mt-6" type="submit" disabled={isLoading}>
                {isLoading ? "Authenticating…" : "Sign In"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="su-username">Username</Label>
                <Input
                  id="su-username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-email">Email</Label>
                <Input
                  id="su-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-password">Password</Label>
                <Input
                  id="su-password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="bg-background"
                />
              </div>
              <Button className="w-full mt-6" type="submit" disabled={isLoading}>
                {isLoading ? "Creating account…" : "Create Administrator Account"}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex flex-col items-center gap-3 pt-4 border-t border-border/40 mt-2">
          {mode === "login" ? (
            <button
              type="button"
              onClick={() => { setMode("setup"); setUsername(""); setPassword(""); }}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              First-time setup →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setMode("login"); setEmail(""); setPassword(""); }}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              ← Back to sign in
            </button>
          )}
          <p className="text-xs text-muted-foreground">Authorized personnel only. All access is logged.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
