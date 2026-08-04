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
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ component: Component, ...rest }: any) {
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

  return (
    <AppShell>
      <Component {...rest} />
    </AppShell>
  );
}

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

      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      
      <Route path="/monitoring"><ProtectedRoute component={Monitoring} /></Route>
      <Route path="/control"><ProtectedRoute component={Control} /></Route>
      <Route path="/scheduler"><ProtectedRoute component={Scheduler} /></Route>
      <Route path="/energy"><ProtectedRoute component={Energy} /></Route>
      <Route path="/analytics"><ProtectedRoute component={Analytics} /></Route>
      <Route path="/health"><ProtectedRoute component={HealthScore} /></Route>
      <Route path="/signature"><ProtectedRoute component={Signature} /></Route>
      <Route path="/learning"><ProtectedRoute component={Learning} /></Route>
      <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
      <Route path="/firmware"><ProtectedRoute component={Firmware} /></Route>
      <Route path="/users"><ProtectedRoute component={Users} /></Route>
      <Route path="/reports"><ProtectedRoute component={Reports} /></Route>
      <Route path="/notifications"><ProtectedRoute component={Notifications} /></Route>
      <Route path="/faults"><ProtectedRoute component={Faults} /></Route>
      <Route path="/events"><ProtectedRoute component={Events} /></Route>

      <Route component={NotFound} />
    </Switch>
  );
}
