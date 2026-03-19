/**
 * Domain service wrapper for Deals.
 *
 * UI currently talks to API routes, but this file provides a clean DB-facing
 * interface that we can use when wiring future server actions / endpoints.
 */
import type { PrismaClient } from "@prisma/client";

import type { DealActor } from "@/features/deals/server/deal-scope";
import type { CreateDealInput, ListDealsQuery, UpdateDealInput, UpdateDealStatusInput } from "@/features/deals/schemas/deal.schemas";

import {
  createDeal,
  listDeals,
  getDealById,
  updateDeal,
  updateDealStatus,
  addDealNote,
  listUsersForDealAssignment,
  getDealMetrics,
} from "@/features/deals/server/deals.service";

export type { DealActor };
export type { CreateDealInput, ListDealsQuery, UpdateDealInput, UpdateDealStatusInput };
export type { PrismaClient };

export {
  createDeal,
  listDeals,
  getDealById,
  updateDeal,
  updateDealStatus,
  addDealNote,
  listUsersForDealAssignment,
  getDealMetrics,
};

