import type { PrismaClient, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import type { Team } from "@/types";
import type { KpiEntry as UiKpiEntry } from "@/types";
import type { KpiMetricKey } from "@/features/kpis/utils/kpi-metrics";

import type { KpiActor } from "@/features/kpis/server/kpi-scope";
import { canMutateKpiEntries, kpiEntryUserWhereForScope, uiTeamToPrismaTeamCode } from "@/features/kpis/server/kpi-scope";

function dateOnlyToIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseWeekStarting(weekStarting: string): Date {
  return new Date(`${weekStarting}T00:00:00.000Z`);
}

function decToNumber(d: Decimal): number {
  return Number(d);
}

export type KpiEntryWithRepDto = UiKpiEntry & { repName: string };

export type KpiWeekSummaryDto = {
  totalDials: number;
  totalTalkTime: number;
  totalRevenue: number;
  repCount: number;
};

export type KpiTrendPointDto = {
  week: string; // e.g. "03-03"
  weekFull: string; // e.g. "2026-03-03"
  dials: number;
  talkTime: number;
  revenue: number;
  entryCount: number;
  dialsTarget?: number;
  revenueTarget?: number;
};

export type KpiTargetsByMetricKey = Partial<Record<KpiMetricKey, number>>;

export type KpiHistoryRowDto = {
  id: string;
  weekStarting: string;
  repUserId: string;
  repName: string;
  team: Team;
  dials: number;
  talkTimeMinutes: number;
  falloutCount: number;
  revenueFromFunded: number;
  leadsWorked?: number;
  offersMade?: number;
  contractsSigned?: number;
  buyerConversations?: number;
  propertiesMarketed?: number;
  emdsReceived?: number;
  assignmentsSecured?: number;
  avgAssignmentFee?: number;
};

type KpiEntryMapperInput = {
  id: string;
  userId: string;
  dials: number;
  talkTimeMinutes: number;
  falloutCount: number;
  revenueFromFunded: Decimal;
  leadsWorked: number | null;
  offersMade: number | null;
  contractsSigned: number | null;
  buyerConversations: number | null;
  propertiesMarketed: number | null;
  emdsReceived: number | null;
  assignmentsSecured: number | null;
  avgAssignmentFee: Decimal | null;
  user?: { name?: string | null } | null;
  reportingPeriod?: { periodStart: Date } | null;
};

function mapKpiEntryToDto(entry: KpiEntryMapperInput, team: Team) {
  const repName = entry.user?.name ?? "Unknown";
  const weekStarting = entry.reportingPeriod
    ? dateOnlyToIsoDate(entry.reportingPeriod.periodStart)
    : (entry as any).weekStarting;

  return {
    id: entry.id,
    userId: entry.userId,
    team,
    weekStarting,
    dials: entry.dials,
    talkTimeMinutes: entry.talkTimeMinutes,
    leadsWorked: entry.leadsWorked ?? undefined,
    offersMade: entry.offersMade ?? undefined,
    contractsSigned: entry.contractsSigned ?? undefined,
    falloutCount: entry.falloutCount,
    revenueFromFunded: decToNumber(entry.revenueFromFunded),
    buyerConversations: entry.buyerConversations ?? undefined,
    propertiesMarketed: entry.propertiesMarketed ?? undefined,
    emdsReceived: entry.emdsReceived ?? undefined,
    assignmentsSecured: entry.assignmentsSecured ?? undefined,
    avgAssignmentFee: entry.avgAssignmentFee ? decToNumber(entry.avgAssignmentFee) : undefined,
    repName,
  } satisfies KpiEntryWithRepDto;
}

export async function listKpiWeeks(
  prisma: PrismaClient,
  actor: KpiActor,
  team: Team
): Promise<string[]> {
  const requestedTeamCode = uiTeamToPrismaTeamCode(team);
  const userScope = kpiEntryUserWhereForScope(actor, requestedTeamCode);
  if (userScope.userId === "__none__") return [];

  const weeks = await prisma.reportingPeriod.findMany({
    where: {
      kind: "WEEKLY",
      kpiEntries: {
        some: {
          team: { code: requestedTeamCode },
          ...(userScope.userId ? { userId: userScope.userId } : {}),
        },
      },
    },
    select: { periodStart: true },
    orderBy: { periodStart: "desc" },
  });

  const unique = [...new Set(weeks.map((w) => dateOnlyToIsoDate(w.periodStart)))];
  return unique;
}

export async function listKpiTargetsForTeam(
  prisma: PrismaClient,
  actor: KpiActor,
  team: Team
): Promise<KpiTargetsByMetricKey> {
  // Reads are allowed for reps/managers as long as they can view the team.
  const requestedTeamCode = uiTeamToPrismaTeamCode(team);
  const userScope = kpiEntryUserWhereForScope(actor, requestedTeamCode);
  if (userScope.userId === "__none__") return {};

  const prismaTeam = await prisma.team.findUnique({ where: { code: requestedTeamCode } });
  if (!prismaTeam) return {};

  const targets = await prisma.kpiTarget.findMany({
    where: {
      teamId: prismaTeam.id,
      reportingPeriodId: null,
    },
    select: { metricKey: true, targetValue: true },
  });

  return Object.fromEntries(targets.map((t) => [t.metricKey as KpiMetricKey, decToNumber(t.targetValue)])) as KpiTargetsByMetricKey;
}

export async function listKpiEntries(
  prisma: PrismaClient,
  actor: KpiActor,
  team: Team,
  weekStarting: string | undefined
): Promise<KpiEntryWithRepDto[]> {
  const requestedTeamCode = uiTeamToPrismaTeamCode(team);
  const userScope = kpiEntryUserWhereForScope(actor, requestedTeamCode);

  if (userScope.userId === "__none__") return [];

  const parsedWeek = weekStarting ? parseWeekStarting(weekStarting) : null;
  const reportingPeriodWhere: Prisma.ReportingPeriodWhereInput = parsedWeek
    ? { kind: "WEEKLY", periodStart: parsedWeek }
    : { kind: "WEEKLY" };

  const entries = await prisma.kpiEntry.findMany({
    where: {
      team: { code: requestedTeamCode },
      ...(userScope.userId ? { userId: userScope.userId } : {}),
      reportingPeriod: reportingPeriodWhere,
    },
    include: {
      user: { select: { id: true, name: true } },
      reportingPeriod: { select: { periodStart: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return entries.map((e) => mapKpiEntryToDto(e, team));
}

export async function getKpiWeekSummary(
  prisma: PrismaClient,
  actor: KpiActor,
  team: Team,
  weekStarting: string
): Promise<KpiWeekSummaryDto> {
  const requestedTeamCode = uiTeamToPrismaTeamCode(team);
  const userScope = kpiEntryUserWhereForScope(actor, requestedTeamCode);
  if (userScope.userId === "__none__") return { totalDials: 0, totalTalkTime: 0, totalRevenue: 0, repCount: 0 };

  const parsedWeek = parseWeekStarting(weekStarting);

  const agg = await prisma.kpiEntry.aggregate({
    where: {
      team: { code: requestedTeamCode },
      ...(userScope.userId ? { userId: userScope.userId } : {}),
      reportingPeriod: { kind: "WEEKLY", periodStart: parsedWeek },
    },
    _sum: { dials: true, talkTimeMinutes: true, revenueFromFunded: true },
    _count: { id: true },
  });

  return {
    totalDials: agg._sum.dials ?? 0,
    totalTalkTime: agg._sum.talkTimeMinutes ?? 0,
    totalRevenue: agg._sum.revenueFromFunded ? decToNumber(agg._sum.revenueFromFunded) : 0,
    repCount: agg._count.id,
  };
}

export async function getKpiTrend(
  prisma: PrismaClient,
  actor: KpiActor,
  team: Team
): Promise<{ points: KpiTrendPointDto[]; targets: KpiTargetsByMetricKey }> {
  const weeks = await listKpiWeeks(prisma, actor, team);
  const targets = await listKpiTargetsForTeam(prisma, actor, team);

  const requestedTeamCode = uiTeamToPrismaTeamCode(team);
  const userScope = kpiEntryUserWhereForScope(actor, requestedTeamCode);

  const prismaTeamCode = requestedTeamCode;

  const points = await Promise.all(
    weeks.map(async (weekFull) => {
      const parsedWeek = parseWeekStarting(weekFull);
      const agg = await prisma.kpiEntry.aggregate({
        where: {
          team: { code: prismaTeamCode },
          ...(userScope.userId ? { userId: userScope.userId } : {}),
          reportingPeriod: { kind: "WEEKLY", periodStart: parsedWeek },
        },
        _sum: { dials: true, talkTimeMinutes: true, revenueFromFunded: true },
        _count: { id: true },
      });

      const dials = agg._sum.dials ?? 0;
      const talkTime = agg._sum.talkTimeMinutes ?? 0;
      const revenue = agg._sum.revenueFromFunded ? decToNumber(agg._sum.revenueFromFunded) : 0;
      const entryCount = agg._count.id;

      return {
        week: weekFull.slice(5),
        weekFull,
        dials,
        talkTime,
        revenue,
        entryCount,
        dialsTarget: targets.DIALS ?? undefined,
        revenueTarget: targets.REVENUE_FROM_FUNDED ?? undefined,
      } satisfies KpiTrendPointDto;
    })
  );

  return { points: points.reverse(), targets };
}

export async function listKpiHistory(
  prisma: PrismaClient,
  actor: KpiActor,
  team: Team,
  repUserId?: string
): Promise<KpiHistoryRowDto[]> {
  const requestedTeamCode = uiTeamToPrismaTeamCode(team);
  const userScope = kpiEntryUserWhereForScope(actor, requestedTeamCode);
  if (userScope.userId === "__none__") return [];

  // Managers can optionally focus the history on one rep; reps are always scoped to themselves.
  const finalUserId = actor.roleCode === "REP" ? actor.id : repUserId;
  if (actor.roleCode !== "REP" && finalUserId) {
    // If a manager specifies a rep, it must belong to their accessible team.
    const rep = await prisma.user.findUnique({
      where: { id: finalUserId },
      select: { id: true, role: { select: { code: true } }, team: { select: { code: true } } },
    });
    if (!rep || rep.role.code !== "REP" || rep.team.code !== requestedTeamCode) return [];
  }

  const entries = await prisma.kpiEntry.findMany({
    where: {
      team: { code: requestedTeamCode },
      reportingPeriod: { kind: "WEEKLY" },
      ...(userScope.userId ? { userId: userScope.userId } : {}),
      ...(finalUserId ? { userId: finalUserId } : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
      reportingPeriod: { select: { periodStart: true } },
    },
    orderBy: { reportingPeriod: { periodStart: "desc" } },
  });

  return entries.map((e) => {
    const dto = mapKpiEntryToDto(e as any, team);
    return {
      id: dto.id,
      weekStarting: dto.weekStarting,
      repUserId: dto.userId,
      repName: dto.repName,
      team: dto.team,
      dials: dto.dials,
      talkTimeMinutes: dto.talkTimeMinutes,
      falloutCount: dto.falloutCount,
      revenueFromFunded: dto.revenueFromFunded,
      leadsWorked: dto.leadsWorked,
      offersMade: dto.offersMade,
      contractsSigned: dto.contractsSigned,
      buyerConversations: dto.buyerConversations,
      propertiesMarketed: dto.propertiesMarketed,
      emdsReceived: dto.emdsReceived,
      assignmentsSecured: dto.assignmentsSecured,
      avgAssignmentFee: dto.avgAssignmentFee,
    } satisfies KpiHistoryRowDto;
  });
}

export async function listKpiFormUsers(
  prisma: PrismaClient,
  actor: KpiActor,
  team: Team
): Promise<{ id: string; name: string }[]> {
  const requestedTeamCode = uiTeamToPrismaTeamCode(team);
  const userScope = kpiEntryUserWhereForScope(actor, requestedTeamCode);
  if (userScope.userId === "__none__") return [];

  if (!canMutateKpiEntries(actor) && actor.roleCode !== "REP") return [];

  if (actor.roleCode === "REP") return [{ id: actor.id, name: "You" }];

  const repRole = await prisma.role.findUnique({ where: { code: "REP" } });
  if (!repRole) return [];

  const users = await prisma.user.findMany({
    where: {
      roleId: repRole.id,
      team: { code: requestedTeamCode },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return users;
}

export type UpsertKpiEntryInput = {
  team: Team;
  weekStarting: string;
  repUserId: string;
} & (
  | {
      team: "acquisitions";
      dials: number;
      talkTimeMinutes: number;
      leadsWorked: number;
      offersMade: number;
      contractsSigned: number;
      falloutCount: number;
      revenueFromFunded: number;
    }
  | {
      team: "dispositions";
      dials: number;
      talkTimeMinutes: number;
      buyerConversations: number;
      propertiesMarketed: number;
      emdsReceived: number;
      assignmentsSecured: number;
      avgAssignmentFee: number;
      falloutCount: number;
      revenueFromFunded: number;
    }
);

export async function upsertKpiEntry(
  prisma: PrismaClient,
  actor: KpiActor,
  input: UpsertKpiEntryInput
): Promise<KpiEntryWithRepDto> {
  if (!canMutateKpiEntries(actor)) {
    throw new Error("Forbidden");
  }

  const requestedTeamCode = uiTeamToPrismaTeamCode(input.team);
  const teamAccess = kpiEntryUserWhereForScope(actor, requestedTeamCode);
  if (teamAccess.userId === "__none__") {
    throw new Error("Forbidden");
  }

  const rep = await prisma.user.findUnique({
    where: { id: input.repUserId },
    select: {
      id: true,
      name: true,
      role: { select: { code: true } },
      team: { select: { code: true } },
      teamId: true,
    },
  });
  if (!rep || rep.role.code !== "REP" || rep.team.code !== requestedTeamCode) {
    throw new Error("Invalid rep for team");
  }

  const parsedWeek = parseWeekStarting(input.weekStarting);
  const reportingPeriod = await prisma.reportingPeriod.findFirst({
    where: { kind: "WEEKLY", periodStart: parsedWeek },
    select: { id: true, periodStart: true },
  });
  if (!reportingPeriod) {
    throw new Error("Unknown reporting period");
  }

  const teamId = rep.teamId;

  const normalized: Prisma.KpiEntryUncheckedCreateInput = {
    userId: rep.id,
    teamId,
    reportingPeriodId: reportingPeriod.id,
    dials: input.dials,
    talkTimeMinutes: input.talkTimeMinutes,
    falloutCount: input.falloutCount,
    revenueFromFunded: new Decimal(input.revenueFromFunded),
    leadsWorked: input.team === "acquisitions" ? input.leadsWorked : null,
    offersMade: input.team === "acquisitions" ? input.offersMade : null,
    contractsSigned: input.team === "acquisitions" ? input.contractsSigned : null,
    buyerConversations: input.team === "dispositions" ? input.buyerConversations : null,
    propertiesMarketed: input.team === "dispositions" ? input.propertiesMarketed : null,
    emdsReceived: input.team === "dispositions" ? input.emdsReceived : null,
    assignmentsSecured: input.team === "dispositions" ? input.assignmentsSecured : null,
    avgAssignmentFee: input.team === "dispositions" ? new Decimal(input.avgAssignmentFee) : null,
  };

  const updated = await prisma.kpiEntry.upsert({
    where: {
      userId_reportingPeriodId: {
        userId: rep.id,
        reportingPeriodId: reportingPeriod.id,
      },
    },
    create: normalized,
    update: {
      dials: normalized.dials,
      talkTimeMinutes: normalized.talkTimeMinutes,
      falloutCount: normalized.falloutCount,
      revenueFromFunded: normalized.revenueFromFunded,
      leadsWorked: normalized.leadsWorked,
      offersMade: normalized.offersMade,
      contractsSigned: normalized.contractsSigned,
      buyerConversations: normalized.buyerConversations,
      propertiesMarketed: normalized.propertiesMarketed,
      emdsReceived: normalized.emdsReceived,
      assignmentsSecured: normalized.assignmentsSecured,
      avgAssignmentFee: normalized.avgAssignmentFee,
      teamId,
      reportingPeriodId: reportingPeriod.id,
    },
    include: {
      user: { select: { id: true, name: true } },
      reportingPeriod: { select: { periodStart: true } },
    },
  });

  return mapKpiEntryToDto(updated, input.team);
}

