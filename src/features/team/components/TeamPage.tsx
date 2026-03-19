"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from '@tanstack/react-table';
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { DataTable } from '@/components/shared/DataTable';
import { LoadingState } from '@/components/shared/LoadingState';
import { useTeamMembers } from '@/features/team/hooks/use-team';
import { getRoleLabel, TeamMember } from '@/features/team/services/placeholder/team.service';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Users, UserCheck, Trophy, Banknote } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthz } from "@/lib/auth/authz-context";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { UserRole } from "@/types";
import { USER_ROLE_CODE_FROM_UI } from "@/domain/prisma-enums";

export default function TeamPage() {
  const { can, roleCode } = useAuthz();
  const isAdmin = roleCode === "ADMIN";
  const { data: members, isLoading } = useTeamMembers();
  const qc = useQueryClient();

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleTargetId, setRoleTargetId] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<UserRole>("rep");
  const [userBusyId, setUserBusyId] = useState<string | null>(null);

  const roleOptions: UserRole[] = ["admin", "acquisitions_manager", "dispositions_manager", "transaction_coordinator", "rep"];

  const toggleUserActive = async (targetUserId: string, nextActive: boolean) => {
    setUserBusyId(targetUserId);
    try {
      const res = await fetch(`/api/team/users/${targetUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to update user");
      }
      toast.success(nextActive ? "User activated" : "User deactivated");
      await qc.invalidateQueries({ queryKey: ["team-members"], exact: false });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setUserBusyId(null);
    }
  };

  const saveUserRole = async () => {
    if (!roleTargetId) return;
    setUserBusyId(roleTargetId);
    try {
      const prismaRoleCode = USER_ROLE_CODE_FROM_UI[roleDraft];
      const res = await fetch(`/api/team/users/${roleTargetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleCode: prismaRoleCode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to update role");
      }
      toast.success("Role updated");
      await qc.invalidateQueries({ queryKey: ["team-members"], exact: false });
      setRoleDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update role");
    } finally {
      setUserBusyId(null);
    }
  };

  const activeCount = members?.filter((m) => m.active).length ?? 0;
  const totalPoints = members?.reduce((s, m) => s + m.points, 0) ?? 0;
  const totalDraws = members?.reduce((s, m) => s + m.drawBalance, 0) ?? 0;

  const columns = useMemo<ColumnDef<TeamMember, any>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
              {row.original.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <p className="font-medium">{row.original.name}</p>
              <p className="text-xs text-muted-foreground">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ getValue }) => <span className="text-muted-foreground text-sm">{getRoleLabel(getValue() as any)}</span>,
      },
      {
        accessorKey: 'team',
        header: 'Team',
        cell: ({ getValue }) => <span className="capitalize text-muted-foreground">{getValue() as string}</span>,
      },
      {
        accessorKey: 'active',
        header: 'Status',
        meta: { align: 'center' },
        cell: ({ getValue }) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              getValue() ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
            }`}
          >
            {getValue() ? 'Active' : 'Inactive'}
          </span>
        ),
      },
      {
        accessorKey: 'points',
        header: 'Points',
        meta: { align: 'right' },
        cell: ({ getValue }) => <span className="font-medium font-mono">{getValue() as number}</span>,
      },
      {
        accessorKey: 'drawBalance',
        header: 'Draw Balance',
        meta: { align: 'right' },
        cell: ({ getValue }) => {
          const val = getValue() as number;
          return <span className={`font-mono ${val > 0 ? 'text-warning font-medium' : ''}`}>${val.toLocaleString()}</span>;
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const m = row.original as TeamMember;
          return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Profile</DropdownMenuItem>
              <DropdownMenuItem>View Scorecard</DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuItem
                    disabled={userBusyId === m.id}
                    className={m.active ? "text-destructive" : undefined}
                    onClick={() => toggleUserActive(m.id, !m.active)}
                  >
                    {m.active ? "Deactivate" : "Activate"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={userBusyId === m.id}
                    onClick={() => {
                      setRoleTargetId(m.id);
                      setRoleDraft(m.role);
                      setRoleDialogOpen(true);
                    }}
                  >
                    Edit Role
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          );
        },
        enableSorting: false,
      },
    ],
    [isAdmin, userBusyId, toggleUserActive]
  );

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <PageHeader title="Team" description="Manage team members, roles, and performance">
        {can("team:add_member") && (
          <Button size="sm" className="gap-1.5" type="button">
            <Plus className="h-4 w-4" /> Add Member
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Members" value={members?.length ?? 0} icon={Users} />
        <MetricCard title="Active" value={activeCount} icon={UserCheck} variant="success" />
        <MetricCard title="Team Points" value={totalPoints} icon={Trophy} variant="info" />
        <MetricCard title="Total Draw Balance" value={`$${totalDraws.toLocaleString()}`} icon={Banknote} variant="warning" />
      </div>

      {isLoading ? (
        <LoadingState variant="table" />
      ) : (
        <DataTable columns={columns} data={members ?? []} emptyMessage="No team members" />
      )}

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Select the new role for this user.</p>
            <Select value={roleDraft} onValueChange={(v) => setRoleDraft(v as UserRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {getRoleLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)} disabled={userBusyId !== null}>
              Cancel
            </Button>
            <Button onClick={saveUserRole} disabled={userBusyId !== null}>
              {userBusyId ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

