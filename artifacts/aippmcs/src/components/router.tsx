import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { AppShell } from '@/components/layout/shell';
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Monitoring from '@/pages/monitoring';
import Faults from '@/pages/faults';
import Events from '@/pages/events';
import Control from '@/pages/control';
import Scheduler from '@/pages/scheduler';
import Energy from '@/pages/energy';
import Analytics from '@/pages/analytics';
import HealthScore from '@/pages/health';
import Signature from '@/pages/signature';
import Learning from '@/pages/learning';
import Settings from '@/pages/settings';
import Firmware from '@/pages/firmware';
import Users from '@/pages/users';
import Reports from '@/pages/reports';
import Notifications from '@/pages/notifications';
import NotFound from '@/pages/not-found';
import { Loader2, ShieldOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';

// ─── Role metadata (mirrors login.tsx / shell.tsx) ────────────────────────────

type Role = "administrator" | "technician" | "maintenance" | "viewer";

const ROLE_META: Record<Role, { label: string; color: string; bg: string }> = {
  administrator: { label: "Administrator", color: "text-primary",              bg: "bg-primary/10 border-primary/30"              },
  technician:    { label: "Technician",    color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"   },
  maintenance:   { label: "Maintenance",   color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400" },
  viewer:        { label: "Viewer",        color: "text-muted-foreground",      bg: "bg-secondary border-border text-muted-foreground" },
};

// ─── Access Denied ────────────────────────────────────────────────────────────

function AccessDenied({ requiredRoles }: { requiredRoles?: Role[] }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const userMeta = user ? ROLE_META[user.role as Role] : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 select-none">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/25 flex items-center justify-center mb-5">
        <ShieldOff className="w-7 h-7 text-destructive" />
      </div>

      <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">Access Denied</h2>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
        You don't have permission to view this page.
        {requiredRoles && requiredRoles.length > 0 && (
          <> Required role{requiredRoles.length > 1 ? "s" : ""}:{" "}
            <strong className="text-foreground">{requiredRoles.map(r => ROLE_META[r]?.label ?? r).join(", ")}</strong>.
          </>
        )}
      </p>

      {userMeta && user && (
        <div className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border mb-6",
          userMeta.bg,
        )}>
          <span className={userMeta.color}>Your role: {userMeta.label}</span>
        </div>
      )}

      <Button variant="outline" size="sm" className="gap-2" onClick={() => setLocation("/")}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </Button>
    </div>
  );
}

// ─── Protected Route ──────────────────────────────────────────────────────────

function ProtectedRoute({
  component: Component,
  roles,
  ...rest
}: {
  component: React.ComponentType<any>;
  roles?: Role[];
  [key: string]: any;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  // Role gate — show AccessDenied inside the shell so nav remains available
  if (roles && !roles.includes(user.role as Role)) {
    return (
      <AppShell>
        <AccessDenied requiredRoles={roles} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Component {...rest} />
    </AppShell>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

export function Router() {
  const { user, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/login">
        {() => {
          if (isLoading) return null;
          if (user) return <Redirect to="/" />;
          return <Login />;
        }}
      </Route>

      {/* Open to all authenticated users */}
      <Route path="/"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/monitoring"><ProtectedRoute component={Monitoring} /></Route>
      <Route path="/faults"><ProtectedRoute component={Faults} /></Route>
      <Route path="/events"><ProtectedRoute component={Events} /></Route>
      <Route path="/health"><ProtectedRoute component={HealthScore} /></Route>
      <Route path="/scheduler"><ProtectedRoute component={Scheduler} /></Route>
      <Route path="/energy"><ProtectedRoute component={Energy} /></Route>
      <Route path="/learning"><ProtectedRoute component={Learning} /></Route>
      <Route path="/signature"><ProtectedRoute component={Signature} /></Route>
      <Route path="/analytics"><ProtectedRoute component={Analytics} /></Route>
      <Route path="/reports"><ProtectedRoute component={Reports} /></Route>
      <Route path="/notifications"><ProtectedRoute component={Notifications} /></Route>

      {/* Restricted: viewers cannot issue control commands */}
      <Route path="/control">
        <ProtectedRoute component={Control} roles={["administrator", "technician", "maintenance"]} />
      </Route>

      {/* Restricted: system settings — administrator only */}
      <Route path="/settings">
        <ProtectedRoute component={Settings} roles={["administrator"]} />
      </Route>

      {/* Restricted: firmware OTA — administrator only */}
      <Route path="/firmware">
        <ProtectedRoute component={Firmware} roles={["administrator"]} />
      </Route>

      {/* Restricted: user management — administrator only */}
      <Route path="/users">
        <ProtectedRoute component={Users} roles={["administrator"]} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}
