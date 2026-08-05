import { useState } from "react";
import {
  useGetUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "@workspace/api-client-react";
import { User, UserInputRole, UserUpdateRole } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users as UsersIcon,
  Plus,
  Trash2,
  Pencil,
  ShieldCheck,
  Wrench,
  Eye,
  UserCog,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Search,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Role config ─────────────────────────────────────────────────────────────

const ROLES = ["administrator", "technician", "maintenance", "viewer"] as const;
type RoleKey = typeof ROLES[number];

const ROLE_META: Record<RoleKey, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  description: string;
}> = {
  administrator: {
    label: "Administrator",
    icon: ShieldCheck,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/30 text-primary",
    description: "Full system access — manage users, config, and all data",
  },
  technician: {
    label: "Technician",
    icon: UserCog,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
    description: "Monitor, control, and acknowledge faults",
  },
  maintenance: {
    label: "Maintenance",
    icon: Wrench,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
    description: "Schedule maintenance tasks and view service records",
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    color: "text-muted-foreground",
    bg: "bg-secondary border-border text-muted-foreground",
    description: "Read-only access to dashboards and reports",
  },
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Users() {
  const { user: currentUser } = useAuth();
  const { data: users = [], isLoading, refetch } = useGetUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const { toast } = useToast();

  const [search,        setSearch]        = useState("");
  const [roleFilter,    setRoleFilter]    = useState<RoleKey | "all">("all");
  const [addOpen,       setAddOpen]       = useState(false);
  const [editTarget,    setEditTarget]    = useState<User | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<User | null>(null);

  if (currentUser?.role !== "administrator") return <Redirect to="/" />;
  if (isLoading) return <PageSkeleton />;

  // Derived counts
  const total  = users.length;
  const active = users.filter(u => u.isActive).length;
  const byRole = Object.fromEntries(
    ROLES.map(r => [r, users.filter(u => u.role === r).length]),
  ) as Record<RoleKey, number>;

  // Filtered list
  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser.mutateAsync({ id: deleteTarget.id });
      toast({ title: "User removed", description: `${deleteTarget.username} has been deleted.` });
      refetch();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control who can access the AIPPMCS platform and at what permission level.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add User
        </Button>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatChip label="Total Users" value={total}  icon={UsersIcon}   />
        <StatChip label="Active"      value={active} icon={CheckCircle2} color="text-primary" />
        {ROLES.map(r => {
          const meta = ROLE_META[r];
          return (
            <StatChip
              key={r}
              label={meta.label}
              value={byRole[r]}
              icon={meta.icon}
              color={meta.color}
            />
          );
        })}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["all", ...ROLES] as const).map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer",
                roleFilter === r
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-muted-foreground",
              )}
            >
              {r === "all" ? "All" : ROLE_META[r].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── User table ──────────────────────────────────────────────────── */}
      <Card className="shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <UsersIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground mb-1">
              {search || roleFilter !== "all" ? "No users match your filters" : "No users yet"}
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {search || roleFilter !== "all"
                ? "Try adjusting your search or filter."
                : "Add the first user to get started."}
            </p>
            {!search && roleFilter === "all" && (
              <Button onClick={() => setAddOpen(true)} className="mt-4 gap-2" variant="outline">
                <Plus className="w-4 h-4" /> Add User
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">User</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Last Login</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(u => {
                  const meta     = ROLE_META[u.role as RoleKey] ?? ROLE_META.viewer;
                  const RoleIcon = meta.icon;
                  const isSelf   = u.id === currentUser?.id;
                  return (
                    <tr
                      key={u.id}
                      className="bg-card hover:bg-muted/20 transition-colors group"
                    >
                      {/* User identity */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold border",
                            meta.bg,
                          )}>
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {u.username}
                              {isSelf && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role badge */}
                      <td className="px-5 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border",
                          meta.bg,
                        )}>
                          <RoleIcon className="w-3 h-3" />
                          {meta.label}
                        </span>
                      </td>

                      {/* Active status */}
                      <td className="px-5 py-4 hidden sm:table-cell">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <XCircle className="w-3.5 h-3.5" /> Inactive
                          </span>
                        )}
                      </td>

                      {/* Last login */}
                      <td className="px-5 py-4 hidden md:table-cell">
                        {u.lastLogin ? (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                            <Clock className="w-3 h-3 shrink-0" />
                            {new Date(u.lastLogin).toLocaleString("en-KE", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">Never</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditTarget(u)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(u)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer count */}
            <div className="px-5 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
              Showing {filtered.length} of {total} user{total !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </Card>

      {/* ── Role legend ─────────────────────────────────────────────────── */}
      <Card className="shadow-none border-dashed bg-muted/20">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Permission Levels
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ROLES.map(r => {
              const m = ROLE_META[r];
              const Icon = m.icon;
              return (
                <div key={r} className="flex items-start gap-3">
                  <div className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center shrink-0 border mt-0.5",
                    m.bg,
                  )}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{m.label}</div>
                    <div className="text-xs text-muted-foreground">{m.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreate={async (data) => {
          await createUser.mutateAsync({ data });
          toast({ title: "User created", description: `${data.username} has been added.` });
          refetch();
        }}
        isPending={createUser.isPending}
      />

      <EditUserDialog
        user={editTarget}
        onOpenChange={open => { if (!open) setEditTarget(null); }}
        onSave={async (id, data) => {
          await updateUser.mutateAsync({ id, data });
          toast({ title: "User updated" });
          refetch();
          setEditTarget(null);
        }}
        isPending={updateUser.isPending}
        isSelf={editTarget?.id === currentUser?.id}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.username}</strong> ({deleteTarget?.email}).
              They will lose all access immediately. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {deleteUser.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Add User Dialog ──────────────────────────────────────────────────────────

function AddUserDialog({
  open,
  onOpenChange,
  onCreate,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (data: { username: string; email: string; password: string; role: UserInputRole }) => Promise<void>;
  isPending: boolean;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    username: "",
    email:    "",
    password: "",
    role:     "viewer" as UserInputRole,
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const reset = () => {
    setForm({ username: "", email: "", password: "", role: "viewer" });
    setErrors({});
  };

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.username.trim())    e.username = "Username is required";
    else if (form.username.length < 3) e.username = "At least 3 characters";
    if (!form.email.trim())       e.email    = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password)           e.password = "Password is required";
    else if (form.password.length < 8) e.password = "At least 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await onCreate(form);
      reset();
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Could not create user.";
      if (msg.toLowerCase().includes("already exists")) {
        setErrors({ username: "Username or email already taken" });
      } else {
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> Add New User
          </DialogTitle>
          <DialogDescription>
            Create a new account. The user can sign in immediately with these credentials.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <FieldRow label="Username" error={errors.username} required>
            <Input
              placeholder="e.g. jkimani"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              className={errors.username ? "border-destructive" : ""}
            />
          </FieldRow>

          <FieldRow label="Email Address" error={errors.email} required>
            <Input
              type="email"
              placeholder="e.g. jkimani@utility.co.ke"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className={errors.email ? "border-destructive" : ""}
            />
          </FieldRow>

          <FieldRow label="Password" error={errors.password} required>
            <Input
              type="password"
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className={errors.password ? "border-destructive" : ""}
            />
          </FieldRow>

          <FieldRow label="Role" required>
            <Select
              value={form.role}
              onValueChange={v => setForm(f => ({ ...f, role: v as UserInputRole }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => {
                  const m    = ROLE_META[r];
                  const Icon = m.icon;
                  return (
                    <SelectItem key={r} value={r}>
                      <div className="flex items-center gap-2">
                        <Icon className={cn("w-3.5 h-3.5", m.color)} />
                        <span>{m.label}</span>
                        <span className="text-muted-foreground text-xs hidden sm:inline">— {m.description}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {form.role && (
              <p className="text-xs text-muted-foreground mt-1.5 pl-0.5">
                {ROLE_META[form.role].description}
              </p>
            )}
          </FieldRow>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Create User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit User Dialog ─────────────────────────────────────────────────────────

function EditUserDialog({
  user,
  onOpenChange,
  onSave,
  isPending,
  isSelf,
}: {
  user: User | null;
  onOpenChange: (v: boolean) => void;
  onSave: (id: number, data: { role?: UserUpdateRole; isActive?: boolean; password?: string | null }) => Promise<void>;
  isPending: boolean;
  isSelf: boolean;
}) {
  const { toast } = useToast();
  const [role,        setRole]        = useState<UserUpdateRole>("viewer");
  const [isActive,    setIsActive]    = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [pwError,     setPwError]     = useState("");

  // Sync when user changes
  const prevId = user?.id;
  if (user && user.id !== prevId) {
    setRole(user.role as UserUpdateRole);
    setIsActive(user.isActive);
    setNewPassword("");
    setPwError("");
  }

  // Use useEffect pattern instead via key prop on Dialog

  if (!user) return null;

  const handleSave = async () => {
    if (newPassword && newPassword.length < 8) {
      setPwError("Password must be at least 8 characters");
      return;
    }
    try {
      await onSave(user.id, {
        role,
        isActive,
        password: newPassword || null,
      });
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.response?.data?.error ?? "Could not update user.",
        variant: "destructive",
      });
    }
  };

  const RoleIcon = ROLE_META[role as RoleKey]?.icon ?? Eye;

  return (
    <Dialog
      key={user.id}
      open={!!user}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" /> Edit User
          </DialogTitle>
          <DialogDescription>
            Update role, status, or reset the password for{" "}
            <strong>{user.username}</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* User identity summary */}
        <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 rounded-lg border border-border">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold border",
            ROLE_META[user.role as RoleKey]?.bg ?? "bg-secondary border-border",
          )}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-sm">{user.username}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
        </div>

        <div className="space-y-4 py-1">
          {/* Role */}
          <FieldRow label="Role">
            <Select
              value={role}
              onValueChange={v => setRole(v as UserUpdateRole)}
              disabled={isSelf}
            >
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <RoleIcon className={cn("w-3.5 h-3.5", ROLE_META[role as RoleKey]?.color)} />
                    {ROLE_META[role as RoleKey]?.label ?? role}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => {
                  const m    = ROLE_META[r];
                  const Icon = m.icon;
                  return (
                    <SelectItem key={r} value={r}>
                      <div className="flex items-center gap-2">
                        <Icon className={cn("w-3.5 h-3.5", m.color)} />
                        {m.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {isSelf && (
              <p className="text-xs text-muted-foreground mt-1.5 pl-0.5">
                You cannot change your own role.
              </p>
            )}
          </FieldRow>

          {/* Active status */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
            <div>
              <Label className="text-sm font-medium">Account Active</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Inactive users cannot sign in.
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isSelf}
            />
          </div>

          {/* Reset password */}
          <FieldRow label="New Password (optional)" error={pwError}>
            <Input
              type="password"
              placeholder="Leave blank to keep current password"
              value={newPassword}
              onChange={e => {
                setNewPassword(e.target.value);
                if (pwError) setPwError("");
              }}
              className={pwError ? "border-destructive" : ""}
            />
          </FieldRow>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatChip({
  label, value, icon: Icon, color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0")}>
          <Icon className={cn("w-4 h-4", color ?? "text-muted-foreground")} />
        </div>
        <div>
          <div className={cn("text-xl font-bold font-mono leading-tight", color ?? "text-foreground")}>
            {value}
          </div>
          <div className="text-xs text-muted-foreground leading-tight">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldRow({
  label,
  children,
  error,
  required,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-end">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
