import type { PrismaClient } from "@prisma/client";
import type { Prisma, UserRoleCode, TeamCode, DealStatus, DrawStatus, PointEventKind } from "@prisma/client";

import { reportsDatePresetSchema, reportsFiltersSchema } from "@/features/reports/schemas";
import { monthShortLabel, monthKeyUtc, resolveReportsDateRange, weekStartingKeyUtc, type ReportsDatePreset } from "@/features/reports/server/reports-date";
import type { Team } from "@/types";
import { uiTeamToPrismaTeamCode } from "@/features/kpis/server/kpi-scope";
import { dealWhereForScope } from "@/features/deals/server/deal-scope";
import { drawWhereForScope } from "@/features/draws/server/draw-scope";

import type { DealActor } from "@/features/deals/server/deal-scope";
import type { DrawActor } from "@/features/draws/server/draw-scope";

type ReportsActor = {
  id: string;
  roleCode: UserRoleCode;
  teamCode: TeamCode;
};

export type ReportsFiltersInput = {
  datePreset?: ReportsDatePreset;
  repId?: string | null;
  team?: Team | null;
  dealStatus: "CLOSED_FUNDED" | "ALL";
};

export type WeeklySummaryRow = {
  weekStarting: string; // YYYY-MM-DD (UTC Monday)
  fundedDeals: number;
  totalRevenue: number;
  avgAssignmentFee: number;
};

export type MonthlySummaryRow = {
  month: string; // YYYY-MM
  monthLabel: string;
  fundedDeals: number;
  totalRevenue: number;
  avgAssignmentFee: number;
};

export type DealProfitabilityRow = {
  dealId: string;
  propertyAddress: string;
  status: DealStatus;
  closedFundedDate: string | null;
  contractPrice: number;
  assignmentFee: number | null;
  marginPct: number | null;
  acquisitionsRepName: string;
  dispositionsRepName: string | null;
  tcName: string | null;
};

export type RepPerformanceRow = {
  repId: string;
  repName: string;
  teamCode: TeamCode;
  fundedDeals: number;
  totalRevenue: number;
  avgAssignmentFee: number;
  avgMarginPct: number | null;
  pointsTotal: number;
  manualAdjustmentsCount: number;
};

export type TeamPerformanceRow = {
  teamCode: TeamCode;
  teamName: string;
  fundedDeals: number;
  totalRevenue: number;
  avgAssignmentFee: number;
  pointsTotal: number;
};

export type DrawExposureRow = {
  repId: string;
  repName: string;
  teamCode: TeamCode;
  approvedCount: number;
  paidCount: number;
  drawsCount: number;
  outstandingBalance: number;
  totalRecouped: number;
};

export type PointsSummaryRow = {
  userId: string;
  userName: string;
  teamCode: TeamCode;
  roleCode: UserRoleCode;
  totalPoints: number;
  autoEvents: number;
  manualEvents: number;
  distinctAutoDealCount: number;
};

export type ReportsDataDto = {
  filterOptions: {
    repOptions: { value: string; label: string }[];
    teamOptions: { value: Team | "all"; label: string }[];
  };
  weeklySummary: WeeklySummaryRow[];
  monthlySummary: MonthlySummaryRow[];
  dealDistributionByStatus: { status: DealStatus; count: number }[];
  dealProfitability: DealProfitabilityRow[];
  repPerformance: RepPerformanceRow[];
  teamPerformance: TeamPerformanceRow[];
  drawExposure: DrawExposureRow[];
  pointsSummary: PointsSummaryRow[];
};

function n(d: Prisma.Decimal | number | null | undefined): number | null {
  if (d == null) return null;
  return typeof d === "number" ? d : Number(d);
}

function actorDealWhere(actor: ReportsActor): Prisma.DealWhereInput {
  switch (actor.roleCode) {
    case "ADMIN":
      return {};
    case "ACQUISITIONS_MANAGER":
      return { acquisitionsRep: { team: { code: "ACQUISITIONS" } } };
    case "DISPOSITIONS_MANAGER":
      return { dispoRep: { team: { code: "DISPOSITIONS" } } };
    case "TRANSACTION_COORDINATOR":
      return { transactionCoordinatorId: actor.id };
    case "REP":
      return { OR: [{ acquisitionsRepId: actor.id }, { dispoRepId: actor.id }] };
    default:
      return { id: "__none__" };
  }
}

function actorTeamFilter(actor: ReportsActor, team: Team | null | undefined): Prisma.DealWhereInput {
  if (!team || team === "operations") return {};
  if (team === "acquisitions") {
    return { acquisitionsRep: { team: { code: "ACQUISITIONS" } } };
  }
  return { dispoRep: { team: { code: "DISPOSITIONS" } } };
}

function applyRepFilter(where: Prisma.DealWhereInput, repId?: string | null): Prisma.DealWhereInput {
  if (!repId) return where;
  return {
    AND: [
      where,
      {
        OR: [{ acquisitionsRepId: repId }, { dispoRepId: repId }],
      },
    ],
  };
}

function resolvePointsWhere(actor: ReportsActor): Prisma.PointEventWhereInput {
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

export async function listReportsData(prisma: PrismaClient, actor: ReportsActor, filters: ReportsFiltersInput): Promise<ReportsDataDto> {
  const { start, end } = resolveReportsDateRange(filters.datePreset ?? "this-month");

  // Filter options for the UI (role-aware).
  const repOptions = await (async () => {
    if (actor.roleCode === "REP") return [{ value: actor.id, label: "You" }];
    const where: Prisma.UserWhereInput = { active: true, role: { code: "REP" } };
    if (actor.roleCode === "ACQUISITIONS_MANAGER") where.team = { code: "ACQUISITIONS" };
    if (actor.roleCode === "DISPOSITIONS_MANAGER") where.team = { code: "DISPOSITIONS" };
    const reps = await prisma.user.findMany({
      where,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return reps.map((u) => ({ value: u.id, label: u.name }));
  })();

  const teamOptions: { value: Team | "all"; label: string }[] = (() => {
    if (actor.roleCode === "ACQUISITIONS_MANAGER") return [{ value: "acquisitions", label: "Acquisitions" }];
    if (actor.roleCode === "DISPOSITIONS_MANAGER") return [{ value: "dispositions", label: "Dispositions" }];
    return [
      { value: "all", label: "All Teams" },
      { value: "acquisitions", label: "Acquisitions" },
      { value: "dispositions", label: "Dispositions" },
    ];
  })();

  // Deals for summaries and tables.
  const baseDealWhere: Prisma.DealWhereInput = applyRepFilter(
    actorDealWhere(actor) as Prisma.DealWhereInput,
    filters.repId
  );
  const scopedTeamWhere = actorTeamFilter(actor, filters.team);

  const allDealsWhere: Prisma.DealWhereInput = {
    AND: [
      baseDealWhere,
      scopedTeamWhere,
      { updatedAt: { gte: start, lt: end } },
    ],
  };

  const dealProfitabilityWhere: Prisma.DealWhereInput =
    filters.dealStatus === "CLOSED_FUNDED"
      ? {
          AND: [
            baseDealWhere,
            scopedTeamWhere,
            { status: "CLOSED_FUNDED" },
            { closedFundedDate: { gte: start, lt: end } },
          ],
        }
      : {
          ...allDealsWhere,
          // Keep profitability rows meaningful; if assignmentFee is missing, margin will be null.
        };

  const [allDeals, fundedDeals, draws, pointEvents] = await Promise.all([
    prisma.deal.findMany({
      where: allDealsWhere,
      select: {
        id: true,
        status: true,
        assignmentFee: true,
        contractPrice: true,
        propertyAddress: true,
        closedFundedDate: true,
        updatedAt: true,
        acquisitionsRep: { select: { id: true, name: true, team: { select: { code: true } } } },
        dispoRep: { select: { id: true, name: true, team: { select: { code: true } } } },
        transactionCoordinator: { select: { id: true, name: true } },
      },
    }),
    prisma.deal.findMany({
      where: {
        AND: [
          baseDealWhere,
          scopedTeamWhere,
          { status: "CLOSED_FUNDED" },
          { closedFundedDate: { gte: start, lt: end } },
        ],
      },
      select: {
        id: true,
        status: true,
        assignmentFee: true,
        contractPrice: true,
        closedFundedDate: true,
        propertyAddress: true,
        acquisitionsRep: { select: { id: true, name: true, team: { select: { code: true } } } },
        dispoRep: { select: { id: true, name: true, team: { select: { code: true } } } },
        transactionCoordinator: { select: { id: true, name: true } },
      },
    }),
    prisma.draw.findMany({
      where: {
        AND: [
          drawWhereForScope({ id: actor.id, roleCode: actor.roleCode, teamCode: actor.teamCode } as DrawActor),
          { status: { in: ["APPROVED", "PAID"] } },
          { createdAt: { gte: start, lt: end } },
          filters.repId ? { repId: filters.repId } : {},
          filters.team && filters.team !== "operations"
            ? {
                rep: {
                  team: { code: filters.team === "acquisitions" ? "ACQUISITIONS" : "DISPOSITIONS" },
                },
              }
            : {},
        ],
      },
      select: {
        id: true,
        repId: true,
        rep: { select: { id: true, name: true, team: { select: { code: true } } } },
        status: true,
        remainingBalance: true,
        amountRecouped: true,
        createdAt: true,
        deal: { select: { id: true, propertyAddress: true } },
      },
    }),
    prisma.pointEvent.findMany({
      where: {
        AND: [
          resolvePointsWhere(actor),
          { createdAt: { gte: start, lt: end } },
          filters.repId ? { userId: filters.repId } : {},
          filters.team && filters.team !== "operations"
            ? { user: { team: { code: filters.team === "acquisitions" ? "ACQUISITIONS" : "DISPOSITIONS" } } }
            : {},
        ],
      },
      select: {
        userId: true,
        user: { select: { id: true, name: true, role: { select: { code: true } }, team: { select: { code: true } } } },
        kind: true,
        points: true,
        dealId: true,
        createdAt: true,
      },
    }),
  ]);

  // Weekly summary (funded deals only).
  const weeklyMap = new Map<string, { fundedDeals: number; totalRevenue: number; sumFee: number }>();
  for (const d of fundedDeals) {
    const key = weekStartingKeyUtc(d.closedFundedDate ?? start);
    const fee = n(d.assignmentFee) ?? 0;
    const cur = weeklyMap.get(key) ?? { fundedDeals: 0, totalRevenue: 0, sumFee: 0 };
    cur.fundedDeals += 1;
    cur.totalRevenue += fee;
    cur.sumFee += fee;
    weeklyMap.set(key, cur);
  }
  const weeklySummary = [...weeklyMap.entries()]
    .map(([weekStarting, v]) => ({
      weekStarting,
      fundedDeals: v.fundedDeals,
      totalRevenue: v.totalRevenue,
      avgAssignmentFee: v.fundedDeals ? v.sumFee / v.fundedDeals : 0,
    }))
    .sort((a, b) => a.weekStarting.localeCompare(b.weekStarting));

  // Monthly summary (funded deals only).
  const monthlyMap = new Map<string, { fundedDeals: number; totalRevenue: number; sumFee: number }>();
  for (const d of fundedDeals) {
    const key = monthKeyUtc(d.closedFundedDate ?? start);
    const fee = n(d.assignmentFee) ?? 0;
    const cur = monthlyMap.get(key) ?? { fundedDeals: 0, totalRevenue: 0, sumFee: 0 };
    cur.fundedDeals += 1;
    cur.totalRevenue += fee;
    cur.sumFee += fee;
    monthlyMap.set(key, cur);
  }
  const monthlySummary = [...monthlyMap.entries()]
    .map(([month, v]) => ({
      month,
      monthLabel: monthShortLabel(month),
      fundedDeals: v.fundedDeals,
      totalRevenue: v.totalRevenue,
      avgAssignmentFee: v.fundedDeals ? v.sumFee / v.fundedDeals : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Deal distribution by status (within updatedAt range).
  const distributionMap = new Map<DealStatus, number>();
  for (const d of allDeals) {
    distributionMap.set(d.status, (distributionMap.get(d.status) ?? 0) + 1);
  }
  const dealDistributionByStatus = [...distributionMap.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // Points aggregate for reuse.
  const pointsByUserId = new Map<
    string,
    { totalPoints: number; autoEvents: number; manualEvents: number; distinctAutoDeals: Set<string> }
  >();
  for (const ev of pointEvents) {
    const cur = pointsByUserId.get(ev.userId) ?? {
      totalPoints: 0,
      autoEvents: 0,
      manualEvents: 0,
      distinctAutoDeals: new Set<string>(),
    };
    cur.totalPoints += n(ev.points) ?? 0;
    if (ev.kind === "AUTO_FUNDED_DEAL") {
      cur.autoEvents += 1;
      if (ev.dealId) cur.distinctAutoDeals.add(ev.dealId);
    } else if (ev.kind === "MANUAL_ADJUSTMENT") {
      cur.manualEvents += 1;
    }
    pointsByUserId.set(ev.userId, cur);
  }

  const drawExposureByRep = new Map<string, { approvedCount: number; paidCount: number; drawsCount: number; outstandingBalance: number; totalRecouped: number; repName: string; teamCode: TeamCode }>();
  for (const dr of draws) {
    const cur = drawExposureByRep.get(dr.repId) ?? {
      approvedCount: 0,
      paidCount: 0,
      drawsCount: 0,
      outstandingBalance: 0,
      totalRecouped: 0,
      repName: dr.rep.name,
      teamCode: dr.rep.team.code,
    };
    cur.drawsCount += 1;
    if (dr.status === "APPROVED") cur.approvedCount += 1;
    if (dr.status === "PAID") cur.paidCount += 1;
    cur.outstandingBalance += n(dr.remainingBalance) ?? 0;
    cur.totalRecouped += n(dr.amountRecouped) ?? 0;
    drawExposureByRep.set(dr.repId, cur);
  }
  const drawExposure = [...drawExposureByRep.entries()].map(([repId, v]) => ({
    repId,
    repName: v.repName,
    teamCode: v.teamCode,
    approvedCount: v.approvedCount,
    paidCount: v.paidCount,
    drawsCount: v.drawsCount,
    outstandingBalance: v.outstandingBalance,
    totalRecouped: v.totalRecouped,
  }));

  // Deal profitability rows.
  const dealProfitability = (filters.dealStatus === "CLOSED_FUNDED" ? fundedDeals : allDeals).map((d) => {
    const assignmentFee = n(d.assignmentFee);
    const contractPrice = n(d.contractPrice) ?? 0;
    const marginPct = assignmentFee != null && contractPrice ? (assignmentFee / contractPrice) * 100 : null;

    return {
      dealId: d.id,
      propertyAddress: d.propertyAddress,
      status: d.status,
      closedFundedDate: d.closedFundedDate ? d.closedFundedDate.toISOString().slice(0, 10) : null,
      contractPrice,
      assignmentFee,
      marginPct,
      acquisitionsRepName: d.acquisitionsRep.name,
      dispositionsRepName: d.dispoRep ? d.dispoRep.name : null,
      tcName: d.transactionCoordinator ? d.transactionCoordinator.name : null,
    };
  }).sort((a, b) => (b.closedFundedDate ?? "").localeCompare(a.closedFundedDate ?? ""));

  // Rep performance rows (funded deals only).
  const repPerfMap = new Map<string, { repName: string; teamCode: TeamCode; fundedDeals: number; totalRevenue: number; totalContractPrice: number }>();
  for (const d of fundedDeals) {
    const fee = n(d.assignmentFee) ?? 0;
    const contract = n(d.contractPrice) ?? 0;
    // Acquisitions rep always exists.
    const acq = d.acquisitionsRep;
    const curAcq = repPerfMap.get(acq.id) ?? { repName: acq.name, teamCode: acq.team.code, fundedDeals: 0, totalRevenue: 0, totalContractPrice: 0 };
    curAcq.fundedDeals += 1;
    curAcq.totalRevenue += fee;
    curAcq.totalContractPrice += contract;
    repPerfMap.set(acq.id, curAcq);

    if (d.dispoRep) {
      const dispo = d.dispoRep;
      const curDisp = repPerfMap.get(dispo.id) ?? { repName: dispo.name, teamCode: dispo.team.code, fundedDeals: 0, totalRevenue: 0, totalContractPrice: 0 };
      curDisp.fundedDeals += 1;
      curDisp.totalRevenue += fee;
      curDisp.totalContractPrice += contract;
      repPerfMap.set(dispo.id, curDisp);
    }
  }

  const repPerformance = [...repPerfMap.entries()]
    .map(([repId, v]) => {
      const pointsAgg = pointsByUserId.get(repId);
      return {
        repId,
        repName: v.repName,
        teamCode: v.teamCode,
        fundedDeals: v.fundedDeals,
        totalRevenue: v.totalRevenue,
        avgAssignmentFee: v.fundedDeals ? v.totalRevenue / v.fundedDeals : 0,
        avgMarginPct: v.totalContractPrice ? (v.totalRevenue / v.totalContractPrice) * 100 : null,
        pointsTotal: pointsAgg?.totalPoints ?? 0,
        manualAdjustmentsCount: pointsAgg?.manualEvents ?? 0,
      };
    })
    .sort((a, b) => b.pointsTotal - a.pointsTotal);

  // Team performance rows (funded deals only).
  const teamPerfMap = new Map<TeamCode, { teamName: string; fundedDeals: number; totalRevenue: number; totalContractPrice: number; pointsTotal: number }>();
  for (const d of fundedDeals) {
    const fee = n(d.assignmentFee) ?? 0;
    const contract = n(d.contractPrice) ?? 0;

    const acqTeam = d.acquisitionsRep.team.code;
    const curAcq = teamPerfMap.get(acqTeam) ?? { teamName: acqTeam === "ACQUISITIONS" ? "Acquisitions" : "Dispositions", fundedDeals: 0, totalRevenue: 0, totalContractPrice: 0, pointsTotal: 0 };
    curAcq.fundedDeals += 1;
    curAcq.totalRevenue += fee;
    curAcq.totalContractPrice += contract;
    teamPerfMap.set(acqTeam, curAcq);

    if (d.dispoRep) {
      const dispTeam = d.dispoRep.team.code;
      const curDisp = teamPerfMap.get(dispTeam) ?? { teamName: dispTeam === "ACQUISITIONS" ? "Acquisitions" : "Dispositions", fundedDeals: 0, totalRevenue: 0, totalContractPrice: 0, pointsTotal: 0 };
      curDisp.fundedDeals += 1;
      curDisp.totalRevenue += fee;
      curDisp.totalContractPrice += contract;
      teamPerfMap.set(dispTeam, curDisp);
    }
  }

  // Add points totals by summing pointsByUserId for users in each team.
  for (const [userId, agg] of pointsByUserId.entries()) {
    // Determine team code from the points event user.
    // We did not store teamCode in the aggregate, so we lookup by first matching event.
    // (In practice, teamCode is stable per user.)
  }

  // Build a mapping from userId => teamCode/role using one point event (cheap, already fetched).
  const pointUserMeta = new Map<string, { teamCode: TeamCode; roleCode: UserRoleCode }>();
  for (const ev of pointEvents) {
    if (!pointUserMeta.has(ev.userId)) {
      pointUserMeta.set(ev.userId, { teamCode: ev.user.team.code, roleCode: ev.user.role.code });
    }
  }
  for (const [userId, agg] of pointsByUserId.entries()) {
    const meta = pointUserMeta.get(userId);
    if (!meta) continue;
    const cur = teamPerfMap.get(meta.teamCode);
    if (!cur) continue;
    cur.pointsTotal += agg.totalPoints;
    teamPerfMap.set(meta.teamCode, cur);
  }

  const teamPerformance: TeamPerformanceRow[] = [...teamPerfMap.entries()].map(([teamCode, v]) => ({
    teamCode,
    teamName: v.teamName,
    fundedDeals: v.fundedDeals,
    totalRevenue: v.totalRevenue,
    avgAssignmentFee: v.fundedDeals ? v.totalRevenue / v.fundedDeals : 0,
    pointsTotal: v.pointsTotal,
  }));

  // Points summary rows.
  const pointsSummary: PointsSummaryRow[] = [...pointsByUserId.entries()]
    .map(([userId, agg]) => {
      const meta = pointUserMeta.get(userId);
      const firstEv = pointEvents.find((e) => e.userId === userId);
      return {
        userId,
        userName: firstEv?.user.name ?? userId,
        teamCode: meta?.teamCode ?? "ACQUISITIONS",
        roleCode: meta?.roleCode ?? "REP",
        totalPoints: agg.totalPoints,
        autoEvents: agg.autoEvents,
        manualEvents: agg.manualEvents,
        distinctAutoDealCount: agg.distinctAutoDeals.size,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);

  return {
    filterOptions: { repOptions, teamOptions },
    weeklySummary,
    monthlySummary,
    dealDistributionByStatus,
    dealProfitability,
    repPerformance,
    teamPerformance,
    drawExposure,
    pointsSummary,
  };
}

