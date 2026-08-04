import { useGetLiveData, useSendControlCommand } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Power, RotateCcw, AlertTriangle, ShieldAlert, Lock, Unlock, CalendarX, KeySquare } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Control() {
  const { data: telemetry, isLoading } = useGetLiveData({ query: { refetchInterval: 2000 } });
  const sendCommand = useSendControlCommand();
  const { toast } = useToast();
  const [controlsLocked, setControlsLocked] = useState(false);

  const handleCommand = async (action: any, requireConfirmation = false) => {
    try {
      await sendCommand.mutateAsync({ data: { action } });
      toast({
        title: "Command Sent",
        description: `Action '${action}' accepted by controller.`,
      });
    } catch (err) {
      toast({
        title: "Command Failed",
        description: "Failed to send command to controller. Check connection.",
        variant: "destructive"
      });
    }
  };

  const isRunning = telemetry?.motorState === "running";
  const hasFault = telemetry?.motorState === "fault";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Remote Control</h1>
          <p className="text-sm text-muted-foreground mt-1">Issue commands directly to the ESP32 controller.</p>
        </div>
        <Button 
          variant={controlsLocked ? "outline" : "secondary"} 
          onClick={() => setControlsLocked(!controlsLocked)}
          className="gap-2"
        >
          {controlsLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          {controlsLocked ? "Controls Locked" : "Controls Unlocked"}
        </Button>
      </div>

      {telemetry && (
        <Card className="bg-sidebar border-sidebar-border shadow-sm text-sidebar-foreground">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center border-4 shadow-inner",
                isRunning ? "bg-primary border-primary/30 text-primary-foreground" :
                hasFault ? "bg-destructive border-destructive/30 text-destructive-foreground" :
                "bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
              )}>
                {hasFault ? <AlertTriangle className="w-8 h-8 animate-pulse" /> : <Power className="w-8 h-8" />}
              </div>
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider opacity-70">Current Motor State</h2>
                <p className="text-3xl font-bold capitalize">{telemetry.motorState}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm border-l border-sidebar-border pl-8">
              <div className="flex justify-between gap-4">
                <span className="opacity-70">Relay</span>
                <span className="font-medium capitalize">{telemetry.relayState}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="opacity-70">Voltage</span>
                <span className="font-mono">{telemetry.voltage.toFixed(1)}V</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="opacity-70">Supply</span>
                <span className="font-medium capitalize">{telemetry.supplyState}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="opacity-70">Current</span>
                <span className="font-mono">{telemetry.current.toFixed(2)}A</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start / Stop */}
        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle>Primary Operation</CardTitle>
            <CardDescription>Manual control overrides scheduling</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button 
              size="lg" 
              disabled={controlsLocked || isRunning || hasFault}
              className="h-24 flex flex-col gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-lg"
              onClick={() => handleCommand("start")}
            >
              <Power className="w-6 h-6" />
              Start Pump
            </Button>
            
            <CommandDialog 
              action="stop"
              title="Stop Pump"
              description="Are you sure you want to manually stop the pump? This will override active schedules."
              disabled={controlsLocked || !isRunning}
              trigger={
                <Button 
                  size="lg" 
                  variant="outline"
                  disabled={controlsLocked || !isRunning}
                  className="h-24 flex flex-col gap-2 text-lg hover:bg-muted"
                >
                  <Power className="w-6 h-6" />
                  Stop Pump
                </Button>
              }
              onConfirm={() => handleCommand("stop")}
            />
          </CardContent>
        </Card>

        {/* Emergency */}
        <Card className="shadow-sm border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Emergency
            </CardTitle>
            <CardDescription>Immediate forced actions</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <CommandDialog 
              action="emergency_stop"
              title="EMERGENCY STOP"
              description="DANGER: This will immediately cut power to the relay, bypassing normal shutdown procedures. Only use in an emergency."
              disabled={controlsLocked}
              trigger={
                <Button 
                  size="lg" 
                  variant="destructive"
                  disabled={controlsLocked}
                  className="w-full h-16 text-lg font-bold uppercase tracking-wider"
                >
                  Emergency Stop
                </Button>
              }
              onConfirm={() => handleCommand("emergency_stop")}
            />
          </CardContent>
        </Card>

        {/* System Recovery */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>System Recovery</CardTitle>
            <CardDescription>Reset state and reboot hardware</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <CommandDialog 
              action="reset_fault"
              title="Reset Faults"
              description="Clear all active faults. Ensure the root cause has been addressed before resetting."
              disabled={controlsLocked || !hasFault}
              trigger={
                <Button 
                  variant="secondary" 
                  className="h-16 flex flex-col gap-1"
                  disabled={controlsLocked || !hasFault}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Reset Fault
                </Button>
              }
              onConfirm={() => handleCommand("reset_fault")}
            />
            
            <CommandDialog 
              action="restart"
              title="Restart Controller"
              description="This will soft-reboot the ESP32 controller. Comms will be lost for ~10 seconds."
              disabled={controlsLocked}
              trigger={
                <Button 
                  variant="outline" 
                  className="h-16 flex flex-col gap-1"
                  disabled={controlsLocked}
                >
                  <RotateCcw className="w-4 h-4" />
                  Restart Controller
                </Button>
              }
              onConfirm={() => handleCommand("restart")}
            />
          </CardContent>
        </Card>

        {/* Operating Modes */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Operating Modes</CardTitle>
            <CardDescription>Change automation behavior</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-16 flex flex-col gap-1"
              disabled={controlsLocked}
              onClick={() => handleCommand("enable_auto")}
            >
              <KeySquare className="w-4 h-4" />
              Auto Mode
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex flex-col gap-1 border-dashed"
              disabled={controlsLocked}
              onClick={() => handleCommand("disable_scheduling")}
            >
              <CalendarX className="w-4 h-4" />
              Disable Scheduling
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

function CommandDialog({ trigger, title, description, onConfirm, disabled }: any) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild disabled={disabled}>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className={title.includes("STOP") || title.includes("Restart") ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
