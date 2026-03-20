import type { PrismaClient, TeamCode, UserRoleCode } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { dealWhereForScope } from "@/features/deals/server/deal-scope";
import { writeAuditLog } from "@/lib/audit/audit-log";

export type PointsActor = {
  id: string;
  roleCode: UserRoleCode;
  teamCode: TeamCode;
};

type PointsEventRow = {
  id: string;
  userId: string;
  userName: string;
  teamCode: string;
  roleCode: string;
  dealId: string | null;
  dealAddress: string | null;
  points: number;
  reason: string;
  kind: string;
  isManualAdjustment: boolean;
  createdAt: string;
};

export type PointsMetricsDto = {
  totalCompanyPoints: number;
  totalEvents: number;
  manualAdjustments: number;
  fundedDeals: number;
};

export type PointsLeaderboardEntryDto = {
  userId: string;
  name: string;
  team: string;
  role: string;
  points: number;
  dealEventCount: number;
};

function pointsWhereForActor(actor: PointsActor): Prisma.PointEventWhereInput {
  switch (actor.roleCode) {
    case "REP":
      return { userId: actor.id };
    case "TRANSACTION_COORDINATOR":
      return {
        OR: [
          { userId: actor.id },
          { deal: { transactionCoordinatorId: actor.id } },
        ],
      };
    case "ADMIN":
      return {};
    case "ACQUISITIONS_MANAGER":
      return { user: { team: { code: "ACQUISITIONS" } } };
    case "DISPOSITIONS_MANAGER":
      return { user: { team: { code: "DISPOSITIONS" } } };
    default:
      return { id: "__none__" };
  }
}

function getDateRange(year?: number, month?: number): { gte: Date; lt: Date } | null {
  if (!year || !month) return null;
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { gte: start, lt: end };
}

async function resolveUsers(prisma: PrismaClient, userIds: string[]) {
  if (userIds.length === 0) return [];
  return prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, role: { select: { code: true } }, team: { select: { code: true } } },
  });
}

export async function getPointsMetrics(prisma: PrismaClient, actor: PointsActor): Promise<PointsMetricsDto> {
  const where = pointsWhereForActor(actor);

  const agg = await prisma.pointEvent.aggregate({
    where,
    _sum: { points: true },
    _count: { _all: true },
  });

  const manualAdjustments = await prisma.pointEvent.count({
    where: { ...where, kind: "MANUAL_ADJUSTMENT" },
  });

  const fundedDeals = await prisma.deal.count({
    where: { ...dealWhereForScope({ id: actor.id, roleCode: actor.roleCode }), status: "CLOSED_FUNDED" },
  });

  return {
    totalCompanyPoints: agg._sum.points == null ? 0 : Number(agg._sum.points),
    totalEvents: agg._count._all,
    manualAdjustments,
    fundedDeals,
  };
}

export async function getPointsLeaderboard(
  prisma: PrismaClient,
  actor: PointsActor,
  options?: { maxRows?: number }
): Promise<PointsLeaderboardEntryDto[]> {
  const where = pointsWhereForActor(actor);

  const grouped = await prisma.pointEvent.groupBy({
    by: ["userId"],
    where,
    _sum: { points: true },
  });

  const userIds = grouped.map((g) => g.userId);
  const users = await resolveUsers(prisma, userIds);
  const userById = new Map(users.map((u) => [u.id, u]));

  const autoCounts = await prisma.pointEvent.groupBy({
    by: ["userId"],
    where: { ...where, kind: "AUTO_FUNDED_DEAL" },
    _count: { _all: true },
  });
  const autoCountByUser = new Map(autoCounts.map((g) => [g.userId, g._count._all]));

  const sorted = grouped
    .map((g) => {
      const u = userById.get(g.userId);
      if (!u) return null;
      return {
        userId: g.userId,
        name: u.name,
        team: u.team.code,
        role: u.role.code,
        points: g._sum.points == null ? 0 : Number(g._sum.points),
        dealEventCount: autoCountByUser.get(g.userId) ?? 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.points - a!.points) as PointsLeaderboardEntryDto[];

  const cap = options?.maxRows;
  if (cap != null && cap > 0 && sorted.length > cap) {
    return sorted.slice(0, cap);
  }
  return sorted;
}

export async function listPointEvents(
  prisma: PrismaClient,
  actor: PointsActor,
  options?: { repId?: string; year?: number; month?: number }
): Promise<PointsEventRow[]> {
  const where: Prisma.PointEventWhereInput = {
    ...pointsWhereForActor(actor),
  };

  if (options?.repId) {
    // Access control: reps can only view themselves.
    if (actor.roleCode === "REP" && options.repId !== actor.id) {
      return [];
    }
    where.userId = options.repId;
  }

  const dateRange = getDateRange(options?.year, options?.month);
  if (dateRange) {
    where.createdAt = { gte: dateRange.gte, lt: dateRange.lt };
  }

  const events = await prisma.pointEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      user: { select: { name: true, role: { select: { code: true } }, team: { select: { code: true } } } },
      dealId: true,
      deal: { select: { propertyAddress: true } },
      points: true,
      kind: true,
      reason: true,
      createdAt: true,
      pointAdjustmentId: true,
    },
  });

  return events.map((e) => {
    const isManualAdjustment = e.kind === "MANUAL_ADJUSTMENT";
    return {
      id: e.id,
      userId: e.userId,
      userName: e.user.name,
      teamCode: e.user.team.code,
      roleCode: e.user.role.code,
      dealId: e.dealId,
      dealAddress: e.deal?.propertyAddress ?? null,
      points: Number(e.points),
      reason: e.reason,
      kind: e.kind,
      isManualAdjustment,
      createdAt: e.createdAt.toISOString(),
    };
  });
}

export async function canActorViewRepPointsSummary(
  prisma: PrismaClient,
  actor: PointsActor,
  repId: string
): Promise<boolean> {
  if (actor.roleCode === "ADMIN") return true;
  if (actor.roleCode === "REP") return repId === actor.id;

  const target = await prisma.user.findUnique({
    where: { id: repId },
    select: { team: { select: { code: true } } },
  });
  if (!target) return false;

  if (actor.roleCode === "ACQUISITIONS_MANAGER") {
    return target.team.code === "ACQUISITIONS";
  }
  if (actor.roleCode === "DISPOSITIONS_MANAGER") {
    return target.team.code === "DISPOSITIONS";
  }
  if (actor.roleCode === "TRANSACTION_COORDINATOR") {
    if (repId === actor.id) return true;
    const linked = await prisma.deal.findFirst({
      where: {
        transactionCoordinatorId: actor.id,
        OR: [{ acquisitionsRepId: repId }, { dispoRepId: repId }],
      },
      select: { id: true },
    });
    return !!linked;
  }

  return false;
}

export async function listPointRecipientsForManualAdjustment(
  prisma: PrismaClient,
  actor: PointsActor
): Promise<{ value: string; label: string }[]> {
  // Admin-only capability is enforced by callers; we keep a minimal server-side guard too.
  if (actor.roleCode !== "ADMIN") return [];

  const users = await prisma.user.findMany({
    where: {
      active: true,
      role: { code: { in: ["REP", "TRANSACTION_COORDINATOR"] } },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return users.map((u) => ({ value: u.id, label: u.name }));
}

export async function getRepPointsSummary(
  prisma: PrismaClient,
  actor: PointsActor,
  repId: string
): Promise<{ repId: string; points: number; manualAdjustments: number; fundedDealEventCount: number }> {
  const allowed = await canActorViewRepPointsSummary(prisma, actor, repId);
  if (!allowed) {
    throw new Error("Forbidden");
  }

  const where: Prisma.PointEventWhereInput = {
    AND: [pointsWhereForActor(actor), { userId: repId }],
  };

  const pts = await prisma.pointEvent.aggregate({ where, _sum: { points: true } });
  const manual = await prisma.pointEvent.count({ where: { ...where, kind: "MANUAL_ADJUSTMENT" } });
  const fundedCount = await prisma.pointEvent.count({ where: { ...where, kind: "AUTO_FUNDED_DEAL" } });

  return {
    repId,
    points: pts._sum.points == null ? 0 : Number(pts._sum.points),
    manualAdjustments: manual,
    fundedDealEventCount: fundedCount,
  };
}

export async function createManualPointAdjustment(
  prisma: PrismaClient,
  actor: PointsActor,
  input: { recipientUserId: string; points: number; reason: string; dealId?: string | null }
): Promise<{ adjustmentId: string }> {
  const recipient = await prisma.user.findUnique({
    where: { id: input.recipientUserId },
    select: { id: true, role: { select: { code: true } }, team: { select: { code: true } } },
  });
  if (!recipient) {
    throw new Error("Recipient not found");
  }

  const reason = input.reason.trim();
  if (!reason) throw new Error("Reason is required");

  // Admin-only: keep route and service aligned.
  if (actor.roleCode !== "ADMIN") {
    throw new Error("Forbidden");
  }

  const pointsDecimal = new Decimal(input.points);
  let adjustmentId: string | null = null;

  await prisma.$transaction(async (tx) => {
    const adjustment = await tx.pointAdjustment.create({
      data: {
        recipientUserId: input.recipientUserId,
        dealId: input.dealId ?? null,
        points: pointsDecimal,
        reason,
        approvedByUserId: actor.id,
      },
    });

    const event = await tx.pointEvent.create({
      data: {
        userId: input.recipientUserId,
        dealId: input.dealId ?? null,
        points: pointsDecimal,
        kind: "MANUAL_ADJUSTMENT",
        reason,
        pointAdjustmentId: adjustment.id,
        createdByUserId: actor.id,
      },
    });

    adjustmentId = adjustment.id;

    await writeAuditLog(tx, {
      actorUserId: actor.id,
      action: "points.adjustment.create",
      entityType: "point_adjustment",
      entityId: adjustment.id,
      metadata: {
        recipientUserId: input.recipientUserId,
        dealId: input.dealId ?? null,
        points: input.points,
        reason,
        pointEventId: event.id,
      },
    });
  });

  if (!adjustmentId) throw new Error("Failed to create adjustment");
  return { adjustmentId };
}

