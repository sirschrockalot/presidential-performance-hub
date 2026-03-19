/**
 * Domain service wrapper for KPIs.
 *
 * This keeps Prisma / DB access behind a stable API surface for future
 * server actions / route handlers.
 */
import type { PrismaClient } from "@prisma/client";

import type { KpiActor } from "@/features/kpis/server/kpi-scope";
import type { KpiEntryWithRepDto, KpiTargetsByMetricKey, KpiHistoryRowDto } from "@/features/kpis/server/kpis.service";
import type { Team } from "@/types";
import type { UpsertKpiEntryInput, KpiTargetsUpsertInput } from "@/features/kpis/server/kpis.service";
import { upsertKpiEntry, upsertKpiTargets, listKpiWeeks, listKpiEntries, getKpiWeekSummary, getKpiTrend, listKpiHistory, listKpiFormUsers, listKpiTargetsForTeam } from "@/features/kpis/server/kpis.service";

export type { PrismaClient, KpiActor, Team, KpiEntryWithRepDto, KpiTargetsByMetricKey, KpiHistoryRowDto, UpsertKpiEntryInput, KpiTargetsUpsertInput };

export {
  upsertKpiEntry,
  upsertKpiTargets,
  listKpiWeeks,
  listKpiEntries,
  getKpiWeekSummary,
  getKpiTrend,
  listKpiHistory,
  listKpiFormUsers,
  listKpiTargetsForTeam,
};

