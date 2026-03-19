/**
 * Domain service wrapper for Points.
 *
 * Includes the requested `calculatePoints()` helper.
 */
import type { PrismaClient, TeamCode, UserRoleCode } from "@prisma/client";

import {
  createManualPointAdjustment,
  listPointRecipientsForManualAdjustment,
  listPointEvents,
  getRepPointsSummary,
  getPointsLeaderboard,
  getPointsMetrics,
} from "@/features/points/server/points.queries";
import { calculatePoints } from "@/features/points/server/points-calculator";

export type PointsActor = { id: string; roleCode: UserRoleCode; teamCode: TeamCode };

export type { PrismaClient, TeamCode };

export { calculatePoints };

export {
  createManualPointAdjustment,
  listPointRecipientsForManualAdjustment,
  listPointEvents,
  getRepPointsSummary,
  getPointsLeaderboard,
  getPointsMetrics,
};

