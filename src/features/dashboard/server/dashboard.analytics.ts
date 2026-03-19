import type { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import type { DealActor } from "@/features/deals/server/deal-scope";
import { dealWhereForScope } from "@/features/deals/server/deal-scope";

import type { DrawActor } from "@/features/draws/server/draw-scope";
import { drawWhereForScope } from "@/features/draws/server/draw-scope";

import type { KpiActor } from "@/features/kpis/server/kpi-scope";
import { kpiEntryUserWhereForScope, uiTeamToPrismaTeamCode } from "@/features/kpis/server/kpi-scope";

import type { Team } from "@/types";

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

async function getMonthlyDealRevenueSeries(params: { prisma: PrismaClient; actor: DealActor; monthsBack: number }): Promise<MonthlySeriesPoint[]> {
  const { prisma, actor, monthsBack } = params;
  const whereBase: Prisma.DealWhereInput = {
    ...dealWhereForScope(actor),
    status: "CLOSED_FUNDED",
  };

  const points: MonthlySeriesPoint[] = [];
  for (let i = -monthsBack + 1; i <= 0; i++) {
    const { start, end, label } = monthRangeUtc(i);
    const agg = await prisma.deal.aggregate({
      where: {
        ...whereBase,
        closedFundedDate: { gte: start, lt: end },
      },
      _sum: { assignmentFee: true },
      _count: { id: true },
    });

    points.push({
      month: label,
      revenue: agg._sum.assignmentFee ? Number(agg._sum.assignmentFee) : 0,
      fundedDeals: agg._count.id,
    });
  }

  return points;
}

async function getCurrentMonthFundedDealStats(prisma: PrismaClient, actor: DealActor) {
  const { start, end } = monthRangeUtc(0);
  const where: Prisma.DealWhereInput = {
    ...dealWhereForScope(actor),
    status: "CLOSED_FUNDED",
    closedFundedDate: { gte: start, lt: end },
  };

  const agg = await prisma.deal.aggregate({
    where,
    _sum: { assignmentFee: true },
    _avg: { assignmentFee: true },
    _count: { id: true },
  });

  return {
    fundedDealsThisMonth: agg._count.id,
    totalAssignmentRevenueThisMonth: agg._sum.assignmentFee ? Number(agg._sum.assignmentFee) : 0,
    avgAssignmentFeeThisMonth: agg._avg.assignmentFee ? Number(agg._avg.assignmentFee) : 0,
  };
}

async function getPointsTrendSeries(params: { prisma: PrismaClient; actor: { id: string; roleCode: string; teamCode?: string }; monthsBack: number }): Promise<PointsTrendPoint[]> {
  const { prisma, actor, monthsBack } = params;

  const baseWhere: Prisma.PointEventWhereInput = {
    ...pointsWhereForActor(actor),
    kind: "AUTO_FUNDED_DEAL",
  };

  const points: PointsTrendPoint[] = [];
  for (let i = -monthsBack + 1; i <= 0; i++) {
    const { start, end, label } = monthRangeUtc(i);
    const agg = await prisma.pointEvent.aggregate({
      where: {
        ...baseWhere,
        createdAt: { gte: start, lt: end },
      },
      _sum: { points: true },
      _count: { id: true },
    });

    points.push({
      month: label,
      points: agg._sum.points ? Number(agg._sum.points) : 0,
    });
  }

  return points;
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

  const accessibleKpiTeamCodes: string[] =
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
    team: { code: { in: accessibleKpiTeamCodes as any } },
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
      team: true,
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

export async function getDashboardOverview(prisma: PrismaClient, actor: { id: string; roleCode: string; teamCode: string }) {
  const dealActor: DealActor = { id: actor.id, roleCode: actor.roleCode as any };
  const drawActor: DrawActor = { id: actor.id, roleCode: actor.roleCode as any, teamCode: actor.teamCode as any };
  const kpiActor: KpiActor = { id: actor.id, roleCode: actor.roleCode as any, teamCode: actor.teamCode as any };

  const [assignmentRevenueTrend, pointsTrend, weeklySnapshot, activity, teamSize, monthDealStats] = await Promise.all([
    getMonthlyDealRevenueSeries({ prisma, actor: dealActor, monthsBack: 6 }),
    getPointsTrendSeries({ prisma, actor, monthsBack: 6 }),
    getWeeklyKpiSnapshot(prisma, kpiActor),
    getRecentActivityFeed({ prisma, actor: dealActor, drawActor, kpiActor, maxItems: 12 }),
    (async () => {
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
    })(),
    getCurrentMonthFundedDealStats(prisma, dealActor),
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
  };
}

