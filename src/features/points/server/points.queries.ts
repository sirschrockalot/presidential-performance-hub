import type { PrismaClient, TeamCode, UserRoleCode } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { dealWhereForScope } from "@/features/deals/server/deal-scope";

type PointsActor = {
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
  actor: PointsActor
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

  return grouped
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

export async function listPointRecipientsForManualAdjustment(
  prisma: PrismaClient,
  actor: PointsActor
): Promise<{ value: string; label: string }[]> {
  // Admin-only capability is enforced by callers; we keep a minimal server-side guard too.
  if (!["ADMIN", "ACQUISITIONS_MANAGER", "DISPOSITIONS_MANAGER"].includes(actor.roleCode)) return [];

  const repTeamCode =
    actor.roleCode === "ACQUISITIONS_MANAGER" ? "ACQUISITIONS" : actor.roleCode === "DISPOSITIONS_MANAGER" ? "DISPOSITIONS" : null;

  const users = await prisma.user.findMany({
    where: {
      active: true,
      role: { code: { in: repTeamCode ? ["REP"] : ["REP", "TRANSACTION_COORDINATOR"] } },
      ...(repTeamCode ? { team: { code: repTeamCode } } : {}),
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
  // Access control: reps can only view themselves.
  if (actor.roleCode === "REP" && repId !== actor.id) {
    return { repId, points: 0, manualAdjustments: 0, fundedDealEventCount: 0 };
  }

  const where = { userId: repId } as Prisma.PointEventWhereInput;

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

  // Enforced in route handler too, but we keep a server-side guard and also scope managers.
  if (!["ADMIN", "ACQUISITIONS_MANAGER", "DISPOSITIONS_MANAGER"].includes(actor.roleCode)) {
    throw new Error("Forbidden");
  }

  if (actor.roleCode === "ACQUISITIONS_MANAGER") {
    if (recipient.role.code !== "REP" || recipient.team.code !== "ACQUISITIONS") throw new Error("Forbidden");
  }
  if (actor.roleCode === "DISPOSITIONS_MANAGER") {
    if (recipient.role.code !== "REP" || recipient.team.code !== "DISPOSITIONS") throw new Error("Forbidden");
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

    await tx.pointEvent.create({
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
  });

  if (!adjustmentId) throw new Error("Failed to create adjustment");
  return { adjustmentId };
}

