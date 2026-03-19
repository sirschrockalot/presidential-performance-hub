import type { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import { DEAL_STATUS_FROM_UI, DEAL_STATUS_TO_UI, DRAW_STATUS_TO_UI } from "@/domain/prisma-enums";
import type { DealStatus as UiDealStatus } from "@/types";
import type { CreateDealInput, ListDealsQuery, UpdateDealInput, UpdateDealStatusInput } from "@/features/deals/schemas/deal.schemas";
import { dealWhereForScope, type DealActor } from "@/features/deals/server/deal-scope";
import { syncPointsForDealFundingTransition } from "@/features/points/server/points.engine";

const dealListInclude = {
  acquisitionsRep: { select: { id: true, name: true } },
  dispoRep: { select: { id: true, name: true } },
  transactionCoordinator: { select: { id: true, name: true } },
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
  buyerEmdAmount: number | null;
  buyerEmdReceived: boolean;
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
    assignmentFee: num(deal.assignmentFee),
    buyerEmdAmount: num(deal.buyerEmdAmount),
    buyerEmdReceived: deal.buyerEmdReceived,
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

  const deal = await prisma.$transaction(async (tx) => {
    const created = await tx.deal.create({
      data: {
        propertyAddress: input.propertyAddress.trim(),
        sellerName: input.sellerName.trim(),
        buyerName: input.buyerName?.trim() || null,
        acquisitionsRepId: input.acquisitionsRepId,
        dispoRepId: input.dispoRepId || null,
        transactionCoordinatorId: input.transactionCoordinatorId || null,
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

    if (input.initialNote?.trim()) {
      await tx.dealNote.create({
        data: {
          dealId: created.id,
          authorUserId: actor.id,
          body: input.initialNote.trim(),
        },
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
    select: { id: true },
  });
  if (!existing) return null;

  const data: Prisma.DealUpdateInput = {};

  if (input.propertyAddress !== undefined) data.propertyAddress = input.propertyAddress.trim();
  if (input.sellerName !== undefined) data.sellerName = input.sellerName.trim();
  if (input.buyerName !== undefined) data.buyerName = input.buyerName?.trim() || null;
  if (input.acquisitionsRepId !== undefined) data.acquisitionsRep = { connect: { id: input.acquisitionsRepId } };
  if (input.dispoRepId !== undefined) {
    data.dispoRep = input.dispoRepId ? { connect: { id: input.dispoRepId } } : { disconnect: true };
  }
  if (input.transactionCoordinatorId !== undefined) {
    data.transactionCoordinator = input.transactionCoordinatorId
      ? { connect: { id: input.transactionCoordinatorId } }
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
  if (input.assignmentFee !== undefined) {
    data.assignmentFee = input.assignmentFee != null ? new Decimal(input.assignmentFee) : null;
  }
  if (input.buyerEmdAmount !== undefined) {
    data.buyerEmdAmount = input.buyerEmdAmount != null ? new Decimal(input.buyerEmdAmount) : null;
  }
  if (input.buyerEmdReceived !== undefined) data.buyerEmdReceived = input.buyerEmdReceived;
  if (input.titleCompany !== undefined) data.titleCompany = input.titleCompany.trim();

  if (Object.keys(data).length === 0) {
    return getDealById(prisma, actor, id);
  }

  await prisma.deal.update({ where: { id }, data });
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

    // Award/reverse profit sharing points whenever a deal enters or leaves CLOSED_FUNDED.
    await syncPointsForDealFundingTransition(tx, actor, id, next);
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
  const deals = await prisma.deal.findMany({
    where: dealWhereForScope(actor),
    select: { status: true, assignmentFee: true },
  });

  const funded = deals.filter((d) => d.status === "CLOSED_FUNDED");
  const active = deals.filter((d) => !["CLOSED_FUNDED", "CANCELED"].includes(d.status));
  const totalRevenue = funded.reduce((s, d) => s + (d.assignmentFee ? n(d.assignmentFee) : 0), 0);

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
    count: deals.filter((d) => d.status === st).length,
  }));

  return {
    totalDeals: deals.length,
    activeCount: active.length,
    fundedCount: funded.length,
    canceledCount: deals.filter((d) => d.status === "CANCELED").length,
    totalRevenue,
    avgFee: funded.length ? Math.round(totalRevenue / funded.length) : 0,
    pipelineByStatus,
  };
}

export type AssignmentUserDto = {
  id: string;
  name: string;
  email: string;
  roleCode: string;
  teamCode: string;
};

export async function listUsersForDealAssignment(prisma: PrismaClient): Promise<AssignmentUserDto[]> {
  const users = await prisma.user.findMany({
    where: { active: true },
    include: { role: true, team: true },
    orderBy: { name: "asc" },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    roleCode: u.role.code,
    teamCode: u.team.code,
  }));
}
