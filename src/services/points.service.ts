/**
 * Points Service — SWAP POINT
 * Replace mock imports below with Prisma queries or API fetch calls.
 * Points rules: see calculatePoints() in src/types/index.ts
 */
import { PointEvent, calculatePoints, calculateTcPoints } from '@/types';
import { pointEvents as mockPointEvents, getUserById, getUserPoints } from '@/data/mock-data';

export interface PointLeaderboardEntry {
  userId: string;
  name: string;
  team: string;
  role: string;
  points: number;
  dealEventCount: number;
}

export async function fetchPointEvents(): Promise<PointEvent[]> {
  return [...mockPointEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fetchPointEventsByDeal(dealId: string): Promise<PointEvent[]> {
  return mockPointEvents.filter(pe => pe.dealId === dealId);
}

export function getLeaderboard(userIds: string[]): PointLeaderboardEntry[] {
  return userIds
    .map(id => {
      const user = getUserById(id);
      if (!user) return null;
      return {
        userId: id,
        name: user.name,
        team: user.team,
        role: user.role,
        points: getUserPoints(id),
        dealEventCount: mockPointEvents.filter(pe => pe.userId === id && !pe.isManualAdjustment).length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.points - a!.points) as PointLeaderboardEntry[];
}

export function getPointsMetrics() {
  const total = mockPointEvents.reduce((s, pe) => s + pe.points, 0);
  const manualCount = mockPointEvents.filter(pe => pe.isManualAdjustment).length;
  return { totalCompanyPoints: total, totalEvents: mockPointEvents.length, manualAdjustments: manualCount };
}

/**
 * Core business logic: compute points for a funded deal.
 * Re-exported for clarity — actual formula lives in types/index.ts.
 */
export { calculatePoints, calculateTcPoints };
