import type { PrismaClient, TeamCode, UserRoleCode } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import type { DealActor } from "@/features/deals/server/deal-scope";
import { dealWhereForScope } from "@/features/deals/server/deal-scope";

import type { DrawActor } from "@/features/draws/server/draw-scope";
import { drawWhereForScope } from "@/features/draws/server/draw-scope";

import type { KpiActor } from "@/features/kpis/server/kpi-scope";
import { kpiEntryUserWhereForScope, uiTeamToPrismaTeamCode } from "@/features/kpis/server/kpi-scope";
import type { KpiEntryLikeForWeek, KpiTargetsByMetricKey } from "@/features/kpis/server/kpis.service";
import { listKpiEntriesDashboardCompliance, listKpiTargetsForTeam } from "@/features/kpis/server/kpis.service";

import type { Team } from "@/types";
import { computeKpiRepWeeklyCompliance, computeKpiTeamComplianceSummary, generateWeeklyKpiSummaryText } from "@/features/kpis/lib/kpi-compliance";
import { calculatePoints, calculateTcPoints } from "@/features/points/server/points-calculator";
import { resolvedAssignmentFeeOrCompute } from "@/features/deals/utils/assignment-fee";
import { withDashboardPerf } from "@/lib/perf/dashboard-perf";

type MonthlySeriesPoint = { month: string; revenue: number; fundedDeals?: number };
type PointsTrendPoint = { month: string; points: number };

function monthShortLabel(date: Date): string {
  return date.toLocaleString("en-US", { month: "short" });
}

function monthRangeUtc(offsetMonths: number): { start: Date; end: Date; label: string } {
  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const target = new Date(base);
  target.setUTCMonth(target.getUTCMonth() + offsetMonths);
  const end = new Date(target);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start: target, end, label: monthShortLabel(target) };
}

function dayOnlyUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
}

function pointsWhereForActor(actor: { id: string; roleCode: string; teamCode?: string }): Prisma.PointEventWhereInput {
  switch (actor.roleCode) {
    case "ADMIN":
      return {};
    case "REP":
      return { userId: actor.id };
    case "TRANSACTION_COORDINATOR":
      return { userId: actor.id };
    case "ACQUISITIONS_MANAGER":
      return { user: { team: { code: "ACQUISITIONS" } } };
    case "DISPOSITIONS_MANAGER":
      return { user: { team: { code: "DISPOSITIONS" } } };
    default:
      return { id: "__none__" };
  }
}

type WeeklyKpiSnapshotDto = {
  weekStarting: string | null;
  totalDials: number;
  totalTalkTimeMinutes: number;
  offersMade: number;
  contractsSigned: number;
  conversionRate: number; // 0..100
  repCount: number;
};

type DashboardRecentActivityItem = {
  id: string;
  type:
    | "deal_created"
    | "deal_funded"
    | "deal_status"
    | "draw_requested"
    | "draw_approved"
    | "points_awarded"
    | "kpi_submitted"
    | "user_joined";
  title: string;
  description: string;
  timestamp: string;
  link?: string;
  actor?: string;
};

function mapDealStatusToActivity(
  row: {
    id: string;
    dealId: string;
    fromStatus: string | null;
    toStatus: string;
    changedAt: Date;
    changedBy: { id: string; name: string };
    deal: { propertyAddress: string; status: string };
  }
): DashboardRecentActivityItem {
  const to = row.toStatus;
  if (to === "CLOSED_FUNDED") {
    return {
      id: row.id,
      type: "deal_funded",
      title: `Deal funded`,
      description: `${row.deal.propertyAddress} · by ${row.changedBy.name}`,
      timestamp: row.changedAt.toISOString(),
      link: `/deals/${row.dealId}`,
      actor: row.changedBy.name,
    };
  }

  return {
    id: row.id,
    type: "deal_status",
    title: `Deal updated`,
    description: `${row.deal.propertyAddress} · ${row.fromStatus ?? "—"} → ${to} · by ${row.changedBy.name}`,
    timestamp: row.changedAt.toISOString(),
    link: `/deals/${row.dealId}`,
    actor: row.changedBy.name,
  };
}

async function getCurrentWeeklyReportingPeriod(prisma: PrismaClient): Promise<{ periodStart: Date; periodEnd: Date } | null> {
  const today = dayOnlyUtc(new Date());

  const period = await prisma.reportingPeriod.findFirst({
    where: {
      kind: "WEEKLY",
      periodStart: { lte: today },
      periodEnd: { gte: today },
    },
    orderBy: { periodStart: "desc" },
    select: { periodStart: true, periodEnd: true },
  });

  if (!period) return null;
  return period;
}

async function getMostRecentCompletedWeeklyPeriods(prisma: PrismaClient): Promise<Array<{ periodStart: Date; periodEnd: Date }>> {
  const today = dayOnlyUtc(new Date());
  return prisma.reportingPeriod.findMany({
    where: { kind: "WEEKLY", periodEnd: { lt: today } },
    orderBy: { periodStart: "desc" },
    take: 2,
    select: { periodStart: true, periodEnd: true },
  });
}

async function getMonthlyDealRevenueSeries(params: { prisma: PrismaClient; actor: DealActor; monthsBack: number }): Promise<MonthlySeriesPoint[]> {
  const { prisma, actor, monthsBack } = params;
  const whereBase: Prisma.DealWhereInput = {
    ...dealWhereForScope(actor),
    status: "CLOSED_FUNDED",
  };

  const offsets: number[] = [];
  for (let i = -monthsBack + 1; i <= 0; i++) offsets.push(i);

  const slots = offsets.map((i) => {
    const { start, end, label } = monthRangeUtc(i);
    return { start, end, label, revenue: 0, fundedDeals: 0 };
  });

  if (slots.length === 0) return [];

  const rangeStart = slots[0]!.start;
  const rangeEnd = slots[slots.length - 1]!.end;

  const deals = await prisma.deal.findMany({
    where: {
      ...whereBase,
      closedFundedDate: { gte: rangeStart, lt: rangeEnd },
    },
    select: { closedFundedDate: true, assignmentFee: true },
  });

  for (const d of deals) {
    const cf = d.closedFundedDate;
    if (!cf) continue;
    const t = cf.getTime();
    for (const slot of slots) {
      if (t >= slot.start.getTime() && t < slot.end.getTime()) {
        slot.revenue += d.assignmentFee != null ? Number(d.assignmentFee) : 0;
        slot.fundedDeals += 1;
        break;
      }
    }
  }

  return slots.map(({ label, revenue, fundedDeals }) => ({ month: label, revenue, fundedDeals }));
}

async function getCurrentMonthFundedDealStats(prisma: PrismaClient, actor: DealActor) {
  const { start, end } = monthRangeUtc(0);
  const where: Prisma.DealWhereInput = {
    ...dealWhereForScope(actor),
    status: "CLOSED_FUNDED",
    closedFundedDate: { gte: start, lt: end },
  };

  const deals = await prisma.deal.findMany({
    where,
    select: { assignmentFee: true, assignmentPrice: true, contractPrice: true },
  });

  const effectiveFees: number[] = [];
  let totalAssignmentRevenueThisMonth = 0;
  for (const d of deals) {
    const fee = resolvedAssignmentFeeOrCompute(
      Number(d.contractPrice),
      d.assignmentPrice != null ? Number(d.assignmentPrice) : null,
      d.assignmentFee != null ? Number(d.assignmentFee) : null,
      0
    );
    if (fee == null || Number.isNaN(fee)) continue;
    effectiveFees.push(fee);
    totalAssignmentRevenueThisMonth += fee;
  }

  return {
    fundedDealsThisMonth: deals.length,
    totalAssignmentRevenueThisMonth,
    avgAssignmentFeeThisMonth: effectiveFees.length
      ? effectiveFees.reduce((a, b) => a + b, 0) / effectiveFees.length
      : 0,
  };
}

async function getPotentialPipelineValue(prisma: PrismaClient, actor: DealActor) {
  const deals = await prisma.deal.findMany({
    where: {
      ...dealWhereForScope(actor),
      status: { notIn: ["CLOSED_FUNDED", "CANCELED"] },
    },
    select: {
      id: true,
      assignmentFee: true,
      assignmentPrice: true,
      contractPrice: true,
      acquisitionsRep: { select: { id: true, name: true } },
      dispoRep: { select: { id: true, name: true } },
      transactionCoordinator: { select: { id: true, name: true } },
    },
  });

  const byUser = new Map<string, { userId: string; userName: string; potentialPoints: number; dealCount: number }>();
  let totalPotentialAssignmentProfit = 0;
  let dealsWithPotentialProfit = 0;

  for (const d of deals) {
    const effectiveFee = resolvedAssignmentFeeOrCompute(
      Number(d.contractPrice),
      d.assignmentPrice != null ? Number(d.assignmentPrice) : null,
      d.assignmentFee != null ? Number(d.assignmentFee) : null,
      0
    );
    if (effectiveFee == null) continue;

    totalPotentialAssignmentProfit += effectiveFee;
    dealsWithPotentialProfit += 1;

    const repPoints = calculatePoints(effectiveFee);
    const tcPoints = calculateTcPoints();

    const recipients: Array<{ id: string; name: string; points: number }> = [{ id: d.acquisitionsRep.id, name: d.acquisitionsRep.name, points: repPoints }];
    if (d.dispoRep) recipients.push({ id: d.dispoRep.id, name: d.dispoRep.name, points: repPoints });
    if (d.transactionCoordinator) recipients.push({ id: d.transactionCoordinator.id, name: d.transactionCoordinator.name, points: tcPoints });

    for (const r of recipients) {
      const current = byUser.get(r.id) ?? { userId: r.id, userName: r.name, potentialPoints: 0, dealCount: 0 };
      current.potentialPoints += r.points;
      current.dealCount += 1;
      byUser.set(r.id, current);
    }
  }

  const avgAssignmentFeePotential =
    dealsWithPotentialProfit > 0 ? totalPotentialAssignmentProfit / dealsWithPotentialProfit : 0;

  const sortedUsers = Array.from(byUser.values()).sort((a, b) => b.potentialPoints - a.potentialPoints);
  /** Full count for metrics; UI table only needs the top rows (trimmed for payload). */
  const usersWithPotentialPointsCount = sortedUsers.length;
  const potentialPointsByUser = sortedUsers.slice(0, 8);

  return {
    openPipelineDeals: deals.length,
    dealsWithPotentialProfit,
    totalPotentialAssignmentProfit,
    avgAssignmentFeePotential,
    usersWithPotentialPointsCount,
    potentialPointsByUser,
  };
}

async function getPointsTrendSeries(params: { prisma: PrismaClient; actor: { id: string; roleCode: string; teamCode?: string }; monthsBack: number }): Promise<PointsTrendPoint[]> {
  const { prisma, actor, monthsBack } = params;

  const baseWhere: Prisma.PointEventWhereInput = {
    ...pointsWhereForActor(actor),
    kind: "AUTO_FUNDED_DEAL",
  };

  const offsets: number[] = [];
  for (let i = -monthsBack + 1; i <= 0; i++) offsets.push(i);

  return Promise.all(
    offsets.map(async (i) => {
      const { start, end, label } = monthRangeUtc(i);
      const agg = await prisma.pointEvent.aggregate({
        where: {
          ...baseWhere,
          createdAt: { gte: start, lt: end },
        },
        _sum: { points: true },
        _count: { id: true },
      });

      return {
        month: label,
        points: agg._sum.points ? Number(agg._sum.points) : 0,
      };
    })
  );
}

async function getWeeklyKpiSnapshotForTeam(params: {
  prisma: PrismaClient;
  actor: KpiActor;
  team: Team;
  reportingPeriodStart: Date;
}): Promise<Pick<WeeklyKpiSnapshotDto, "totalDials" | "totalTalkTimeMinutes" | "offersMade" | "contractsSigned" | "repCount">> {
  const { prisma, actor, team, reportingPeriodStart } = params;
  const requestedTeamCode = uiTeamToPrismaTeamCode(team);
  const userScope = kpiEntryUserWhereForScope(actor, requestedTeamCode);

  if (userScope.userId === "__none__") {
    return { totalDials: 0, totalTalkTimeMinutes: 0, offersMade: 0, contractsSigned: 0, repCount: 0 };
  }

  const agg = await prisma.kpiEntry.aggregate({
    where: {
      team: { code: requestedTeamCode },
      reportingPeriod: { kind: "WEEKLY", periodStart: reportingPeriodStart },
      ...(userScope.userId ? { userId: userScope.userId } : {}),
    },
    _sum: { dials: true, talkTimeMinutes: true, offersMade: true, contractsSigned: true },
    _count: { id: true },
  });

  return {
    totalDials: agg._sum.dials ?? 0,
    totalTalkTimeMinutes: agg._sum.talkTimeMinutes ?? 0,
    offersMade: agg._sum.offersMade ?? 0,
    contractsSigned: agg._sum.contractsSigned ?? 0,
    repCount: agg._count.id,
  };
}

async function getWeeklyKpiSnapshot(prisma: PrismaClient, actor: KpiActor): Promise<WeeklyKpiSnapshotDto> {
  const period = await getCurrentWeeklyReportingPeriod(prisma);
  if (!period) {
    return { weekStarting: null, totalDials: 0, totalTalkTimeMinutes: 0, offersMade: 0, contractsSigned: 0, conversionRate: 0, repCount: 0 };
  }

  const weekStarting = period.periodStart.toISOString().slice(0, 10);

  const teams: Team[] =
    actor.roleCode === "REP" ? (actor.teamCode === "ACQUISITIONS" ? ["acquisitions"] : ["dispositions"]) :
    actor.roleCode === "ACQUISITIONS_MANAGER" ? ["acquisitions"] :
    actor.roleCode === "DISPOSITIONS_MANAGER" ? ["dispositions"] :
    ["acquisitions", "dispositions"];

  const parts = await Promise.all(
    teams.map((team) =>
      getWeeklyKpiSnapshotForTeam({ prisma, actor, team, reportingPeriodStart: period.periodStart })
    )
  );

  const totalDials = parts.reduce((s, p) => s + p.totalDials, 0);
  const totalTalkTimeMinutes = parts.reduce((s, p) => s + p.totalTalkTimeMinutes, 0);
  const offersMade = parts.reduce((s, p) => s + p.offersMade, 0);
  const contractsSigned = parts.reduce((s, p) => s + p.contractsSigned, 0);
  const repCount = parts.reduce((s, p) => s + p.repCount, 0);

  const conversionRate = offersMade > 0 ? (contractsSigned / offersMade) * 100 : 0;

  return { weekStarting, totalDials, totalTalkTimeMinutes, offersMade, contractsSigned, conversionRate, repCount };
}

async function getRecentActivityFeed(params: { prisma: PrismaClient; actor: DealActor; drawActor: DrawActor; kpiActor: KpiActor; maxItems: number }): Promise<DashboardRecentActivityItem[]> {
  const { prisma, actor, drawActor, kpiActor, maxItems } = params;

  const dealStatus = prisma.dealStatusHistory.findMany({
    where: {
      deal: dealWhereForScope(actor),
    },
    take: 12,
    orderBy: { changedAt: "desc" },
    include: {
      deal: { select: { id: true, propertyAddress: true, status: true } },
      changedBy: { select: { id: true, name: true } },
    },
  });

  const drawRows = prisma.draw.findMany({
    where: drawWhereForScope(drawActor),
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      rep: { select: { id: true, name: true } },
      deal: { select: { id: true, propertyAddress: true } },
    },
  });

  const pointRows = prisma.pointEvent.findMany({
    where: {
      ...pointsWhereForActor({ id: params.kpiActor.id, roleCode: params.kpiActor.roleCode }),
    },
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      deal: { select: { id: true, propertyAddress: true } },
      user: { select: { id: true, name: true } },
    },
  });

  const kpiPeriod = await getCurrentWeeklyReportingPeriod(prisma);
  const reportingPeriodStart = kpiPeriod?.periodStart ?? null;

  const accessibleKpiTeamCodes: TeamCode[] =
    kpiActor.roleCode === "REP"
      ? [kpiActor.teamCode]
      : kpiActor.roleCode === "ACQUISITIONS_MANAGER"
        ? ["ACQUISITIONS"]
        : kpiActor.roleCode === "DISPOSITIONS_MANAGER"
          ? ["DISPOSITIONS"]
          : ["ACQUISITIONS", "DISPOSITIONS"];

  const kpiWhere: Prisma.KpiEntryWhereInput = {
    ...(reportingPeriodStart
      ? { reportingPeriod: { kind: "WEEKLY", periodStart: reportingPeriodStart } }
      : { reportingPeriod: { kind: "WEEKLY" } }),
    team: { code: { in: accessibleKpiTeamCodes } },
    ...(kpiActor.roleCode === "REP" ? { userId: kpiActor.id } : {}),
  };

  const kpiRows = prisma.kpiEntry.findMany({
    where: {
      ...kpiWhere,
    },
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true } },
      reportingPeriod: { select: { periodStart: true } },
      team: { select: { code: true } },
    },
  });

  const [dealStatusRows, drawRowsResolved, pointRowsResolved, kpiRowsResolved] = await Promise.all([
    dealStatus,
    drawRows,
    pointRows,
    kpiRows,
  ]);

  const items: DashboardRecentActivityItem[] = [
    ...dealStatusRows.map((row) =>
      mapDealStatusToActivity({
        id: row.id,
        dealId: row.dealId,
        fromStatus: row.fromStatus,
        toStatus: row.toStatus,
        changedAt: row.changedAt,
        changedBy: { id: row.changedBy.id, name: row.changedBy.name },
        deal: row.deal,
      })
    ),
    ...drawRowsResolved.map((d) => ({
      id: d.id,
      type: (d.status === "PENDING" ? "draw_requested" : "draw_approved") as DashboardRecentActivityItem["type"],
      title: d.status === "PENDING" ? "Draw requested" : "Draw updated",
      description: `${d.deal.propertyAddress} · ${d.rep.name} · $${Number(d.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      timestamp: d.createdAt.toISOString(),
      link: `/draws/${d.id}`,
    })),
    ...pointRowsResolved.map((p) => ({
      id: p.id,
      type: "points_awarded" as DashboardRecentActivityItem["type"],
      title: p.kind === "MANUAL_ADJUSTMENT" ? "Points adjusted" : "Points awarded",
      description: `${p.user.name} · ${Number(p.points).toLocaleString()} pts · ${p.reason}`,
      timestamp: p.createdAt.toISOString(),
      link: p.deal ? `/deals/${p.deal.id}` : `/points`,
    })),
    ...kpiRowsResolved.map((kpi) => ({
      id: kpi.id,
      type: "kpi_submitted" as DashboardRecentActivityItem["type"],
      title: "KPI submitted",
      description: `${kpi.user.name} · ${kpi.team.code} · week starting ${kpi.reportingPeriod.periodStart.toISOString().slice(0, 10)}`,
      timestamp: kpi.createdAt.toISOString(),
      link: `/kpis`,
    })),
  ];

  return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, maxItems);
}

/**
 * Dashboard-only KPI payload: same compliance math as the KPI page, but loads minimal `KpiEntry` columns
 * via `listKpiEntriesDashboardCompliance` (not `listKpiEntries`).
 */
export async function getDashboardKpiSummary(prisma: PrismaClient, kpiActor: KpiActor) {
  const accessibleKpiTeams: Array<"acquisitions" | "dispositions"> = (() => {
    switch (kpiActor.roleCode) {
      case "REP":
        return [kpiActor.teamCode === "ACQUISITIONS" ? "acquisitions" : "dispositions"];
      case "ACQUISITIONS_MANAGER":
        return ["acquisitions"];
      case "DISPOSITIONS_MANAGER":
        return ["dispositions"];
      default:
        return ["acquisitions", "dispositions"];
    }
  })();

  const completed = await withDashboardPerf("overview.kpi.periods", () => getMostRecentCompletedWeeklyPeriods(prisma));
  const lastWeek = completed[0];
  const previousWeek = completed[1];

  const lastWeekStarting = lastWeek ? lastWeek.periodStart.toISOString().slice(0, 10) : null;
  const previousWeekStarting = previousWeek ? previousWeek.periodStart.toISOString().slice(0, 10) : null;

  if (!lastWeekStarting) {
    return {
      lastWeekStarting: null,
      previousWeekStarting,
      acquisitions: { overallCompliancePercent: 0, totalReps: 0, metrics: [] },
      dispositions: { overallCompliancePercent: 0, totalReps: 0, metrics: [] },
      offersCompliance: undefined,
      trendDeltaPctPoints: { acquisitions: 0, dispositions: 0 },
      leaderboard: [],
      topPerformer: undefined,
      mostAtRisk: undefined,
    };
  }

  type LeaderEntry = {
    repUserId: string;
    repName: string;
    team: "acquisitions" | "dispositions";
    compliancePercent: number;
    kpisHitCount: number;
    totalKpisTracked: number;
    biggestGapMetricLabel: string | null;
  };

  const leaderboard: LeaderEntry[] = [];

  let acquisitionsSummaryEntries: KpiEntryLikeForWeek[] | null = null;
  let acquisitionsSummaryTargets: KpiTargetsByMetricKey | null = null;
  let dispositionsSummaryEntries: KpiEntryLikeForWeek[] | null = null;
  let dispositionsSummaryTargets: KpiTargetsByMetricKey | null = null;

  type TeamCard = {
    overallCompliancePercent: number;
    totalReps: number;
    metrics: Array<{
      metricKey: string;
      metricLabel: string;
      hitLabel: string;
      hitRatePercent: number;
      hitLabelPrev?: string;
      hitRatePercentPrev?: number;
    }>;
    compliancePercentPrev: number;
  };

  const teamCards: Record<"acquisitions" | "dispositions", TeamCard> = {
    acquisitions: { overallCompliancePercent: 0, totalReps: 0, metrics: [], compliancePercentPrev: 0 },
    dispositions: { overallCompliancePercent: 0, totalReps: 0, metrics: [], compliancePercentPrev: 0 },
  };

  const offersTierBreakdown = {
    belowMinimum: { reps: 0, totalReps: 0 },
    metMinimum: { reps: 0, totalReps: 0 },
    hitTarget: { reps: 0, totalReps: 0 },
    prev: {
      belowMinimum: { reps: 0, totalReps: 0 },
      metMinimum: { reps: 0, totalReps: 0 },
      hitTarget: { reps: 0, totalReps: 0 },
    },
  };

  const teamPayloads = await withDashboardPerf("overview.kpi.teamData", () =>
    Promise.all(
      accessibleKpiTeams.map(async (team) => {
        const [targets, entriesLast, entriesPrev] = await Promise.all([
          listKpiTargetsForTeam(prisma, kpiActor, team),
          listKpiEntriesDashboardCompliance(prisma, kpiActor, team, lastWeekStarting),
          previousWeekStarting
            ? listKpiEntriesDashboardCompliance(prisma, kpiActor, team, previousWeekStarting)
            : Promise.resolve([] as KpiEntryLikeForWeek[]),
        ]);
        return { team, targets, entriesLast, entriesPrev };
      })
    )
  );

  for (const { team, targets, entriesLast, entriesPrev } of teamPayloads) {
    if (team === "acquisitions") {
      acquisitionsSummaryEntries = entriesLast;
      acquisitionsSummaryTargets = targets;
    }
    if (team === "dispositions") {
      dispositionsSummaryEntries = entriesLast;
      dispositionsSummaryTargets = targets;
    }

    const summaryLast = computeKpiTeamComplianceSummary({
      team,
      weekStarting: lastWeekStarting,
      entries: entriesLast,
      targets,
    });

    const summaryPrev = previousWeekStarting
      ? computeKpiTeamComplianceSummary({
          team,
          weekStarting: previousWeekStarting,
          entries: entriesPrev,
          targets,
        })
      : null;

    const cardMetrics = summaryLast.metrics.map((m) => {
      const prevMetric = summaryPrev?.metrics.find((pm) => pm.metricKey === m.metricKey);
      return {
        metricKey: m.metricKey,
        metricLabel: m.metricLabel,
        hitLabel: m.hitLabel,
        hitRatePercent: m.hitRatePercent,
        hitLabelPrev: prevMetric?.hitLabel,
        hitRatePercentPrev: prevMetric?.hitRatePercent,
      };
    });

    teamCards[team] = {
      overallCompliancePercent: summaryLast.compliancePercent,
      totalReps: summaryLast.totalRepsConsidered,
      metrics: cardMetrics,
      compliancePercentPrev: summaryPrev?.compliancePercent ?? 0,
    };

    const perRep = entriesLast.map((entry) =>
      computeKpiRepWeeklyCompliance({
        team,
        weekStarting: lastWeekStarting,
        entry,
        targets,
      })
    );

    if (team === "acquisitions") {
      offersTierBreakdown.belowMinimum.totalReps = perRep.length;
      offersTierBreakdown.metMinimum.totalReps = perRep.length;
      offersTierBreakdown.hitTarget.totalReps = perRep.length;

      for (const rep of perRep) {
        const offersMetric = rep.metrics.find((m) => m.metricKey === "OFFERS_MADE");
        if (!offersMetric?.offers) continue;
        if (offersMetric.offers.offersTier === "MISS_FLOOR") offersTierBreakdown.belowMinimum.reps += 1;
        else if (offersMetric.offers.offersTier === "HIT_FLOOR_ONLY") offersTierBreakdown.metMinimum.reps += 1;
        else offersTierBreakdown.hitTarget.reps += 1;
      }

      const perRepPrev = entriesPrev.map((entry) =>
        computeKpiRepWeeklyCompliance({
          team: "acquisitions",
          weekStarting: previousWeekStarting ?? lastWeekStarting,
          entry,
          targets,
        })
      );
      offersTierBreakdown.prev.belowMinimum.totalReps = perRepPrev.length;
      offersTierBreakdown.prev.metMinimum.totalReps = perRepPrev.length;
      offersTierBreakdown.prev.hitTarget.totalReps = perRepPrev.length;

      for (const rep of perRepPrev) {
        const offersMetric = rep.metrics.find((m) => m.metricKey === "OFFERS_MADE");
        if (!offersMetric?.offers) continue;
        if (offersMetric.offers.offersTier === "MISS_FLOOR") offersTierBreakdown.prev.belowMinimum.reps += 1;
        else if (offersMetric.offers.offersTier === "HIT_FLOOR_ONLY") offersTierBreakdown.prev.metMinimum.reps += 1;
        else offersTierBreakdown.prev.hitTarget.reps += 1;
      }
    }

    for (const rep of perRep) {
      const worstMissed = rep.metrics
        .filter((m) => !m.hit)
        .slice()
        .sort((a, b) => a.varianceDailyAverage - b.varianceDailyAverage)[0];

      leaderboard.push({
        repUserId: rep.repUserId,
        repName: rep.repName,
        team,
        compliancePercent: rep.compliancePercent,
        kpisHitCount: rep.kpisHitCount,
        totalKpisTracked: rep.totalKpisTracked,
        biggestGapMetricLabel: worstMissed?.metricLabel ?? null,
      });
    }
  }

  leaderboard.sort((a, b) => {
    if (b.compliancePercent !== a.compliancePercent) return b.compliancePercent - a.compliancePercent;
    return a.repName.localeCompare(b.repName);
  });

  const topPerformer = leaderboard[0]
    ? {
        repUserId: leaderboard[0].repUserId,
        repName: leaderboard[0].repName,
        team: leaderboard[0].team,
        compliancePercent: leaderboard[0].compliancePercent,
      }
    : undefined;

  const mostAtRiskEntry = leaderboard.length ? leaderboard[leaderboard.length - 1] : undefined;
  const mostAtRisk = mostAtRiskEntry
    ? {
        repUserId: mostAtRiskEntry.repUserId,
        repName: mostAtRiskEntry.repName,
        team: mostAtRiskEntry.team,
        compliancePercent: mostAtRiskEntry.compliancePercent,
        biggestGapMetricLabel: mostAtRiskEntry.biggestGapMetricLabel,
      }
    : undefined;

  let weeklySummaryText: string | null = null;
  if (
    lastWeekStarting &&
    acquisitionsSummaryEntries &&
    dispositionsSummaryEntries &&
    acquisitionsSummaryTargets &&
    dispositionsSummaryTargets
  ) {
    const out = await withDashboardPerf("overview.kpi.summaryText", async () =>
      generateWeeklyKpiSummaryText({
        weekStarting: lastWeekStarting,
        acquisitions: { entries: acquisitionsSummaryEntries, targets: acquisitionsSummaryTargets },
        dispositions: { entries: dispositionsSummaryEntries, targets: dispositionsSummaryTargets },
      })
    );
    weeklySummaryText = [
      out.acquisitionsRecap,
      out.dispositionsRecap,
      "",
      out.teamTakeaway,
      "",
      ...out.stretchFocusByRep.map((r) => `- ${r.text}`),
    ].join("\n");
  }

  const offersMetric = teamCards.acquisitions.metrics.find((m) => m.metricKey === "OFFERS_MADE");
  const offersCompliance = offersMetric
    ? {
        hitLabel: offersMetric.hitLabel,
        hitRatePercent: offersMetric.hitRatePercent,
        hitReps: Number(offersMetric.hitLabel.split("/")[0] ?? 0),
        totalReps: Number(offersMetric.hitLabel.split("/")[1] ?? 0),
      }
    : undefined;

  const trendDeltaPctPoints = {
    acquisitions: teamCards.acquisitions.overallCompliancePercent - teamCards.acquisitions.compliancePercentPrev,
    dispositions: teamCards.dispositions.overallCompliancePercent - teamCards.dispositions.compliancePercentPrev,
  };

  return {
    lastWeekStarting,
    previousWeekStarting,
    weeklySummaryText,
    acquisitions: {
      overallCompliancePercent: teamCards.acquisitions.overallCompliancePercent,
      totalReps: teamCards.acquisitions.totalReps,
      metrics: teamCards.acquisitions.metrics,
    },
    dispositions: {
      overallCompliancePercent: teamCards.dispositions.overallCompliancePercent,
      totalReps: teamCards.dispositions.totalReps,
      metrics: teamCards.dispositions.metrics,
    },
    offersTierBreakdown,
    offersCompliance,
    trendDeltaPctPoints,
    leaderboard: leaderboard.slice(0, 6).map((l) => ({
      repUserId: l.repUserId,
      repName: l.repName,
      team: l.team,
      compliancePercent: l.compliancePercent,
      kpisHitCount: l.kpisHitCount,
      totalKpisTracked: l.totalKpisTracked,
    })),
    topPerformer,
    mostAtRisk,
  };
}

export async function getDashboardOverview(prisma: PrismaClient, actor: { id: string; roleCode: string; teamCode: string }) {
  const dealActor: DealActor = { id: actor.id, roleCode: actor.roleCode as unknown as UserRoleCode };
  const drawActor: DrawActor = { id: actor.id, roleCode: actor.roleCode as unknown as UserRoleCode, teamCode: actor.teamCode as unknown as TeamCode };
  const kpiActor: KpiActor = { id: actor.id, roleCode: actor.roleCode as unknown as UserRoleCode, teamCode: actor.teamCode as unknown as TeamCode };

  const kpiDashboardPromise = (async () => {
    return withDashboardPerf("overview.kpiDashboard", () => getDashboardKpiSummary(prisma, kpiActor));
  })();

  const [assignmentRevenueTrend, pointsTrend, weeklySnapshot, activity, teamSize, monthDealStats, kpiDashboard, potentialPipeline] = await Promise.all([
    withDashboardPerf("overview.slice.revenueTrend", () =>
      getMonthlyDealRevenueSeries({ prisma, actor: dealActor, monthsBack: 6 })
    ),
    withDashboardPerf("overview.slice.pointsTrend", () => getPointsTrendSeries({ prisma, actor, monthsBack: 6 })),
    withDashboardPerf("overview.slice.weeklyKpiSnapshot", () => getWeeklyKpiSnapshot(prisma, kpiActor)),
    withDashboardPerf("overview.slice.activity", () =>
      getRecentActivityFeed({ prisma, actor: dealActor, drawActor, kpiActor, maxItems: 12 })
    ),
    withDashboardPerf("overview.slice.teamSize", () => (async () => {
      // Role-aware team size: count active/inactive REPs visible to the actor.
      if (actor.roleCode === "REP") {
        const u = await prisma.user.findUnique({
          where: { id: actor.id },
          select: { active: true },
        });
        const active = u?.active ? 1 : 0;
        return { active, inactive: active ? 0 : 1 };
      }

      if (actor.roleCode === "ACQUISITIONS_MANAGER") {
        const [active, inactive] = await Promise.all([
          prisma.user.count({ where: { active: true, role: { code: "REP" }, team: { code: "ACQUISITIONS" } } }),
          prisma.user.count({ where: { active: false, role: { code: "REP" }, team: { code: "ACQUISITIONS" } } }),
        ]);
        return { active, inactive };
      }

      if (actor.roleCode === "DISPOSITIONS_MANAGER") {
        const [active, inactive] = await Promise.all([
          prisma.user.count({ where: { active: true, role: { code: "REP" }, team: { code: "DISPOSITIONS" } } }),
          prisma.user.count({ where: { active: false, role: { code: "REP" }, team: { code: "DISPOSITIONS" } } }),
        ]);
        return { active, inactive };
      }

      // TC/Admin/managers default to all REPs
      const [active, inactive] = await Promise.all([
        prisma.user.count({ where: { active: true, role: { code: "REP" } } }),
        prisma.user.count({ where: { active: false, role: { code: "REP" } } }),
      ]);
      return { active, inactive };
    })()),
    withDashboardPerf("overview.slice.monthFundedStats", () => getCurrentMonthFundedDealStats(prisma, dealActor)),
    kpiDashboardPromise,
    withDashboardPerf("overview.slice.potentialPipeline", () => getPotentialPipelineValue(prisma, dealActor)),
  ]);

  return {
    fundedDealsThisMonth: monthDealStats.fundedDealsThisMonth,
    totalAssignmentRevenueThisMonth: monthDealStats.totalAssignmentRevenueThisMonth,
    avgAssignmentFeeThisMonth: monthDealStats.avgAssignmentFeeThisMonth,
    assignmentRevenueTrend,
    pointsTrend,
    weeklySnapshot,
    recentActivity: activity,
    teamSize,
    kpiDashboard,
    potentialPipeline,
  };
}

