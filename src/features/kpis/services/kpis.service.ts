import type { Team } from "@/types";

import {
  fetchKpiEntries,
  fetchKpiHistory,
  fetchKpiFormUsers,
  fetchKpiTargets,
  fetchKpiTrend,
  fetchKpiWeekSummary,
  getAvailableWeeks,
  upsertKpiEntryApi,
} from "@/features/kpis/api/kpis-client";

export type {
  KpiEntryWithRepDto as KpiWithRep,
  KpiTargetsByMetricKey,
  KpiHistoryRowDto,
  KpiTrendPointDto,
  KpiWeekSummaryDto,
  UpsertKpiEntryInput,
} from "@/features/kpis/server/kpis.service";

export { fetchKpiHistory, fetchKpiFormUsers, fetchKpiTargets, upsertKpiEntryApi };

// Keep existing hook API stable (names/signatures) while swapping mocks -> DB.
export async function getWeekSummary(team: Team, weekStarting: string) {
  return fetchKpiWeekSummary(team, weekStarting);
}

export async function getKpiTrend(team: Team) {
  const trend = await fetchKpiTrend(team);
  return trend.points;
}

export { fetchKpiEntries, getAvailableWeeks };
