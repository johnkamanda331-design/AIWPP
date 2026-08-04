import { useGetFirmwareInfo, useTriggerFirmwareUpdate } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { HardDrive, Download, RotateCcw, AlertTriangle, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Firmware() {
  const { data: firmware, isLoading, refetch } = useGetFirmwareInfo({
    query: {
      queryKey: ['/api/firmware/info'],
      refetchInterval: (query) => query.state.data?.updateInProgress ? 2000 : false,
    }
  });
  const triggerUpdate = useTriggerFirmwareUpdate();
  const { toast } = useToast();

  const handleAction = async (action: any) => {
    if (!confirm(`Are you sure you want to ${action} firmware?`)) return;
    try {
      await triggerUpdate.mutateAsync({ data: { action } });
      toast({ title: "Firmware Action Started", description: `Executing ${action}...` });
      refetch();
    } catch (err) {
      toast({ title: "Action Failed", variant: "destructive" });
    }
  };

  if (isLoading) return <FirmwareSkeleton />;
  if (!firmware) return null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Firmware Management</h1>
        <p className="text-sm text-muted-foreground mt-1">OTA (Over-The-Air) updates for the ESP32 controller.</p>
      </div>

      <Card className="border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm">
        <CardContent className="p-6 flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-sidebar-primary/20 flex items-center justify-center shrink-0">
            <HardDrive className="w-8 h-8 text-sidebar-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider opacity-70 mb-1">Current Version</h2>
            <div className="text-3xl font-mono font-bold">{firmware.currentVersion}</div>
            <div className="text-sm opacity-80 mt-1">Installed on {new Date(firmware.currentDate).toLocaleDateString()}</div>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm bg-sidebar-primary/20 px-3 py-1.5 rounded-full border border-sidebar-primary/30 text-sidebar-primary-foreground">
            <ShieldCheck className="w-4 h-4" /> System Secured
          </div>
        </CardContent>
      </Card>

      {firmware.updateInProgress && (
        <Card className="border-primary/50 shadow-md">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <Download className="w-5 h-5 animate-bounce" /> Update in Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm font-medium">
              <span>Downloading & Flashing...</span>
              <span className="font-mono">{firmware.updateProgress || 0}%</span>
            </div>
            <Progress value={firmware.updateProgress || 0} className="h-3" />
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" /> Do not power off the controller during this process.
            </p>
          </CardContent>
        </Card>
      )}

      {!firmware.updateInProgress && firmware.availableUpdate ? (
        <Card className="border-info/30 bg-info/5">
          <CardHeader>
            <CardTitle className="text-info flex items-center gap-2">
              <Download className="w-5 h-5" /> Update Available: {firmware.availableUpdate}
            </CardTitle>
            {firmware.availableUpdateDate && (
              <CardDescription>Released {new Date(firmware.availableUpdateDate).toLocaleDateString()}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {firmware.releaseNotes && (
              <div className="bg-background rounded border p-4 text-sm font-medium mb-6">
                <pre className="font-sans whitespace-pre-wrap">{firmware.releaseNotes}</pre>
              </div>
            )}
            <Button onClick={() => handleAction('update')} size="lg" className="w-full gap-2">
              <Download className="w-5 h-5" /> Install Update
            </Button>
          </CardContent>
        </Card>
      ) : !firmware.updateInProgress ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-8 text-muted-foreground">
            <ShieldCheck className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-medium">Your firmware is up to date.</p>
          </CardContent>
        </Card>
      ) : null}

      {firmware.canRollback && !firmware.updateInProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recovery</CardTitle>
            <CardDescription>If the current firmware is unstable, you can revert to the previous version.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => handleAction('rollback')} variant="outline" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
              <RotateCcw className="w-4 h-4" /> Rollback to {firmware.rollbackVersion || 'Previous Version'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FirmwareSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
