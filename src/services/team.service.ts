/**
 * Team Service — SWAP POINT
 * Replace mock imports below with Prisma queries or API fetch calls.
 */
import { User, UserRole, Team } from '@/types';
import { users as mockUsers, getUserPoints, getRepDrawBalance } from '@/data/mock-data';

export interface TeamMember extends User {
  points: number;
  drawBalance: number;
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  return mockUsers.map(u => ({
    ...u,
    points: getUserPoints(u.id),
    drawBalance: getRepDrawBalance(u.id),
  }));
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: 'Admin / Owner',
    acquisitions_manager: 'Acquisitions Manager',
    dispositions_manager: 'Dispositions Manager',
    transaction_coordinator: 'Transaction Coordinator',
    rep: 'Rep / Contractor',
  };
  return labels[role];
}
