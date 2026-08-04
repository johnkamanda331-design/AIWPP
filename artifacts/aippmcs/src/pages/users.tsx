import { useGetUsers, useCreateUser, useDeleteUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users as UsersIcon, ShieldAlert, Plus, Trash2, Edit } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Users() {
  const { user } = useAuth();
  const { data: users, isLoading, refetch } = useGetUsers();
  const deleteUser = useDeleteUser();
  const { toast } = useToast();

  if (user?.role !== "administrator") {
    return <Redirect to="/" />;
  }

  const handleDelete = async (id: number) => {
    if(!confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUser.mutateAsync({ id });
      toast({ title: "User Deleted" });
      refetch();
    } catch (err) {
      toast({ title: "Delete Failed", variant: "destructive" });
    }
  }

  if (isLoading) return <UsersSkeleton />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Control access to the AIPPMCS platform.</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Add User
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Last Login</th>
                  <th className="px-6 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users?.map(u => (
                  <tr key={u.id} className="bg-card hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{u.username}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={u.role === 'administrator' ? "default" : "secondary"} className="capitalize">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-primary' : 'bg-muted-foreground'}`} />
                        {u.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(u.id)} disabled={u.id === user.id}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsersSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
