/**
 * Domain service wrapper for Draws.
 *
 * UI uses API route handlers today; this file is for future DB-facing wiring.
 */
import type { PrismaClient } from "@prisma/client";

import type { DrawActor } from "@/features/draws/server/draw-scope";
import type { CreateDrawInput, UpdateDrawStatusInput, DrawDetailDto } from "@/features/draws/server/draws.service";

import {
  listDraws,
  getDrawById,
  createDrawRequest,
  updateDrawStatus,
  getDrawMetrics,
  listDrawRequestReps,
  listDrawRequestDeals,
  listRepDrawHistory,
} from "@/features/draws/server/draws.service";

export type { PrismaClient, DrawActor, CreateDrawInput, UpdateDrawStatusInput, DrawDetailDto };

export {
  listDraws,
  getDrawById,
  createDrawRequest,
  updateDrawStatus,
  getDrawMetrics,
  listDrawRequestReps,
  listDrawRequestDeals,
  listRepDrawHistory,
};

