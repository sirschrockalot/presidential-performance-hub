import { unstable_cache } from "next/cache";
import type { PrismaClient } from "@prisma/client";

import { CACHE_TAGS } from "@/lib/cache/revalidation";
import type { Team } from "@/types";
import type { KpiActor } from "@/features/kpis/server/kpi-scope";
import {
  getKpiTrend,
  getKpiWeekSummary,
  listKpiEntries,
  listKpiFormUsers,
  listKpiHistory,
  listKpiTargetsForTeam,
  listKpiWeeks,
  type KpiEntryWithRepDto,
  type KpiHistoryRowDto,
  type KpiTargetsByMetricKey,
  type KpiTrendPointDto,
  type KpiWeekSummaryDto,
} from "@/features/kpis/server/kpis.service";

export type KpiPageBundleDto = {
  weeks: string[];
  prevWeekStarting: string;
  entries: {
    acquisitions: { current: KpiEntryWithRepDto[]; previous: KpiEntryWithRepDto[] };
    dispositions: { current: KpiEntryWithRepDto[]; previous: KpiEntryWithRepDto[] };
  };
  summary: KpiWeekSummaryDto;
  trendPoints: KpiTrendPointDto[];
  targets: { acquisitions: KpiTargetsByMetricKey; dispositions: KpiTargetsByMetricKey };
  history: KpiHistoryRowDto[];
  formUsers: { id: string; name: string }[];
};

/**
 * Single read path for the KPI tracking page. Reuses the same `unstable_cache` keys as
 * standalone `/api/kpis/*` routes so cache entries dedupe and tag invalidation is unchanged.
 */
export async function getKpiPageBundle(
  prisma: PrismaClient,
  actor: KpiActor,
  params: { team: Team; weekStarting: string }
): Promise<KpiPageBundleDto> {
  const { team, weekStarting } = params;

  const weeks = await unstable_cache(
    () => listKpiWeeks(prisma, actor, team),
    ["kpis:weeks", actor.id, actor.roleCode, actor.teamCode, team],
    { tags: [CACHE_TAGS.kpiWeeks], revalidate: 300 }
  )();

  const idx = weeks.indexOf(weekStarting);
  const prevWeekStarting = !weeks.length || idx === -1 ? weekStarting : weeks[idx + 1] ?? weekStarting;

  const [
    entriesAcqCurrent,
    entriesDispoCurrent,
    entriesAcqPrev,
    entriesDispoPrev,
    summary,
    trendResult,
    targetsAcq,
    targetsDispo,
    history,
    formUsers,
  ] = await Promise.all([
    unstable_cache(
      () => listKpiEntries(prisma, actor, "acquisitions", weekStarting),
      ["kpis:entries", actor.id, actor.roleCode, actor.teamCode, "acquisitions", weekStarting],
      { tags: [CACHE_TAGS.kpis], revalidate: 120 }
    )(),
    unstable_cache(
      () => listKpiEntries(prisma, actor, "dispositions", weekStarting),
      ["kpis:entries", actor.id, actor.roleCode, actor.teamCode, "dispositions", weekStarting],
      { tags: [CACHE_TAGS.kpis], revalidate: 120 }
    )(),
    unstable_cache(
      () => listKpiEntries(prisma, actor, "acquisitions", prevWeekStarting),
      ["kpis:entries", actor.id, actor.roleCode, actor.teamCode, "acquisitions", prevWeekStarting],
      { tags: [CACHE_TAGS.kpis], revalidate: 120 }
    )(),
    unstable_cache(
      () => listKpiEntries(prisma, actor, "dispositions", prevWeekStarting),
      ["kpis:entries", actor.id, actor.roleCode, actor.teamCode, "dispositions", prevWeekStarting],
      { tags: [CACHE_TAGS.kpis], revalidate: 120 }
    )(),
    unstable_cache(
      () => getKpiWeekSummary(prisma, actor, team, weekStarting),
      ["kpis:summary", actor.id, actor.roleCode, actor.teamCode, team, weekStarting],
      { tags: [CACHE_TAGS.kpiSummary], revalidate: 120 }
    )(),
    unstable_cache(
      () => getKpiTrend(prisma, actor, team),
      ["kpis:trend", actor.id, actor.roleCode, actor.teamCode, team],
      { tags: [CACHE_TAGS.kpiTrend], revalidate: 300 }
    )(),
    unstable_cache(
      () => listKpiTargetsForTeam(prisma, actor, "acquisitions"),
      ["kpis:targets", actor.id, actor.roleCode, actor.teamCode, "acquisitions"],
      { tags: [CACHE_TAGS.kpiTargets], revalidate: 3600 }
    )(),
    unstable_cache(
      () => listKpiTargetsForTeam(prisma, actor, "dispositions"),
      ["kpis:targets", actor.id, actor.roleCode, actor.teamCode, "dispositions"],
      { tags: [CACHE_TAGS.kpiTargets], revalidate: 3600 }
    )(),
    unstable_cache(
      () => listKpiHistory(prisma, actor, team),
      ["kpis:history", actor.id, actor.roleCode, actor.teamCode, team, "none"],
      { tags: [CACHE_TAGS.kpiHistory], revalidate: 300 }
    )(),
    unstable_cache(
      () => listKpiFormUsers(prisma, actor, team),
      ["kpis:form-users", actor.id, actor.roleCode, actor.teamCode, team],
      { tags: [CACHE_TAGS.kpiFormUsers], revalidate: 3600 }
    )(),
  ]);

  return {
    weeks,
    prevWeekStarting,
    entries: {
      acquisitions: { current: entriesAcqCurrent, previous: entriesAcqPrev },
      dispositions: { current: entriesDispoCurrent, previous: entriesDispoPrev },
    },
    summary,
    trendPoints: trendResult.points,
    targets: { acquisitions: targetsAcq, dispositions: targetsDispo },
    history,
    formUsers,
  };
}
