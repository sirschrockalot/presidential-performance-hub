/**
 * Team Service — SWAP POINT
 */
import { User, UserRole } from "@/types";
import { users as mockUsers, getUserPoints, getRepDrawBalance } from "@/mock/mock-data";
import type { DataScope } from "@/lib/auth/data-scope";

export interface TeamMember extends User {
  points: number;
  drawBalance: number;
}

export async function fetchTeamMembers(scope: DataScope = { mode: "full" }): Promise<TeamMember[]> {
  let rows = [...mockUsers];
  if (scope.mode === "rep") {
    rows = rows.filter((u) => u.id === scope.userId);
  }
  return rows.map((u) => ({
    ...u,
    points: getUserPoints(u.id),
    drawBalance: getRepDrawBalance(u.id),
  }));
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
