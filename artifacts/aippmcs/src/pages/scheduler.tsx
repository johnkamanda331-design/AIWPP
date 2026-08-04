import { useState } from "react";
import {
  useGetSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  type Schedule,
  type ScheduleInput,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Calendar, Clock, Plus, Trash2, Edit2, Play, Square, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const SCHEDULE_TYPES = [
  { value: "daily",             label: "Daily"             },
  { value: "weekly",            label: "Weekly"            },
  { value: "monthly",           label: "Monthly"           },
  { value: "holiday",           label: "Holiday"           },
  { value: "vacation",          label: "Vacation"          },
  { value: "manual_override",   label: "Manual Override"   },
  { value: "temporary_override",label: "Temporary Override"},
] as const;

const DAYS_OF_WEEK = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const emptyForm = (): ScheduleInput => ({
  name: "",
  type: "daily",
  startTime: "06:00",
  endTime: "18:00",
  days: [],
  startDate: null,
  endDate: null,
  isActive: true,
  priority: 1,
});

/* ── Schedule Form Dialog ──────────────────────────────────────────────────── */
function ScheduleDialog({
  open,
  onClose,
  initial,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  initial: ScheduleInput;
  onSave: (data: ScheduleInput) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<ScheduleInput>(initial);

  // Re-sync when dialog reopens with new initial values
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setForm(initial);
  }

  const set = (patch: Partial<ScheduleInput>) => setForm(f => ({ ...f, ...patch }));

  const toggleDay = (idx: number) => {
    const days = form.days ?? [];
    set({ days: days.includes(idx) ? days.filter(d => d !== idx) : [...days, idx] });
  };

  const needsDays      = form.type === "weekly";
  const needsDateRange = form.type === "holiday" || form.type === "vacation";

  const isValid =
    form.name.trim().length >= 2 &&
    form.startTime &&
    form.endTime &&
    (!needsDays || (form.days ?? []).length > 0) &&
    (!needsDateRange || (form.startDate && form.endDate));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md w-full mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {initial.name ? `Edit: ${initial.name}` : "New Schedule"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="sched-name" className="text-sm">Schedule Name</Label>
            <Input
              id="sched-name"
              placeholder="e.g. Morning Run"
              value={form.name}
              onChange={e => set({ name: e.target.value })}
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-sm">Type</Label>
            <Select value={form.type} onValueChange={(v: any) => set({ type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCHEDULE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start / Stop Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1">
                <Play className="w-3 h-3 text-primary" /> Start Time
              </Label>
              <Input type="time" value={form.startTime} onChange={e => set({ startTime: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1">
                <Square className="w-3 h-3 text-muted-foreground" /> Stop Time
              </Label>
              <Input type="time" value={form.endTime} onChange={e => set({ endTime: e.target.value })} />
            </div>
          </div>

          {/* Days of week */}
          {needsDays && (
            <div className="space-y-2">
              <Label className="text-sm">Days of Week</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={cn(
                      "w-9 h-9 rounded-full text-xs font-medium border transition-colors",
                      (form.days ?? []).includes(idx)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/40"
                    )}
                  >
                    {day[0]}
                  </button>
                ))}
              </div>
              {(form.days ?? []).length === 0 && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Select at least one day
                </p>
              )}
            </div>
          )}

          {/* Date Range */}
          {needsDateRange && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate ?? ""}
                  onChange={e => set({ startDate: e.target.value || null })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">End Date</Label>
                <Input
                  type="date"
                  value={form.endDate ?? ""}
                  onChange={e => set({ endDate: e.target.value || null })}
                />
              </div>
            </div>
          )}

          {/* Priority + Active */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/50">
            <div className="space-y-1.5">
              <Label className="text-sm">Priority (1 = highest)</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.priority ?? 1}
                onChange={e => set({ priority: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Active</Label>
              <div className="flex items-center gap-2 h-9">
                <Switch
                  checked={form.isActive ?? true}
                  onCheckedChange={v => set({ isActive: v })}
                />
                <span className="text-sm text-muted-foreground">{form.isActive ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
          </DialogClose>
          <Button
            className="w-full sm:w-auto"
            disabled={!isValid || saving}
            onClick={() => onSave(form)}
          >
            {saving ? "Saving…" : "Save Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────────── */
export default function Scheduler() {
  const { data: schedules, isLoading, refetch } = useGetSchedules();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Schedule | null>(null);

  const handleToggle = async (id: number, isActive: boolean) => {
    try {
      await updateSchedule.mutateAsync({ id, data: { isActive } });
      refetch();
    } catch {
      toast({ title: "Update Failed", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteSchedule.mutateAsync({ id });
      toast({ title: "Schedule Deleted" });
      refetch();
    } catch {
      toast({ title: "Delete Failed", variant: "destructive" });
    }
  };

  const handleCreate = async (data: ScheduleInput) => {
    try {
      await createSchedule.mutateAsync({ data });
      setCreateOpen(false);
      toast({ title: "Schedule Created", description: `"${data.name}" is now active.` });
      refetch();
    } catch {
      toast({ title: "Create Failed", description: "Could not save the schedule.", variant: "destructive" });
    }
  };

  const handleEdit = async (data: ScheduleInput) => {
    if (!editTarget) return;
    try {
      const { days, ...rest } = data;
      await updateSchedule.mutateAsync({ id: editTarget.id, data: { ...rest, days } });
      setEditTarget(null);
      toast({ title: "Schedule Updated", description: `"${data.name}" has been updated.` });
      refetch();
    } catch {
      toast({ title: "Update Failed", description: "Could not save changes.", variant: "destructive" });
    }
  };

  // Build today's timeline from active schedules
  const activeSchedules = (schedules ?? []).filter(s => s.isActive);
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Scheduler</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage automated pump start and stop schedules.
          </p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> New Schedule
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 sm:gap-6">
        {/* Schedule Cards */}
        <div className="xl:col-span-2 space-y-4">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)
          ) : !schedules?.length ? (
            <Card className="border-dashed">
              <CardContent className="py-12 flex flex-col items-center text-muted-foreground">
                <Calendar className="w-12 h-12 mb-4 opacity-30" />
                <p className="font-medium mb-1">No schedules configured</p>
                <p className="text-xs mb-4 text-center">Create a schedule to automate pump start and stop times.</p>
                <Button variant="outline" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Create First Schedule
                </Button>
              </CardContent>
            </Card>
          ) : (
            schedules.map(schedule => (
              <Card
                key={schedule.id}
                className={cn("shadow-sm border transition-opacity", !schedule.isActive && "opacity-60")}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Left panel: name + type + active toggle */}
                    <div className="p-4 sm:p-5 sm:w-2/5 border-b sm:border-b-0 sm:border-r border-border bg-muted/20 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge
                            variant={schedule.isActive ? "default" : "secondary"}
                            className="capitalize text-xs"
                          >
                            {schedule.type.replace("_", " ")}
                          </Badge>
                          <span className="text-xs font-mono text-muted-foreground px-1.5 bg-background border rounded">
                            Pri {schedule.priority}
                          </span>
                        </div>
                        <h3 className="font-bold text-base sm:text-lg leading-snug">{schedule.name}</h3>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Active</span>
                        <Switch
                          checked={schedule.isActive}
                          onCheckedChange={(v) => handleToggle(schedule.id, v)}
                        />
                      </div>
                    </div>

                    {/* Right panel: times + days + actions */}
                    <div className="p-4 sm:p-5 sm:w-3/5 flex flex-col justify-between gap-4">
                      {/* Times */}
                      <div className="flex items-start gap-6 sm:gap-8 flex-wrap">
                        <div className="space-y-1 min-w-0">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                            <Play className="w-3 h-3 text-primary" /> Start
                          </span>
                          <div className="font-mono text-xl sm:text-2xl font-bold">{schedule.startTime}</div>
                        </div>
                        <div className="space-y-1 min-w-0">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                            <Square className="w-3 h-3 text-muted-foreground" /> Stop
                          </span>
                          <div className="font-mono text-xl sm:text-2xl font-bold">{schedule.endTime}</div>
                        </div>
                        <div className="space-y-1 min-w-0">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Duration</span>
                          <div className="font-mono text-sm font-semibold text-muted-foreground">
                            {(() => {
                              const diff = toMinutes(schedule.endTime) - toMinutes(schedule.startTime);
                              if (diff <= 0) return "—";
                              const h = Math.floor(diff / 60);
                              const m = diff % 60;
                              return h > 0 ? `${h}h ${m > 0 ? m + "m" : ""}` : `${m}m`;
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Days */}
                      {schedule.type === "weekly" && schedule.days && (
                        <div className="flex flex-wrap gap-1.5">
                          {DAYS_OF_WEEK.map((day, idx) => (
                            <div
                              key={day}
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border",
                                schedule.days?.includes(idx)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted text-muted-foreground border-transparent"
                              )}
                            >
                              {day[0]}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Date range */}
                      {(schedule.type === "holiday" || schedule.type === "vacation") && (
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="font-mono">
                            {schedule.startDate ? String(schedule.startDate).substring(0, 10) : "—"}
                          </span>
                          <span className="text-muted-foreground">to</span>
                          <span className="font-mono">
                            {schedule.endDate ? String(schedule.endDate).substring(0, 10) : "—"}
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => setEditTarget(schedule)}
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(schedule.id, schedule.name)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Today's Timeline */}
        <div>
          <Card className="shadow-sm sticky top-0">
            <CardHeader className="pt-4 sm:pt-5 px-4 sm:px-5 pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" /> Today's Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5">
              {activeSchedules.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No active schedules today
                </div>
              ) : (
                <div className="relative space-y-0">
                  {/* 24-hr timeline */}
                  <div className="relative border-l-2 border-border ml-5 py-2">
                    {/* Now indicator */}
                    <div
                      className="absolute -left-1 w-2 h-2 rounded-full bg-primary z-10"
                      style={{ top: `${(nowMins / 1440) * 100}%` }}
                    />

                    {/* Hour labels */}
                    {[0, 6, 12, 18, 24].map(h => (
                      <div
                        key={h}
                        className="absolute -left-10 text-[10px] font-mono text-muted-foreground"
                        style={{ top: `calc(${(h / 24) * 100}% - 6px)` }}
                      >
                        {String(h).padStart(2, "0")}:00
                      </div>
                    ))}

                    {/* Schedule blocks */}
                    {activeSchedules.map(s => {
                      const startPct = (toMinutes(s.startTime) / 1440) * 100;
                      const endPct   = (toMinutes(s.endTime)   / 1440) * 100;
                      const heightPct = Math.max(endPct - startPct, 2);
                      return (
                        <div
                          key={s.id}
                          className="absolute left-2 right-0"
                          style={{ top: `${startPct}%`, height: `${heightPct}%`, minHeight: "20px" }}
                        >
                          <div className="h-full bg-primary/15 border-l-2 border-primary rounded-r-sm px-2 py-0.5 overflow-hidden">
                            <div className="text-[10px] font-medium text-primary truncate">{s.name}</div>
                            <div className="text-[9px] text-muted-foreground font-mono">
                              {s.startTime} – {s.endTime}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Spacer to give timeline height */}
                    <div className="invisible" style={{ height: "280px" }} />
                  </div>
                </div>
              )}

              {/* Summary */}
              {activeSchedules.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border/40 space-y-2">
                  {activeSchedules.slice(0, 3).map(s => (
                    <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="truncate font-medium">{s.name}</span>
                      </div>
                      <span className="font-mono text-muted-foreground shrink-0">
                        {s.startTime}–{s.endTime}
                      </span>
                    </div>
                  ))}
                  {activeSchedules.length > 3 && (
                    <div className="text-xs text-muted-foreground">+{activeSchedules.length - 3} more</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Dialog */}
      <ScheduleDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initial={emptyForm()}
        onSave={handleCreate}
        saving={createSchedule.isPending}
      />

      {/* Edit Dialog */}
      <ScheduleDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        initial={editTarget ? {
          name:      editTarget.name,
          type:      editTarget.type as any,
          startTime: editTarget.startTime,
          endTime:   editTarget.endTime,
          days:      editTarget.days ?? [],
          startDate: editTarget.startDate ? String(editTarget.startDate).substring(0, 10) : null,
          endDate:   editTarget.endDate   ? String(editTarget.endDate  ).substring(0, 10) : null,
          isActive:  editTarget.isActive,
          priority:  editTarget.priority,
        } : emptyForm()}
        onSave={handleEdit}
        saving={updateSchedule.isPending}
      />
    </div>
  );
}
