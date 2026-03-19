import type { PrismaClient, Prisma, TeamCode, UserRoleCode } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import type { DrawStatus, DealStatus, Team } from "@/types";
import { DRAW_STATUS_TO_UI, DEAL_STATUS_TO_UI } from "@/domain/prisma-enums";
import { checkDrawEligibilityFromDeal } from "@/features/deals/lib/draw-eligibility";

import type { DrawActor } from "@/features/draws/server/draw-scope";
import { drawWhereForScope } from "@/features/draws/server/draw-scope";
import { writeAuditLog } from "@/lib/audit/audit-log";

import { clampRemainingBalance, validateRecoupmentDelta } from "@/features/draws/utils/remaining-balance";

export type DrawStatusDisplay = "pending" | "approved" | "paid" | "partially_recouped" | "recouped" | "denied";

export type DrawWithDetailsDto = {
  id: string;
  repId: string;
  repName: string;
  dealId: string;
  dealAddress: string;
  amount: number;
  dateIssued: string | null;
  status: DrawStatus;
  statusDisplay: DrawStatusDisplay;
  approvedByName: string | null;
  notes: string;
  amountRecouped: number;
  remainingBalance: number;
  eligible: boolean;
};

export type DrawDetailDto = DrawWithDetailsDto;

export type DrawRequestDealOptionDto = {
  id: string;
  propertyAddress: string;
  status: import("@/types").DealStatus;
  buyerEmdReceived: boolean;
  eligible: boolean;
  reason?: string;
};

export type DrawRequestRepOptionDto = {
  id: string;
  name: string;
  team: Team;
};

function dateOnlyToIsoDate(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

function decToNumber(d: Decimal): number {
  return Number(d);
}

/** Users in these roles on Acq/Dispo teams can be chosen as the draw recipient in forms. */
const DRAW_FORM_REP_ROLES: UserRoleCode[] = ["REP", "ACQUISITIONS_MANAGER", "DISPOSITIONS_MANAGER"];

function uiTeamFromUserTeam(code: TeamCode): Team {
  if (code === "ACQUISITIONS") return "acquisitions";
  if (code === "DISPOSITIONS") return "dispositions";
  return "operations";
}

function getStatusDisplay(p: { status: DrawStatus; amountRecouped: number; remainingBalance: number }): DrawStatusDisplay {
  if (p.status === "recouped") return "recouped";
  if (p.status === "denied") return "denied";
  if (p.status === "approved") return "approved";
  if (p.status === "pending") return "pending";
  // Prisma PAID can represent either paid (no recoupment yet) or partial recoupment
  if (p.status === "paid") {
    if (p.amountRecouped > 0 && p.remainingBalance > 0) return "partially_recouped";
    return "paid";
  }
  return p.status;
}

const drawWithRelationsInclude = {
  rep: { select: { id: true, name: true, team: { select: { code: true } } } },
  deal: { select: { id: true, propertyAddress: true } },
  approvedBy: { select: { id: true, name: true } },
} as const;

type DrawWithRelations = Prisma.DrawGetPayload<{
  include: typeof drawWithRelationsInclude;
}>;

function mapDrawToDto(draw: DrawWithRelations): DrawWithDetailsDto {
  const amount = decToNumber(draw.amount);
  const amountRecouped = decToNumber(draw.amountRecouped);
  const remainingBalance = decToNumber(draw.remainingBalance);
  const status = DRAW_STATUS_TO_UI[draw.status] as DrawStatus;
  const statusDisplay = getStatusDisplay({ status, amountRecouped, remainingBalance });

  return {
    id: draw.id,
    repId: draw.repId,
    repName: draw.rep.name,
    dealId: draw.dealId,
    dealAddress: draw.deal.propertyAddress,
    amount,
    dateIssued: dateOnlyToIsoDate(draw.dateIssued),
    status,
    statusDisplay,
    approvedByName: draw.approvedBy?.name ?? null,
    notes: draw.notes ?? "",
    amountRecouped,
    remainingBalance,
    eligible: draw.eligible,
  };
}

export async function listDraws(
  prisma: PrismaClient,
  actor: DrawActor,
  statusFilter?: DrawStatus | "all" | "partially_recouped"
): Promise<DrawWithDetailsDto[]> {
  const where = drawWhereForScope(actor);

  const draws = await prisma.draw.findMany({
    where,
    include: drawWithRelationsInclude,
    orderBy: { createdAt: "desc" },
  });

  const mapped = draws.map(mapDrawToDto);

  if (!statusFilter || statusFilter === "all") return mapped;
  if (statusFilter === "partially_recouped") {
    return mapped.filter((d) => d.statusDisplay === "partially_recouped");
  }
  return mapped.filter((d) => d.status === statusFilter);
}

export async function getDrawById(
  prisma: PrismaClient,
  actor: DrawActor,
  id: string
): Promise<DrawDetailDto | null> {
  const draw = await prisma.draw.findFirst({
    where: { AND: [{ id }, drawWhereForScope(actor)] },
    include: drawWithRelationsInclude,
  });
  if (!draw) return null;
  return mapDrawToDto(draw);
}

export async function getDrawMetrics(prisma: PrismaClient, actor: DrawActor) {
  const draws = await listDraws(prisma, actor, "all");
  const outstanding = draws
    .filter((d) => d.status === "approved" || d.status === "paid")
    .reduce((s, d) => s + d.remainingBalance, 0);
  return {
    outstanding,
    pendingCount: draws.filter((d) => d.status === "pending").length,
    totalRecouped: draws.reduce((s, d) => s + d.amountRecouped, 0),
    ineligibleCount: draws.filter((d) => !d.eligible).length,
  };
}

export type CreateDrawInput = {
  dealId: string;
  repId: string;
  amount: number;
  notes?: string | null;
};

export async function createDrawRequest(
  prisma: PrismaClient,
  actor: DrawActor,
  input: CreateDrawInput
): Promise<DrawDetailDto> {
  // Validate rep exists (any active user; assignment enforced against the deal below)
  const rep = await prisma.user.findFirst({
    where: { id: input.repId, active: true },
    select: { id: true, team: { select: { code: true } } },
  });
  if (!rep) throw new Error("Rep not found");

  // RBAC: only allow the actor to request draws for reps they are allowed to act on.
  if (actor.roleCode === "REP" && rep.id !== actor.id) throw new Error("Forbidden");
  if (actor.roleCode === "ACQUISITIONS_MANAGER" && rep.team.code !== "ACQUISITIONS") throw new Error("Forbidden");
  if (actor.roleCode === "DISPOSITIONS_MANAGER" && rep.team.code !== "DISPOSITIONS") throw new Error("Forbidden");

  const deal = await prisma.deal.findFirst({
    where: { id: input.dealId },
    select: {
      id: true,
      propertyAddress: true,
      status: true,
      buyerEmdReceived: true,
      acquisitionsRepId: true,
      dispoRepId: true,
    },
  });
  if (!deal) throw new Error("Deal not found");

  // Enforce rep assignment on the deal (Acq/Dispo side, or either side for Ops / other teams)
  if (rep.team.code === "ACQUISITIONS") {
    if (deal.acquisitionsRepId !== rep.id) throw new Error("Rep is not assigned to deal");
  } else if (rep.team.code === "DISPOSITIONS") {
    if (deal.dispoRepId !== rep.id) throw new Error("Rep is not assigned to deal");
  } else {
    if (deal.acquisitionsRepId !== rep.id && deal.dispoRepId !== rep.id) {
      throw new Error("Rep is not assigned to deal");
    }
  }

  // Business rule eligibility (server enforced)
  const eligibility = checkDrawEligibilityFromDeal({
    status: DEAL_STATUS_TO_UI[deal.status] as DealStatus,
    buyerEmdReceived: deal.buyerEmdReceived,
  });
  if (!eligibility.eligible) throw new Error(eligibility.reason ?? "Deal is not eligible for draw");

  const created = await prisma.draw.create({
    data: {
      dealId: input.dealId,
      repId: input.repId,
      amount: new Decimal(input.amount),
      status: "PENDING",
      eligible: true,
      dateIssued: null,
      approvedByUserId: null,
      notes: input.notes?.trim() ?? "",
      amountRecouped: new Decimal(0),
      remainingBalance: new Decimal(input.amount),
    },
    include: drawWithRelationsInclude,
  });

  await writeAuditLog(prisma, {
    actorUserId: actor.id,
    action: "draw.create",
    entityType: "draw",
    entityId: created.id,
    metadata: {
      dealId: created.dealId,
      repId: created.repId,
      amount: decToNumber(created.amount),
      status: created.status,
      eligible: created.eligible,
    },
  });

  return mapDrawToDto(created);
}

export type UpdateDrawStatusInput = {
  status: "approved" | "paid" | "recouped" | "denied";
  note?: string | null;
  amountRecoupedDelta?: number;
};

export async function updateDrawStatus(
  prisma: PrismaClient,
  actor: DrawActor,
  drawId: string,
  input: UpdateDrawStatusInput
): Promise<DrawDetailDto | null> {
  const draw = await prisma.draw.findFirst({
    where: { AND: [{ id: drawId }, drawWhereForScope(actor)] },
    include: {
      deal: { select: { id: true, status: true, buyerEmdReceived: true, acquisitionsRepId: true, dispoRepId: true } },
      rep: { select: { id: true, team: { select: { code: true } } } },
      approvedBy: { select: { id: true, name: true } },
    },
  });
  if (!draw) return null;

  const fromStatus = draw.status;

  // Admin-only control over draw overrides (approval/paid/recoup/deny).
  if (actor.roleCode !== "ADMIN") {
    throw new Error("Forbidden");
  }

  if (input.status === "approved") {
    if (draw.status !== "PENDING") {
      throw new Error(`Cannot approve a draw in status "${draw.status}"`);
    }
    // Re-check business eligibility at approval time
    const repTeamUi = (draw.rep.team.code === "ACQUISITIONS" ? "acquisitions" : "dispositions") as Team;
    const assignedOk =
      repTeamUi === "acquisitions"
        ? draw.deal.acquisitionsRepId === draw.rep.id
        : draw.deal.dispoRepId === draw.rep.id;
    if (!assignedOk) {
      await prisma.draw.update({
        where: { id: draw.id },
        data: {
          status: "DENIED",
          eligible: false,
          approvedByUserId: actor.id,
          notes: input.note?.trim() ?? draw.notes,
        },
      });
      await writeAuditLog(prisma, {
        actorUserId: actor.id,
        action: "draw.status_change",
        entityType: "draw",
        entityId: draw.id,
        metadata: {
          fromStatus,
          toStatus: "DENIED",
          approvedRequested: true,
          eligible: false,
          reason: "rep_not_assigned_to_deal",
          note: input.note?.trim() ?? null,
        },
      });
      return getDrawById(prisma, actor, draw.id);
    }

    const eligibility = checkDrawEligibilityFromDeal({
      status: DEAL_STATUS_TO_UI[draw.deal.status] as DealStatus,
      buyerEmdReceived: draw.deal.buyerEmdReceived,
    });

    if (!eligibility.eligible) {
      await prisma.draw.update({
        where: { id: draw.id },
        data: {
          status: "DENIED",
          eligible: false,
          approvedByUserId: actor.id,
          notes: (input.note?.trim() ?? draw.notes) || eligibility.reason || "",
        },
      });
      await writeAuditLog(prisma, {
        actorUserId: actor.id,
        action: "draw.status_change",
        entityType: "draw",
        entityId: draw.id,
        metadata: {
          fromStatus,
          toStatus: "DENIED",
          approvedRequested: true,
          eligible: false,
          reason: "eligibility_failed",
          note: input.note?.trim() ?? null,
          eligibilityReason: eligibility.reason ?? null,
        },
      });
      return getDrawById(prisma, actor, draw.id);
    }

    const today = new Date();
    await prisma.draw.update({
      where: { id: draw.id },
      data: {
        status: "APPROVED",
        eligible: true,
        dateIssued: today,
        approvedByUserId: actor.id,
        notes: input.note?.trim() ?? draw.notes,
      },
    });
    await writeAuditLog(prisma, {
      actorUserId: actor.id,
      action: "draw.status_change",
      entityType: "draw",
      entityId: draw.id,
      metadata: {
        fromStatus,
        toStatus: "APPROVED",
        approvedRequested: true,
        eligible: true,
        note: input.note?.trim() ?? null,
      },
    });
    return getDrawById(prisma, actor, draw.id);
  }

  // Deny is allowed for pending requests
  if (input.status === "denied") {
    if (draw.status !== "PENDING") {
      throw new Error(`Cannot deny a draw in status "${draw.status}"`);
    }
    await prisma.draw.update({
      where: { id: draw.id },
      data: {
        status: "DENIED",
        eligible: false,
        approvedByUserId: actor.id,
        notes: input.note?.trim() ?? draw.notes,
      },
    });
    await writeAuditLog(prisma, {
      actorUserId: actor.id,
      action: "draw.status_change",
      entityType: "draw",
      entityId: draw.id,
      metadata: {
        fromStatus,
        toStatus: "DENIED",
        requested: "denied",
        eligible: false,
        note: input.note?.trim() ?? null,
      },
    });
    return getDrawById(prisma, actor, draw.id);
  }

  // Recoupment updates
  if (input.status === "paid") {
    if (draw.status !== "APPROVED" && draw.status !== "PAID") {
      throw new Error(`Cannot mark paid a draw in status "${draw.status}"`);
    }
    if (!draw.eligible) {
      throw new Error("Draw is not eligible");
    }
    const delta = input.amountRecoupedDelta ?? 0;
    if (delta <= 0) throw new Error("amountRecoupedDelta must be > 0 for paid");
    const res = validateRecoupmentDelta(delta, decToNumber(draw.amountRecouped), decToNumber(draw.amount));
    if (!res.ok) throw new Error(res.reason);
    const nextRemaining = clampRemainingBalance(decToNumber(draw.amount), res.nextAmountRecouped);
    const nextStatus: "PAID" | "RECOUPED" = nextRemaining === 0 ? "RECOUPED" : "PAID";
    await prisma.draw.update({
      where: { id: draw.id },
      data: {
        status: nextStatus,
        amountRecouped: new Decimal(res.nextAmountRecouped),
        remainingBalance: new Decimal(nextRemaining),
        notes: input.note?.trim() ?? draw.notes,
      },
    });
    await writeAuditLog(prisma, {
      actorUserId: actor.id,
      action: "draw.status_change",
      entityType: "draw",
      entityId: draw.id,
      metadata: {
        fromStatus,
        toStatus: nextStatus,
        requested: "paid",
        eligible: draw.eligible,
        amountRecoupedBefore: decToNumber(draw.amountRecouped),
        amountRecoupedAfter: res.nextAmountRecouped,
        remainingBalanceAfter: nextRemaining,
        note: input.note?.trim() ?? null,
      },
    });
    return getDrawById(prisma, actor, draw.id);
  }

  if (input.status === "recouped") {
    if (draw.status !== "APPROVED" && draw.status !== "PAID") {
      throw new Error(`Cannot mark recouped a draw in status "${draw.status}"`);
    }
    if (!draw.eligible) {
      throw new Error("Draw is not eligible");
    }
    const delta = input.amountRecoupedDelta ?? decToNumber(draw.remainingBalance);
    if (delta <= 0) throw new Error("amountRecoupedDelta must be > 0 for recouped");
    const res = validateRecoupmentDelta(delta, decToNumber(draw.amountRecouped), decToNumber(draw.amount));
    if (!res.ok) throw new Error(res.reason);
    const nextRemaining = clampRemainingBalance(decToNumber(draw.amount), res.nextAmountRecouped);
    if (nextRemaining !== 0) throw new Error("Recouped requires full repayment (remaining balance must be 0)");
    await prisma.draw.update({
      where: { id: draw.id },
      data: {
        status: "RECOUPED",
        amountRecouped: new Decimal(res.nextAmountRecouped),
        remainingBalance: new Decimal(0),
        notes: input.note?.trim() ?? draw.notes,
      },
    });
    await writeAuditLog(prisma, {
      actorUserId: actor.id,
      action: "draw.status_change",
      entityType: "draw",
      entityId: draw.id,
      metadata: {
        fromStatus,
        toStatus: "RECOUPED",
        requested: "recouped",
        eligible: draw.eligible,
        amountRecoupedAfter: res.nextAmountRecouped,
        remainingBalanceAfter: 0,
        note: input.note?.trim() ?? null,
      },
    });
    return getDrawById(prisma, actor, draw.id);
  }

  return getDrawById(prisma, actor, draw.id);
}

export async function listDrawRequestReps(
  prisma: PrismaClient,
  actor: DrawActor,
  team?: Team
): Promise<DrawRequestRepOptionDto[]> {
  if (actor.roleCode === "REP") {
    return [{ id: actor.id, name: "You", team: uiTeamFromUserTeam(actor.teamCode) }];
  }

  let where: Prisma.UserWhereInput;

  if (actor.roleCode === "ADMIN" || actor.roleCode === "TRANSACTION_COORDINATOR") {
    // Include all active users on Acq/Dispo teams, plus the signed-in user (e.g. Ops admin after a data cleanup).
    if (team) {
      const code = team === "acquisitions" ? "ACQUISITIONS" : "DISPOSITIONS";
      where = { active: true, team: { code } };
    } else {
      where = {
        active: true,
        OR: [{ team: { code: { in: ["ACQUISITIONS", "DISPOSITIONS"] } } }, { id: actor.id }],
      };
    }
  } else if (actor.roleCode === "ACQUISITIONS_MANAGER") {
    where = {
      active: true,
      team: { code: "ACQUISITIONS" },
      role: { code: { in: DRAW_FORM_REP_ROLES } },
    };
  } else if (actor.roleCode === "DISPOSITIONS_MANAGER") {
    where = {
      active: true,
      team: { code: "DISPOSITIONS" },
      role: { code: { in: DRAW_FORM_REP_ROLES } },
    };
  } else {
    return [];
  }

  const reps = await prisma.user.findMany({
    where,
    select: { id: true, name: true, team: { select: { code: true } } },
    orderBy: { name: "asc" },
  });

  return reps.map((u) => ({
    id: u.id,
    name: u.name,
    team: uiTeamFromUserTeam(u.team.code),
  }));
}

export async function listDrawRequestDeals(
  prisma: PrismaClient,
  actor: DrawActor,
  repId: string
): Promise<DrawRequestDealOptionDto[]> {
  const rep = await prisma.user.findFirst({
    where: { id: repId, active: true },
    select: { id: true, team: { select: { code: true } } },
  });
  if (!rep) return [];

  // RBAC: restrict managers/reps to their allowed rep team.
  if (actor.roleCode === "REP" && rep.id !== actor.id) return [];
  if (actor.roleCode === "ACQUISITIONS_MANAGER" && rep.team.code !== "ACQUISITIONS") return [];
  if (actor.roleCode === "DISPOSITIONS_MANAGER" && rep.team.code !== "DISPOSITIONS") return [];

  const statusFilter = { in: ["ASSIGNED", "CLOSED_FUNDED"] as const };

  // Only include assigned-or-beyond deals; buyer EMD received determines eligibility.
  const deals = await prisma.deal.findMany({
    where:
      rep.team.code === "ACQUISITIONS"
        ? { status: statusFilter, acquisitionsRepId: repId }
        : rep.team.code === "DISPOSITIONS"
          ? { status: statusFilter, dispoRepId: repId }
          : {
              status: statusFilter,
              OR: [{ acquisitionsRepId: repId }, { dispoRepId: repId }],
            },
    select: { id: true, propertyAddress: true, status: true, buyerEmdReceived: true },
    orderBy: { updatedAt: "desc" },
  });

  return deals.map((d) => {
    const uiStatus = DEAL_STATUS_TO_UI[d.status] as DealStatus;
    const eligibility = checkDrawEligibilityFromDeal({
      status: uiStatus,
      buyerEmdReceived: d.buyerEmdReceived,
    });
    return {
      id: d.id,
      propertyAddress: d.propertyAddress,
      status: uiStatus,
      buyerEmdReceived: d.buyerEmdReceived,
      eligible: eligibility.eligible,
      reason: eligibility.reason,
    };
  });
}

export async function listRepDrawHistory(
  prisma: PrismaClient,
  actor: DrawActor,
  repId: string | null
): Promise<DrawWithDetailsDto[]> {
  const targetRepId = actor.roleCode === "REP" ? actor.id : repId;
  if (!targetRepId) return [];

  const rep = await prisma.user.findFirst({
    where: { id: targetRepId, active: true },
    select: { id: true, team: { select: { code: true } } },
  });
  if (!rep) return [];

  // Access control: team managers can only access their team reps.
  if (actor.roleCode === "ACQUISITIONS_MANAGER" && rep.team.code !== "ACQUISITIONS") return [];
  if (actor.roleCode === "DISPOSITIONS_MANAGER" && rep.team.code !== "DISPOSITIONS") return [];

  const draws = await prisma.draw.findMany({
    where: {
      repId: targetRepId,
    },
    include: {
      rep: { select: { id: true, name: true, team: { select: { code: true } } } },
      deal: { select: { id: true, propertyAddress: true } },
      approvedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return draws.map((d) => {
    const amount = decToNumber(d.amount);
    const amountRecouped = decToNumber(d.amountRecouped);
    const remainingBalance = decToNumber(d.remainingBalance);
    const status = DRAW_STATUS_TO_UI[d.status] as DrawStatus;
    const statusDisplay = getStatusDisplay({ status, amountRecouped, remainingBalance });
    return {
      id: d.id,
      repId: d.repId,
      repName: d.rep.name,
      dealId: d.dealId,
      dealAddress: d.deal.propertyAddress,
      amount,
      dateIssued: dateOnlyToIsoDate(d.dateIssued),
      status,
      statusDisplay,
      approvedByName: d.approvedBy?.name ?? null,
      notes: d.notes ?? "",
      amountRecouped,
      remainingBalance,
      eligible: d.eligible,
    } satisfies DrawWithDetailsDto;
  });
}

