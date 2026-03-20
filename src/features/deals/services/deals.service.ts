/**
 * Client-side deal API (database-backed via Next.js route handlers).
 * Server-side Prisma logic lives in `../server/deals.service.ts`.
 */
import type { DealListRow as DealListRowT } from "@/features/deals/api/deals-client";

export type { DealListRow, DealDetailDto, DealMetricsDto, DashboardRecentDealRow } from "@/features/deals/api/deals-client";

/** Alias for table typings (same shape as former `DealWithReps`) */
export type DealWithReps = DealListRowT;
export {
  fetchDealsList,
  fetchDealDetail,
  fetchDealMetrics,
  fetchDealFormUsers,
  createDealApi,
  updateDealApi,
  updateDealStatusApi,
  addDealNoteApi,
  bulkImportDealsApi,
  type DealListFilters,
} from "@/features/deals/api/deals-client";
