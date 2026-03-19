/**
 * Team Service — SWAP POINT
 */
import { User, UserRole } from "@/types";
import type { DataScope } from "@/lib/auth/data-scope";

export interface TeamMember extends User {
  points: number;
  drawBalance: number;
}

export async function fetchTeamMembers(scope: DataScope = { mode: "full" }): Promise<TeamMember[]> {
  // Server-side scope is derived from the authenticated user; we keep the signature stable for now.
  void scope;

  const res = await fetch("/api/team/members", { credentials: "include" });
  if (!res.ok) {
    throw new Error("Failed to fetch team members");
  }
  const data = (await res.json()) as { members: TeamMember[] };
  return data.members;
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: "Admin / Owner",
    acquisitions_manager: "Acquisitions Manager",
    dispositions_manager: "Dispositions Manager",
    transaction_coordinator: "Transaction Coordinator",
    rep: "Rep / Contractor",
  };
  return labels[role];
}
