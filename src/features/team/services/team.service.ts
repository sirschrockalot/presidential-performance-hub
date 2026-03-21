/**
 * Client-side Team API (DB-backed via Next route handlers).
 */
import type { UserRole } from "@/types";
import type { TeamMemberDto } from "@/features/team/types/team.types";
import type { CreateTeamMemberInput, AdminPatchTeamUserInput } from "@/features/team/schemas/team.schema";
import type { AdminSetUserPasswordInput } from "@/features/auth/schemas/password.schema";
import type { DataScope } from "@/lib/auth/data-scope";

export type { TeamMemberDto, TeamMemberDto as TeamMember } from "@/features/team/types/team.types";

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(text || res.statusText);
  }
  if (!res.ok) {
    const err = data as { error?: string } | null;
    throw new Error(err?.error ?? res.statusText);
  }
  return data as T;
}

export async function fetchTeamMembers(scope: DataScope = { mode: "full" }): Promise<TeamMemberDto[]> {
  void scope;
  const res = await fetch("/api/team/members", { credentials: "include" });
  const data = await parseJson<{ members: TeamMemberDto[] }>(res);
  return data.members;
}

export async function fetchTeamMember(id: string): Promise<TeamMemberDto | null> {
  const res = await fetch(`/api/team/users/${encodeURIComponent(id)}`, { credentials: "include" });
  if (res.status === 404) return null;
  const data = await parseJson<{ member: TeamMemberDto }>(res);
  return data.member;
}

export async function createTeamMemberApi(input: CreateTeamMemberInput): Promise<TeamMemberDto> {
  const res = await fetch("/api/team/members", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ member: TeamMemberDto }>(res);
  return data.member;
}

export async function patchTeamUserApi(id: string, input: AdminPatchTeamUserInput): Promise<TeamMemberDto> {
  const res = await fetch(`/api/team/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ member: TeamMemberDto }>(res);
  return data.member;
}

export async function setTeamUserPasswordApi(id: string, input: AdminSetUserPasswordInput): Promise<void> {
  const res = await fetch(`/api/team/users/${encodeURIComponent(id)}/password`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await parseJson<{ ok: boolean }>(res);
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: "Admin / Owner",
    acquisitions_manager: "Acquisitions contractor",
    dispositions_manager: "Dispositions contractor",
    transaction_coordinator: "Transaction Coordinator (TC)",
    rep: "Rep / Contractor",
  };
  return labels[role];
}
