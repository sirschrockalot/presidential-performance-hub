import type { Prisma, PrismaClient, TeamCode, UserRoleCode } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import { DEAL_STATUS_FROM_UI, DEAL_STATUS_TO_UI, DRAW_STATUS_TO_UI } from "@/domain/prisma-enums";
import type { DealStatus as UiDealStatus } from "@/types";
import type { CreateDealInput, ListDealsQuery, UpdateDealInput, UpdateDealStatusInput } from "@/features/deals/schemas/deal.schemas";
import {
  loadActorTeamCode,
  resolveValidatedDealAssignments,
} from "@/features/deals/server/deal-assignment-invariants";
import { dealWhereForScope, type DealActor } from "@/features/deals/server/deal-scope";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { syncPointsForDealFundingTransition } from "@/features/points/server/points.engine";
import { calculatePoints, calculateTcPoints } from "@/features/points/server/points-calculator";
import { computeAssignmentFee, resolvedAssignmentFeeOrCompute } from "@/features/deals/utils/assignment-fee";

const dealListInclude = {
  acquisitionsRep: { select: { id: true, name: true } },
  dispoRep: { select: { id: true, name: true } },
  transactionCoordinator: { select: { id: true, name: true } },
  pointEvents: { select: { points: true } },
} as const;

const dealDetailInclude = {
  ...dealListInclude,
  notes: {
    orderBy: { createdAt: "desc" as const },
    include: { author: { select: { id: true, name: true } } },
  },
  statusHistory: {
    orderBy: { changedAt: "desc" as const },
    include: { changedBy: { select: { id: true, name: true } } },
  },
  draws: {
    include: { rep: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" as const },
  },
  pointEvents: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

function num(d: Decimal | null | undefined): number | null {
  if (d == null) return null;
  return Number(d);
}

function n(d: Decimal): number {
  return Number(d);
}

function dateOnly(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

/** Minimal deal row for the dashboard “recent deals” widget (smaller payload than `DealListRow`). */
export type DashboardRecentDealRow = {
  id: string;
  propertyAddress: string;
  acquisitionsRepName: string;
  status: UiDealStatus;
  /** Effective assignment fee / spread (same rules as full deal list). */
  assignmentFee: number | null;
};

export type DealListRow = {
  id: string;
  propertyAddress: string;
  sellerName: string;
  buyerName: string | null;
  acquisitionsRepId: string;
  dispoRepId: string | null;
  transactionCoordinatorId: string | null;
  contractDate: string;
  assignedDate: string | null;
  closedFundedDate: string | null;
  contractPrice: number;
  assignmentPrice: number | null;
  assignmentFee: number | null;
  margin: number | null;
  buyerEmdAmount: number | null;
  buyerEmdReceived: boolean;
  potentialPointsEarned: number;
  actualPointsEarned: number;
  titleCompany: string;
  inspectionEndDate: string | null;
  status: UiDealStatus;
  createdAt: string;
  updatedAt: string;
  acquisitionsRepName: string;
  dispoRepName: string | null;
  tcName: string | null;
};

function mapDealListRow(
  deal: Prisma.DealGetPayload<{ include: typeof dealListInclude }>
): DealListRow {
  const margin = resolvedAssignmentFeeOrCompute(
    n(deal.contractPrice),
    num(deal.assignmentPrice),
    num(deal.assignmentFee),
    0
  );

  const repPoints = margin != null ? calculatePoints(margin) : 0;
  const tcPoints = deal.transactionCoordinatorId ? calculateTcPoints() : 0;
  const potentialPointsEarned =
    repPoints * (deal.dispoRepId ? 2 : 1) + tcPoints;

  const actualPointsEarned = deal.pointEvents.reduce((sum, pe) => sum + Number(pe.points), 0);

  return {
    id: deal.id,
    propertyAddress: deal.propertyAddress,
    sellerName: deal.sellerName,
    buyerName: deal.buyerName,
    acquisitionsRepId: deal.acquisitionsRepId,
    dispoRepId: deal.dispoRepId,
    transactionCoordinatorId: deal.transactionCoordinatorId,
    contractDate: dateOnly(deal.contractDate) ?? "",
    assignedDate: dateOnly(deal.assignedDate),
    closedFundedDate: dateOnly(deal.closedFundedDate),
    contractPrice: n(deal.contractPrice),
    assignmentPrice: num(deal.assignmentPrice),
    assignmentFee: margin,
    margin,
    buyerEmdAmount: num(deal.buyerEmdAmount),
    buyerEmdReceived: deal.buyerEmdReceived,
    potentialPointsEarned,
    actualPointsEarned,
    titleCompany: deal.titleCompany,
    inspectionEndDate: dateOnly(deal.inspectionEndDate),
    status: DEAL_STATUS_TO_UI[deal.status] as UiDealStatus,
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
    acquisitionsRepName: deal.acquisitionsRep.name,
    dispoRepName: deal.dispoRep?.name ?? null,
    tcName: deal.transactionCoordinator?.name ?? null,
  };
}

export type DealNoteDto = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
};

export type DealStatusHistoryDto = {
  id: string;
  fromStatus: UiDealStatus | null;
  toStatus: UiDealStatus;
  changedAt: string;
  changedById: string;
  changedByName: string;
  note: string | null;
};

export type DealDrawDto = {
  id: string;
  repId: string;
  repName: string;
  amount: number;
  status: import("@/types").DrawStatus;
  dateIssued: string | null;
  remainingBalance: number;
  amountRecouped: number;
};

export type DealPointEventDto = {
  id: string;
  userId: string;
  userName: string;
  points: number;
  reason: string;
  createdAt: string;
  isManualAdjustment: boolean;
};

export type DealDetailDto = DealListRow & {
  /** Raw `assignmentFee` from DB (same as displayed fee when set). */
  storedAssignmentFee: number | null;
  notes: DealNoteDto[];
  statusHistory: DealStatusHistoryDto[];
  draws: DealDrawDto[];
  pointEvents: DealPointEventDto[];
};

function mapDetail(
  deal: Prisma.DealGetPayload<{ include: typeof dealDetailInclude }>
): DealDetailDto {
  const base = mapDealListRow(deal);
  return {
    ...base,
    storedAssignmentFee: num(deal.assignmentFee),
    notes: deal.notes.map((note) => ({
      id: note.id,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
      authorId: note.authorUserId,
      authorName: note.author.name,
    })),
    statusHistory: deal.statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus ? (DEAL_STATUS_TO_UI[h.fromStatus] as UiDealStatus) : null,
      toStatus: DEAL_STATUS_TO_UI[h.toStatus] as UiDealStatus,
      changedAt: h.changedAt.toISOString(),
      changedById: h.changedByUserId,
      changedByName: h.changedBy.name,
      note: h.note,
    })),
    draws: deal.draws.map((d) => ({
      id: d.id,
      repId: d.repId,
      repName: d.rep.name,
      amount: n(d.amount),
      status: DRAW_STATUS_TO_UI[d.status] as import("@/types").DrawStatus,
      dateIssued: dateOnly(d.dateIssued),
      remainingBalance: n(d.remainingBalance),
      amountRecouped: n(d.amountRecouped),
    })),
    pointEvents: deal.pointEvents.map((pe) => ({
      id: pe.id,
      userId: pe.userId,
      userName: pe.user.name,
      points: n(pe.points),
      reason: pe.reason,
      createdAt: pe.createdAt.toISOString().slice(0, 10),
      isManualAdjustment: pe.kind === "MANUAL_ADJUSTMENT",
    })),
  };
}

function listOrderBy(q: ListDealsQuery): Prisma.DealOrderByWithRelationInput {
  const dir = q.sortOrder;
  switch (q.sortBy) {
    case "propertyAddress":
      return { propertyAddress: dir };
    case "contractDate":
      return { contractDate: dir };
    case "status":
      return { status: dir };
    case "contractPrice":
      return { contractPrice: dir };
    case "updatedAt":
    default:
      return { updatedAt: dir };
  }
}

export async function listDashboardRecentDeals(
  prisma: PrismaClient,
  actor: DealActor,
  limit: number
): Promise<DashboardRecentDealRow[]> {
  const deals = await prisma.deal.findMany({
    where: dealWhereForScope(actor),
    select: {
      id: true,
      propertyAddress: true,
      contractPrice: true,
      assignmentPrice: true,
      assignmentFee: true,
      status: true,
      acquisitionsRep: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return deals.map((deal) => {
    const margin = resolvedAssignmentFeeOrCompute(
      n(deal.contractPrice),
      num(deal.assignmentPrice),
      num(deal.assignmentFee),
      0
    );
    return {
      id: deal.id,
      propertyAddress: deal.propertyAddress,
      acquisitionsRepName: deal.acquisitionsRep.name,
      status: DEAL_STATUS_TO_UI[deal.status] as UiDealStatus,
      assignmentFee: margin,
    };
  });
}

export async function listDeals(
  prisma: PrismaClient,
  actor: DealActor,
  query: ListDealsQuery
): Promise<DealListRow[]> {
  const scope = dealWhereForScope(actor);
  const search = query.search?.trim();

  const where: Prisma.DealWhereInput = {
    AND: [
      scope,
      query.status !== "all" ? { status: DEAL_STATUS_FROM_UI[query.status] } : {},
      search
        ? {
            OR: [
              { propertyAddress: { contains: search, mode: "insensitive" } },
              { sellerName: { contains: search, mode: "insensitive" } },
              { buyerName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const deals = await prisma.deal.findMany({
    where,
    include: dealListInclude,
    orderBy: listOrderBy(query),
    ...(query.limit != null ? { take: query.limit } : {}),
  });

  return deals.map(mapDealListRow);
}

export async function getDealById(
  prisma: PrismaClient,
  actor: DealActor,
  id: string
): Promise<DealDetailDto | null> {
  const deal = await prisma.deal.findFirst({
    where: { AND: [{ id }, dealWhereForScope(actor)] },
    include: dealDetailInclude,
  });
  if (!deal) return null;
  return mapDetail(deal);
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  return new Date(`${s}T12:00:00.000Z`);
}

export async function createDeal(
  prisma: PrismaClient,
  actor: DealActor,
  input: CreateDealInput
): Promise<DealDetailDto> {
  const prismaStatus = DEAL_STATUS_FROM_UI[input.status ?? "lead"];

  const assignments = await resolveValidatedDealAssignments(
    prisma,
    actor,
    input.acquisitionsRepId,
    input.dispoRepId ?? null,
    input.transactionCoordinatorId ?? null
  );

  const deal = await prisma.$transaction(async (tx) => {
    const created = await tx.deal.create({
      data: {
        propertyAddress: input.propertyAddress.trim(),
        sellerName: input.sellerName.trim(),
        buyerName: input.buyerName?.trim() || null,
        acquisitionsRepId: assignments.acqId,
        dispoRepId: assignments.dispoId,
        transactionCoordinatorId: assignments.tcId,
        contractDate: parseDate(input.contractDate)!,
        assignedDate: parseDate(input.assignedDate ?? null),
        closedFundedDate: parseDate(input.closedFundedDate ?? null),
        inspectionEndDate: parseDate(input.inspectionEndDate ?? null),
        contractPrice: new Decimal(input.contractPrice),
        assignmentPrice: input.assignmentPrice != null ? new Decimal(input.assignmentPrice) : null,
        assignmentFee: input.assignmentFee != null ? new Decimal(input.assignmentFee) : null,
        buyerEmdAmount: input.buyerEmdAmount != null ? new Decimal(input.buyerEmdAmount) : null,
        buyerEmdReceived: input.buyerEmdReceived,
        titleCompany: input.titleCompany.trim(),
        status: prismaStatus,
      },
    });

    await tx.dealStatusHistory.create({
      data: {
        dealId: created.id,
        fromStatus: null,
        toStatus: prismaStatus,
        changedByUserId: actor.id,
        note: "Deal created",
      },
    });

    await writeAuditLog(tx, {
      actorUserId: actor.id,
      action: "deal.create",
      entityType: "deal",
      entityId: created.id,
      metadata: {
        status: created.status,
      },
    });

    await writeAuditLog(tx, {
      actorUserId: actor.id,
      action: "deal.status_change",
      entityType: "deal",
      entityId: created.id,
      metadata: {
        fromStatus: null,
        toStatus: prismaStatus,
        note: "Deal created",
      },
    });

    // Create funded-deal points immediately if the deal starts in CLOSED_FUNDED.
    if (prismaStatus === "CLOSED_FUNDED") {
      const syncStart = new Date();
      await syncPointsForDealFundingTransition(tx, actor, created.id, prismaStatus);

      const createdPointEvents = await tx.pointEvent.groupBy({
        by: ["kind"],
        where: {
          dealId: created.id,
          createdAt: { gte: syncStart },
        },
        _count: { _all: true },
      });

      await writeAuditLog(tx, {
        actorUserId: actor.id,
        action: "points.generate",
        entityType: "deal",
        entityId: created.id,
        metadata: {
          transition: { fromStatus: null, toStatus: prismaStatus },
          pointEventKinds: createdPointEvents.map((g) => ({ kind: g.kind, count: g._count._all })),
        },
      });
    }

    if (input.initialNote?.trim()) {
      await tx.dealNote.create({
        data: {
          dealId: created.id,
          authorUserId: actor.id,
          body: input.initialNote.trim(),
        },
      });

      await writeAuditLog(tx, {
        actorUserId: actor.id,
        action: "deal.note.add",
        entityType: "deal",
        entityId: created.id,
        metadata: { note: input.initialNote.trim() },
      });
    }

    return created.id;
  });

  const full = await getDealById(prisma, actor, deal);
  if (!full) throw new Error("Failed to load created deal");
  return full;
}

export async function updateDeal(
  prisma: PrismaClient,
  actor: DealActor,
  id: string,
  input: UpdateDealInput
): Promise<DealDetailDto | null> {
  const existing = await prisma.deal.findFirst({
    where: { AND: [{ id }, dealWhereForScope(actor)] },
    select: {
      id: true,
      status: true,
      contractPrice: true,
      assignmentPrice: true,
      assignmentFee: true,
      acquisitionsRepId: true,
      dispoRepId: true,
      transactionCoordinatorId: true,
    },
  });
  if (!existing) return null;

  const mergedAcq = input.acquisitionsRepId ?? existing.acquisitionsRepId;
  const mergedDispo =
    input.dispoRepId !== undefined ? input.dispoRepId : existing.dispoRepId;
  const mergedTc =
    input.transactionCoordinatorId !== undefined
      ? input.transactionCoordinatorId
      : existing.transactionCoordinatorId;

  const assignments = await resolveValidatedDealAssignments(
    prisma,
    actor,
    mergedAcq,
    mergedDispo,
    mergedTc
  );

  const data: Prisma.DealUpdateInput = {};

  if (input.propertyAddress !== undefined) data.propertyAddress = input.propertyAddress.trim();
  if (input.sellerName !== undefined) data.sellerName = input.sellerName.trim();
  if (input.buyerName !== undefined) data.buyerName = input.buyerName?.trim() || null;
  if (input.acquisitionsRepId !== undefined) {
    data.acquisitionsRep = { connect: { id: assignments.acqId } };
  }
  if (input.dispoRepId !== undefined) {
    data.dispoRep = assignments.dispoId ? { connect: { id: assignments.dispoId } } : { disconnect: true };
  }
  if (input.transactionCoordinatorId !== undefined) {
    data.transactionCoordinator = assignments.tcId
      ? { connect: { id: assignments.tcId } }
      : { disconnect: true };
  }
  if (input.contractDate !== undefined) data.contractDate = parseDate(input.contractDate)!;
  if (input.assignedDate !== undefined) data.assignedDate = parseDate(input.assignedDate ?? null);
  if (input.closedFundedDate !== undefined) data.closedFundedDate = parseDate(input.closedFundedDate ?? null);
  if (input.inspectionEndDate !== undefined) data.inspectionEndDate = parseDate(input.inspectionEndDate ?? null);
  if (input.contractPrice !== undefined) data.contractPrice = new Decimal(input.contractPrice);
  if (input.assignmentPrice !== undefined) {
    data.assignmentPrice = input.assignmentPrice != null ? new Decimal(input.assignmentPrice) : null;
  }
  if (input.buyerEmdAmount !== undefined) {
    data.buyerEmdAmount = input.buyerEmdAmount != null ? new Decimal(input.buyerEmdAmount) : null;
  }
  if (input.buyerEmdReceived !== undefined) data.buyerEmdReceived = input.buyerEmdReceived;
  if (input.titleCompany !== undefined) data.titleCompany = input.titleCompany.trim();

  const touchesFinancials =
    input.contractPrice !== undefined ||
    input.assignmentPrice !== undefined ||
    input.additionalExpense !== undefined ||
    input.assignmentFee !== undefined;

  if (touchesFinancials) {
    const nextContract =
      input.contractPrice !== undefined ? input.contractPrice : n(existing.contractPrice);
    const nextAp =
      input.assignmentPrice !== undefined ? input.assignmentPrice : num(existing.assignmentPrice);
    // Optional UI field: only deduct when the client sends a value (including null → 0).
    // If the key is omitted (e.g. partial PATCH), treat as no additional expense — do not
    // infer expense from the stored fee (that incorrectly reduced the spread).
    const expenseForFormula =
      input.additionalExpense !== undefined ? (input.additionalExpense ?? 0) : 0;

    if (nextAp == null) {
      data.assignmentFee = null;
    } else {
      const fee = computeAssignmentFee(nextContract, nextAp, expenseForFormula);
      data.assignmentFee = fee != null ? new Decimal(fee) : null;
    }
  }

  if (Object.keys(data).length === 0) {
    return getDealById(prisma, actor, id);
  }

  await prisma.$transaction(async (tx) => {
    await tx.deal.update({ where: { id }, data });
    await writeAuditLog(tx, {
      actorUserId: actor.id,
      action: "deal.update",
      entityType: "deal",
      entityId: id,
      metadata: {
        before: { status: existing.status },
        patch: input,
      },
    });
  });
  return getDealById(prisma, actor, id);
}

export async function updateDealStatus(
  prisma: PrismaClient,
  actor: DealActor,
  id: string,
  input: UpdateDealStatusInput
): Promise<DealDetailDto | null> {
  const existing = await prisma.deal.findFirst({
    where: { AND: [{ id }, dealWhereForScope(actor)] },
    select: { id: true, status: true },
  });
  if (!existing) return null;

  const next = DEAL_STATUS_FROM_UI[input.status];
  if (existing.status === next) {
    return getDealById(prisma, actor, id);
  }

  await prisma.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id },
      data: { status: next },
    });
    await tx.dealStatusHistory.create({
      data: {
        dealId: id,
        fromStatus: existing.status,
        toStatus: next,
        changedByUserId: actor.id,
        note: input.note?.trim() || null,
      },
    });

    await writeAuditLog(tx, {
      actorUserId: actor.id,
      action: "deal.status_change",
      entityType: "deal",
      entityId: id,
      metadata: {
        fromStatus: existing.status,
        toStatus: next,
        note: input.note?.trim() || null,
      },
    });

    // Award/reverse profit sharing points whenever a deal enters or leaves CLOSED_FUNDED.
    const syncStart = new Date();
    await syncPointsForDealFundingTransition(tx, actor, id, next);

    const createdPointEvents = await tx.pointEvent.groupBy({
      by: ["kind"],
      where: {
        dealId: id,
        createdAt: { gte: syncStart },
      },
      _count: { _all: true },
    });

    await writeAuditLog(tx, {
      actorUserId: actor.id,
      action: "points.generate",
      entityType: "deal",
      entityId: id,
      metadata: {
        transition: { fromStatus: existing.status, toStatus: next },
        pointEventKinds: createdPointEvents.map((g) => ({ kind: g.kind, count: g._count._all })),
      },
    });
  });

  return getDealById(prisma, actor, id);
}

export async function addDealNote(
  prisma: PrismaClient,
  actor: DealActor,
  dealId: string,
  body: string
): Promise<DealDetailDto | null> {
  const existing = await prisma.deal.findFirst({
    where: { AND: [{ id: dealId }, dealWhereForScope(actor)] },
    select: { id: true },
  });
  if (!existing) return null;

  await prisma.dealNote.create({
    data: {
      dealId,
      authorUserId: actor.id,
      body: body.trim(),
    },
  });

  await writeAuditLog(prisma, {
    actorUserId: actor.id,
    action: "deal.note.add",
    entityType: "deal",
    entityId: dealId,
    metadata: { note: body.trim() },
  });

  return getDealById(prisma, actor, dealId);
}

export type DealMetricsDto = {
  totalDeals: number;
  activeCount: number;
  fundedCount: number;
  canceledCount: number;
  totalRevenue: number;
  avgFee: number;
  pipelineByStatus: { name: string; count: number }[];
};

export async function getDealMetrics(prisma: PrismaClient, actor: DealActor): Promise<DealMetricsDto> {
  const whereScope = dealWhereForScope(actor);

  const [grouped, fundedDeals] = await Promise.all([
    prisma.deal.groupBy({
      by: ["status"],
      where: whereScope,
      _count: { _all: true },
    }),
    prisma.deal.findMany({
      where: { ...whereScope, status: "CLOSED_FUNDED" },
      select: { assignmentFee: true, contractPrice: true, assignmentPrice: true },
    }),
  ]);

  const countByStatus = new Map(grouped.map((g) => [g.status, g._count._all]));
  const totalDeals = grouped.reduce((s, g) => s + g._count._all, 0);
  const fundedCount = countByStatus.get("CLOSED_FUNDED") ?? 0;
  const canceledCount = countByStatus.get("CANCELED") ?? 0;
  const activeCount = totalDeals - fundedCount - canceledCount;

  let totalRevenue = 0;
  for (const d of fundedDeals) {
    const fee = resolvedAssignmentFeeOrCompute(
      n(d.contractPrice),
      num(d.assignmentPrice),
      num(d.assignmentFee),
      0
    );
    totalRevenue += fee ?? 0;
  }

  const uiLabel: Record<string, string> = {
    LEAD: "Lead",
    UNDER_CONTRACT: "Contract",
    MARKETED: "Marketed",
    BUYER_COMMITTED: "Committed",
    EMD_RECEIVED: "EMD In",
    ASSIGNED: "Assigned",
    CLOSED_FUNDED: "Funded",
    CANCELED: "Canceled",
  };

  const pipelineOrder = [
    "LEAD",
    "UNDER_CONTRACT",
    "MARKETED",
    "BUYER_COMMITTED",
    "EMD_RECEIVED",
    "ASSIGNED",
    "CLOSED_FUNDED",
  ] as const;

  const pipelineByStatus = pipelineOrder.map((st) => ({
    name: uiLabel[st],
    count: countByStatus.get(st) ?? 0,
  }));

  return {
    totalDeals,
    activeCount,
    fundedCount,
    canceledCount,
    totalRevenue,
    avgFee: fundedDeals.length ? Math.round(totalRevenue / fundedDeals.length) : 0,
    pipelineByStatus,
  };
}

export type AssignmentUserDto = {
  id: string;
  name: string;
  roleCode: string;
  teamCode: string;
};

type DealFormUsersActor = {
  id: string;
  roleCode: UserRoleCode;
  teamCode?: TeamCode;
};

export async function listUsersForDealAssignment(
  prisma: PrismaClient,
  actor: DealFormUsersActor
): Promise<AssignmentUserDto[]> {
  const select = {
    id: true,
    name: true,
    role: { select: { code: true } },
    team: { select: { code: true } },
  } as const;

  let where: Prisma.UserWhereInput;

  if (actor.roleCode === "ADMIN") {
    where = { active: true };
  } else if (actor.roleCode === "REP") {
    const teamCode = actor.teamCode ?? (await loadActorTeamCode(prisma, { id: actor.id, roleCode: actor.roleCode, teamCode: actor.teamCode }));
    const peerTeam: TeamCode | null = teamCode === "DISPOSITIONS" ? "ACQUISITIONS" : teamCode === "ACQUISITIONS" ? "DISPOSITIONS" : null;
    where = {
      active: true,
      OR: [
        { id: actor.id },
        ...(peerTeam ? [{ team: { code: peerTeam } }] : []),
        { role: { code: "TRANSACTION_COORDINATOR" } },
      ],
    };
  } else {
    where = {
      active: true,
      OR: [
        { team: { code: "ACQUISITIONS" } },
        { team: { code: "DISPOSITIONS" } },
        { role: { code: "TRANSACTION_COORDINATOR" } },
      ],
    };
  }

  const users = await prisma.user.findMany({
    where,
    select,
    orderBy: { name: "asc" },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    roleCode: u.role.code,
    teamCode: u.team.code,
  }));
}
