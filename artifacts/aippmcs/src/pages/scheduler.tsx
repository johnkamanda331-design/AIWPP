import { useState } from "react";
import { useGetSchedules, useUpdateSchedule, useDeleteSchedule, Schedule } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, Plus, Trash2, Edit2, Play, Square } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Scheduler() {
  const { data: schedules, isLoading, refetch } = useGetSchedules();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const { toast } = useToast();

  const handleToggle = async (id: number, isActive: boolean) => {
    try {
      await updateSchedule.mutateAsync({ id, data: { isActive } });
      refetch();
    } catch (err) {
      toast({ title: "Update Failed", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if(!confirm("Delete this schedule?")) return;
    try {
      await deleteSchedule.mutateAsync({ id });
      refetch();
    } catch (err) {
      toast({ title: "Delete Failed", variant: "destructive" });
    }
  };

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scheduler</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage automated start and stop times for the pump.</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> New Schedule
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            Array(3).fill(0).map((_,i) => <Skeleton key={i} className="h-32 w-full" />)
          ) : schedules?.length === 0 ? (
            <Card className="border-dashed py-12 flex flex-col items-center text-muted-foreground">
              <Calendar className="w-12 h-12 mb-4 opacity-50" />
              <p>No schedules configured</p>
              <Button variant="outline" className="mt-4">Create First Schedule</Button>
            </Card>
          ) : (
            schedules?.map(schedule => (
              <Card key={schedule.id} className={cn("shadow-sm transition-opacity", !schedule.isActive && "opacity-60")}>
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    <div className="p-4 sm:p-6 sm:w-1/3 border-b sm:border-b-0 sm:border-r border-border flex flex-col justify-center bg-muted/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={schedule.isActive ? "default" : "secondary"} className="capitalize">
                          {schedule.type.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground px-2 bg-background border rounded">Pri: {schedule.priority}</span>
                      </div>
                      <h3 className="font-bold text-lg">{schedule.name}</h3>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-sm font-medium">Active</span>
                        <Switch 
                          checked={schedule.isActive} 
                          onCheckedChange={(v) => handleToggle(schedule.id, v)} 
                        />
                      </div>
                    </div>
                    
                    <div className="p-4 sm:p-6 sm:w-2/3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-6 mb-4">
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1 uppercase tracking-wider"><Play className="w-3 h-3 text-primary" /> Start</span>
                            <div className="font-mono text-2xl font-bold">{schedule.startTime}</div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1 uppercase tracking-wider"><Square className="w-3 h-3 text-muted-foreground" /> Stop</span>
                            <div className="font-mono text-2xl font-bold">{schedule.endTime}</div>
                          </div>
                        </div>
                        
                        {schedule.type === 'weekly' && schedule.days && (
                          <div className="flex gap-1 mt-4">
                            {daysOfWeek.map((day, idx) => (
                              <div key={day} className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border",
                                schedule.days?.includes(idx) ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-transparent"
                              )}>
                                {day[0]}
                              </div>
                            ))}
                          </div>
                        )}
                        {(schedule.type === 'holiday' || schedule.type === 'vacation') && (
                          <div className="text-sm mt-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono">{schedule.startDate}</span> to <span className="font-mono">{schedule.endDate}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border/50">
                        <Button variant="ghost" size="sm" className="h-8"><Edit2 className="w-4 h-4 mr-2" /> Edit</Button>
                        <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(schedule.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Today's Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-64 border-l-2 border-border ml-4 py-2 flex flex-col justify-between text-sm">
                <div className="absolute top-0 -left-2 w-4 h-4 rounded-full bg-background border-2 border-primary" />
                <div className="absolute top-1/4 -left-[3px] w-2 h-2 rounded-full bg-primary" />
                <div className="absolute bottom-1/4 -left-[3px] w-2 h-2 rounded-full bg-muted-foreground" />
                
                <div className="pl-6">
                  <div className="text-xs text-muted-foreground">00:00</div>
                </div>
                <div className="pl-6 relative -top-6">
                  <div className="font-mono font-bold text-primary">06:00</div>
                  <div className="text-xs bg-primary/10 text-primary-foreground font-medium px-2 py-1 rounded inline-block mt-1">Morning Run</div>
                </div>
                <div className="pl-6 relative top-6">
                  <div className="font-mono font-bold text-muted-foreground">18:00</div>
                  <div className="text-xs text-muted-foreground mt-1">Stop</div>
                </div>
                <div className="pl-6">
                  <div className="text-xs text-muted-foreground">23:59</div>
                </div>
                
                {/* Active range bar */}
                <div className="absolute top-1/4 bottom-1/4 left-[-2px] w-1 bg-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
