"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRoleCode, TeamCode } from "@prisma/client";

import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { DataTable } from "@/components/shared/DataTable";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  useTeamMembers,
  useTeamMember,
  useCreateTeamMember,
  usePatchTeamUser,
} from "@/features/team/hooks/use-team";
import { getRoleLabel } from "@/features/team/services/team.service";
import type { TeamMemberDto } from "@/features/team/types/team.types";
import {
  createTeamMemberSchema,
  editTeamMemberFormSchema,
  type CreateTeamMemberInput,
  type EditTeamMemberFormValues,
} from "@/features/team/schemas/team.schema";
import { USER_ROLE_CODE_FROM_UI, TEAM_CODE_FROM_UI } from "@/domain/prisma-enums";

import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Users, UserCheck, Trophy, Banknote, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthz } from "@/lib/auth/authz-context";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { UserRole } from "@/types";

const ROLE_OPTIONS: { value: UserRoleCode; label: string }[] = [
  { value: "ADMIN", label: "Admin / Owner" },
  { value: "ACQUISITIONS_MANAGER", label: "Acquisitions contractor" },
  { value: "DISPOSITIONS_MANAGER", label: "Dispositions contractor" },
  { value: "TRANSACTION_COORDINATOR", label: "Transaction Coordinator" },
  { value: "REP", label: "Rep / Contractor" },
];

const TEAM_OPTIONS: { value: TeamCode; label: string }[] = [
  { value: "ACQUISITIONS", label: "Acquisitions" },
  { value: "DISPOSITIONS", label: "Dispositions" },
  { value: "OPERATIONS", label: "Operations" },
];

function createRoleOptionsForActor(isAdmin: boolean) {
  if (isAdmin) return ROLE_OPTIONS;
  return ROLE_OPTIONS.filter((r) => r.value === "REP" || r.value === "TRANSACTION_COORDINATOR");
}

export default function TeamPage() {
  const { can, roleCode, user } = useAuthz();
  const isAdmin = roleCode === "ADMIN";
  /** Acq/Dispo contractor roles (enum name `*_MANAGER`; not people-managers). */
  const isAcqDispoContractor = roleCode === "ACQUISITIONS_MANAGER" || roleCode === "DISPOSITIONS_MANAGER";

  const { data: members, isLoading, isError, error, refetch, isFetching } = useTeamMembers();
  const createMut = useCreateTeamMember();
  const patchMut = usePatchTeamUser();

  const [addOpen, setAddOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleTargetId, setRoleTargetId] = useState<string | null>(null);
  const [roleDraftCode, setRoleDraftCode] = useState<UserRoleCode>("REP");
  const [userBusyId, setUserBusyId] = useState<string | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileMemberId, setProfileMemberId] = useState<string | null>(null);
  const {
    data: profileMember,
    isLoading: profileLoading,
    isError: profileError,
    error: profileFetchError,
    refetch: refetchProfile,
  } = useTeamMember(profileMemberId, {
    enabled: profileOpen && !!profileMemberId,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TeamMemberDto | null>(null);

  const addForm = useForm<CreateTeamMemberInput>({
    resolver: zodResolver(createTeamMemberSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      roleCode: "REP",
      teamCode: user?.teamCode ?? "OPERATIONS",
    },
  });

  useEffect(() => {
    if (addOpen && user?.teamCode && !isAdmin) {
      addForm.setValue("teamCode", user.teamCode);
    }
  }, [addOpen, user?.teamCode, isAdmin, addForm]);

  const editForm = useForm<EditTeamMemberFormValues>({
    resolver: zodResolver(editTeamMemberFormSchema),
    defaultValues: {
      name: "",
      email: "",
      roleCode: "REP",
      teamCode: "OPERATIONS",
    },
  });

  useEffect(() => {
    if (editOpen && editTarget) {
      editForm.reset({
        name: editTarget.name,
        email: editTarget.email,
        roleCode: USER_ROLE_CODE_FROM_UI[editTarget.role],
        teamCode: TEAM_CODE_FROM_UI[editTarget.team],
      });
    }
  }, [editOpen, editTarget, editForm]);

  const toggleUserActive = useCallback(
    async (targetUserId: string, nextActive: boolean) => {
      setUserBusyId(targetUserId);
      try {
        await patchMut.mutateAsync({ id: targetUserId, input: { active: nextActive } });
        toast.success(nextActive ? "User activated" : "User deactivated");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update user");
      } finally {
        setUserBusyId(null);
      }
    },
    [patchMut]
  );

  const saveUserRole = useCallback(async () => {
    if (!roleTargetId) return;
    const current = members?.find((x) => x.id === roleTargetId);
    if (current && USER_ROLE_CODE_FROM_UI[current.role] === roleDraftCode) {
      toast.message("No change to role");
      setRoleDialogOpen(false);
      return;
    }
    setUserBusyId(roleTargetId);
    try {
      await patchMut.mutateAsync({ id: roleTargetId, input: { roleCode: roleDraftCode } });
      toast.success("Role updated");
      setRoleDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update role");
    } finally {
      setUserBusyId(null);
    }
  }, [roleTargetId, roleDraftCode, patchMut, members]);

  const onAddSubmit = addForm.handleSubmit(async (values) => {
    try {
      await createMut.mutateAsync(values);
      toast.success("Member added");
      setAddOpen(false);
      addForm.reset({
        name: "",
        email: "",
        password: "",
        roleCode: "REP",
        teamCode: user?.teamCode ?? "OPERATIONS",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add member");
    }
  });

  const onEditSubmit = editForm.handleSubmit(async (values) => {
    if (!editTarget) return;
    try {
      await patchMut.mutateAsync({ id: editTarget.id, input: values });
      toast.success("Member updated");
      setEditOpen(false);
      setEditTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update member");
    }
  });

  const activeCount = members?.filter((m) => m.active).length ?? 0;
  const totalPoints = members?.reduce((s, m) => s + m.points, 0) ?? 0;
  const totalDraws = members?.reduce((s, m) => s + m.drawBalance, 0) ?? 0;

  const columns = useMemo<ColumnDef<TeamMemberDto, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
              {row.original.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div>
              <p className="font-medium">{row.original.name}</p>
              <p className="text-xs text-muted-foreground">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm">{getRoleLabel(getValue() as UserRole)}</span>
        ),
      },
      {
        accessorKey: "team",
        header: "Team",
        cell: ({ getValue }) => <span className="capitalize text-muted-foreground">{getValue() as string}</span>,
      },
      {
        accessorKey: "active",
        header: "Status",
        meta: { align: "center" },
        cell: ({ getValue }) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              getValue() ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
            }`}
          >
            {getValue() ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        accessorKey: "points",
        header: "Points",
        meta: { align: "right" },
        cell: ({ getValue }) => <span className="font-medium font-mono">{getValue() as number}</span>,
      },
      {
        accessorKey: "drawBalance",
        header: "Draw Balance",
        meta: { align: "right" },
        cell: ({ getValue }) => {
          const val = getValue() as number;
          return (
            <span className={`font-mono ${val > 0 ? "text-warning font-medium" : ""}`}>${val.toLocaleString()}</span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const m = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setProfileMemberId(m.id);
                    setProfileOpen(true);
                  }}
                >
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/kpis/rep-scorecard?repId=${encodeURIComponent(m.id)}&team=${encodeURIComponent(m.team)}`}>
                    View Scorecard
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuItem
                      disabled={userBusyId === m.id || patchMut.isPending}
                      className={m.active ? "text-destructive" : undefined}
                      onClick={() => toggleUserActive(m.id, !m.active)}
                    >
                      {m.active ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={userBusyId === m.id || patchMut.isPending}
                      onClick={() => {
                        setRoleTargetId(m.id);
                        setRoleDraftCode(USER_ROLE_CODE_FROM_UI[m.role]);
                        setRoleDialogOpen(true);
                      }}
                    >
                      Change Role
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={patchMut.isPending}
                      onClick={() => {
                        setEditTarget(m);
                        setEditOpen(true);
                      }}
                    >
                      Edit Member
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
    [isAdmin, userBusyId, patchMut.isPending, toggleUserActive]
  );

  const addRoleOptions = useMemo(() => createRoleOptionsForActor(isAdmin), [isAdmin]);

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <PageHeader title="Team" description="Manage team members, roles, and performance">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="gap-1.5"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {can("team:add_member") && (
            <Button size="sm" className="gap-1.5" type="button" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add Member
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Members" value={members?.length ?? 0} icon={Users} />
        <MetricCard title="Active" value={activeCount} icon={UserCheck} variant="success" />
        <MetricCard title="Team Points" value={totalPoints} icon={Trophy} variant="info" />
        <MetricCard title="Total Draw Balance" value={`$${totalDraws.toLocaleString()}`} icon={Banknote} variant="warning" />
      </div>

      {isLoading ? (
        <LoadingState variant="table" />
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load team"
          description={error instanceof Error ? error.message : "Something went wrong."}
          actionLabel="Try again"
          onAction={() => void refetch()}
        />
      ) : (
        <DataTable columns={columns} data={members ?? []} emptyMessage="No team members" />
      )}

      {/* Add member */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (open) {
            addForm.reset({
              name: "",
              email: "",
              password: "",
              roleCode: "REP",
              teamCode: user?.teamCode ?? "OPERATIONS",
            });
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={onAddSubmit} className="space-y-4">
              <FormField
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" autoComplete="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temporary password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" autoComplete="new-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="roleCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {addRoleOptions.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isAdmin && (
                <FormField
                  control={addForm.control}
                  name="teamCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Team" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TEAM_OPTIONS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {isAcqDispoContractor && !isAdmin && user?.teamCode && (
                <p className="text-xs text-muted-foreground">
                  New members are added to your assigned team ({user.teamCode}).
                </p>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMut.isPending}>
                  {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Add member
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Change role */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Select the new role for this user.</p>
            <Select value={roleDraftCode} onValueChange={(v) => setRoleDraftCode(v as UserRoleCode)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)} disabled={userBusyId !== null}>
              Cancel
            </Button>
            <Button onClick={() => void saveUserRole()} disabled={userBusyId !== null || patchMut.isPending}>
              {userBusyId || patchMut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View profile */}
      <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Member profile</SheetTitle>
            <SheetDescription>Details from the directory.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {profileLoading ? (
              <div className="flex justify-center py-12 text-muted-foreground text-sm">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
              </div>
            ) : profileError ? (
              <EmptyState
                icon={AlertTriangle}
                title="Could not load profile"
                description={profileFetchError instanceof Error ? profileFetchError.message : "Request failed"}
                actionLabel="Try again"
                onAction={() => void refetchProfile()}
                className="border-0 py-8"
              />
            ) : profileMember ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{profileMember.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{profileMember.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Role</p>
                  <p className="font-medium">{getRoleLabel(profileMember.role)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Team</p>
                  <p className="font-medium capitalize">{profileMember.team}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{profileMember.active ? "Active" : "Inactive"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Joined</p>
                  <p className="font-medium">{profileMember.joinedAt}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Points (ledger)</p>
                  <p className="font-mono font-medium">{profileMember.points}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Draw balance</p>
                  <p className="font-mono font-medium">${profileMember.drawBalance.toLocaleString()}</p>
                </div>
                <Button asChild variant="outline" className="w-full mt-4">
                  <Link
                    href={`/kpis/rep-scorecard?repId=${encodeURIComponent(profileMember.id)}&team=${encodeURIComponent(profileMember.team)}`}
                  >
                    Open scorecard
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Member not found or no access.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit member (admin) */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit member</SheetTitle>
            <SheetDescription>Update name, email, role, and team.</SheetDescription>
          </SheetHeader>
          <Form {...editForm}>
            <form onSubmit={onEditSubmit} className="space-y-4 mt-6">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="roleCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="teamCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TEAM_OPTIONS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={patchMut.isPending}>
                {patchMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save changes
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
