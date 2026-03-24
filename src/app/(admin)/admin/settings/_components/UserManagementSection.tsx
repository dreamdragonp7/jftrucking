"use client";

import { useState, useCallback, useTransition } from "react";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Loader2,
  RotateCcw,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateUserStatus,
  updateUserRole,
  createUser,
  reactivateUserAction,
  deactivateUserAction,
} from "../_actions/settings.actions";
import type { Profile, UserRole, ProfileStatus } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserManagementSectionProps {
  users: Profile[];
}

// ---------------------------------------------------------------------------
// UserManagementSection
// ---------------------------------------------------------------------------

export function UserManagementSection({ users }: UserManagementSectionProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("customer");
  const [newPhone, setNewPhone] = useState("");
  const [isPending, startTransition] = useTransition();

  // Deactivate dialog state
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateUserId, setDeactivateUserId] = useState<string | null>(null);
  const [deactivateReason, setDeactivateReason] = useState("");

  const handleStatusChange = useCallback(
    (userId: string, status: ProfileStatus) => {
      startTransition(async () => {
        const result = await updateUserStatus(userId, status);
        if (result.success) {
          toast.success(`User ${status === "active" ? "activated" : "deactivated"}`);
        } else {
          toast.error(result.error);
        }
      });
    },
    []
  );

  const handleRoleChange = useCallback(
    (userId: string, role: UserRole) => {
      startTransition(async () => {
        const result = await updateUserRole(userId, role);
        if (result.success) {
          toast.success("Role updated");
        } else {
          toast.error(result.error);
        }
      });
    },
    []
  );

  const handleCreateUser = useCallback(() => {
    if (!newEmail || !newPassword || !newName) return;
    startTransition(async () => {
      const result = await createUser({
        email: newEmail,
        password: newPassword,
        fullName: newName,
        role: newRole,
        phone: newPhone || undefined,
      });
      if (result.success) {
        toast.success("User created");
        setAddOpen(false);
        setNewEmail("");
        setNewPassword("");
        setNewName("");
        setNewRole("customer");
        setNewPhone("");
      } else {
        toast.error(result.error);
      }
    });
  }, [newEmail, newPassword, newName, newRole, newPhone]);

  const handleReactivate = useCallback(
    (userId: string) => {
      startTransition(async () => {
        const result = await reactivateUserAction(userId);
        if (result.success) {
          toast.success("User reactivated");
        } else {
          toast.error(result.error);
        }
      });
    },
    []
  );

  const handleDeactivate = useCallback(() => {
    if (!deactivateUserId || !deactivateReason.trim()) return;
    startTransition(async () => {
      const result = await deactivateUserAction(deactivateUserId, deactivateReason.trim());
      if (result.success) {
        toast.success("User deactivated");
        setDeactivateOpen(false);
        setDeactivateUserId(null);
        setDeactivateReason("");
      } else {
        toast.error(result.error);
      }
    });
  }, [deactivateUserId, deactivateReason]);

  const activeUsers = users.filter((u) => u.status === "active");
  const inactiveUsers = users.filter((u) => u.status === "inactive");

  return (
    <>
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--color-text-muted)]" />
            <div>
              <CardTitle className="text-base">User Management</CardTitle>
              <CardDescription>
                {users.length} user{users.length !== 1 ? "s" : ""}
                {inactiveUsers.length > 0 && ` (${inactiveUsers.length} inactive)`}
              </CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Add User</span>
          </Button>
        </CardHeader>
        <CardContent>
          {/* All users */}
          <div className="divide-y divide-[var(--color-border)]">
            {[...activeUsers, ...inactiveUsers].map((u) => (
              <div key={u.id} className="flex items-center justify-between py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{u.full_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StatusBadge status={u.role} />
                    <StatusBadge status={u.status} />
                    {u.phone && (
                      <span className="text-xs text-[var(--color-text-muted)]">{u.phone}</span>
                    )}
                    {u.status_reason && (
                      <span className="text-xs text-[var(--color-text-muted)] italic truncate max-w-[150px]" title={u.status_reason}>
                        {u.status_reason}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {u.status === "active" && (
                    <>
                      <Select
                        value={u.role}
                        onValueChange={(v) => handleRoleChange(u.id, v as UserRole)}
                      >
                        <SelectTrigger className="w-[110px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="driver">Driver</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => {
                          setDeactivateUserId(u.id);
                          setDeactivateOpen(true);
                        }}
                        className="text-[var(--color-text-muted)] hover:text-red-600"
                        title="Deactivate"
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  {u.status === "inactive" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleReactivate(u.id)}
                      className="text-[var(--color-text-muted)] hover:text-emerald-600"
                      title="Reactivate"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      <span className="text-xs">Reactivate</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {users.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
              No users found.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account. They will be immediately active.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Full Name</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Doe" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Email</label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="john@example.com" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Password</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Role</label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Phone (optional)</label>
              <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="(555) 123-4567" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={isPending || !newEmail || !newPassword || !newName}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate User Dialog */}
      <Dialog open={deactivateOpen} onOpenChange={(open) => { setDeactivateOpen(open); if (!open) { setDeactivateUserId(null); setDeactivateReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-2">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center">Deactivate User</DialogTitle>
            <DialogDescription className="text-center">
              This is a soft delete. All data is preserved and the account can be reactivated later.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium text-[var(--color-text-primary)]">Reason for deactivation</label>
            <Textarea
              value={deactivateReason}
              onChange={(e) => setDeactivateReason(e.target.value)}
              placeholder="e.g. Employee terminated, company closed..."
              className="mt-1"
              rows={3}
            />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={isPending || !deactivateReason.trim()}
              className="w-full"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deactivate User
            </Button>
            <Button variant="outline" onClick={() => setDeactivateOpen(false)} disabled={isPending} className="w-full">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
