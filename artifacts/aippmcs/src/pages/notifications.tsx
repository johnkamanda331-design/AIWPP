import { useGetNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check, CheckCheck, ShieldAlert, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const { data: notifications, isLoading, refetch } = useGetNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleMarkRead = async (id: number) => {
    await markRead.mutateAsync({ id });
    refetch();
  };

  const handleMarkAllRead = async () => {
    await markAllRead.mutateAsync();
    refetch();
  };

  if (isLoading) return <NotificationsSkeleton />;

  const getIcon = (sev: string) => {
    switch(sev) {
      case "critical": return <ShieldAlert className="w-5 h-5 text-destructive" />;
      case "high": return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "medium": return <AlertCircle className="w-5 h-5 text-warning" />;
      default: return <Info className="w-5 h-5 text-info" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">System alerts and messages</p>
        </div>
        {notifications && notifications.some(n => !n.isRead) && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-2">
            <CheckCheck className="w-4 h-4" /> Mark all as read
          </Button>
        )}
      </div>

      {notifications?.length === 0 ? (
        <Card className="border-dashed py-12 flex flex-col items-center text-muted-foreground">
          <Bell className="w-12 h-12 mb-4 opacity-50" />
          <p>No notifications</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications?.map(notif => (
            <Card key={notif.id} className={cn("shadow-sm transition-colors", !notif.isRead ? "bg-muted/30 border-l-4 border-l-primary" : "opacity-80")}>
              <CardContent className="p-4 flex gap-4">
                <div className="mt-1 shrink-0">
                  {getIcon(notif.severity)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <h4 className={cn("font-medium", !notif.isRead && "font-semibold")}>{notif.message}</h4>
                    <span className="text-xs text-muted-foreground font-mono bg-background px-2 py-0.5 rounded border">
                      {new Date(notif.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {notif.details && <p className="text-sm text-muted-foreground">{notif.details}</p>}
                </div>
                {!notif.isRead && (
                  <div className="shrink-0 flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => handleMarkRead(notif.id)} title="Mark as read">
                      <Check className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Skeleton className="h-10 w-48" />
      <div className="space-y-3">
        {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    </div>
  );
}
