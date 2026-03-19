import type { DealStatus, PointEventKind } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import type { DealActor } from "@/features/deals/server/deal-scope";

import { calculateAssignmentFeePoints, calculateTcPoints } from "@/features/points/server/points-calculator";

type RecipientKey = "acquisitions_rep" | "dispositions_rep" | "tc";

type RecipientPoints = {
  userId: string;
  key: RecipientKey;
  points: number;
  reasonFragment: string;
};

function decToNumber(d: unknown): number {
  return typeof d === "number" ? d : Number(d);
}

function buildAutoReason(args: {
  dealId: string;
  recipientKey: RecipientKey;
  assignmentFee: number | null;
  points: number;
  breakdown?: { base: number; bonus: number; total: number };
}) {
  const { dealId, recipientKey, assignmentFee, points, breakdown } = args;
  if (recipientKey === "tc") {
    return `AUTO_FUNDED_DEAL (TC): Deal ${dealId} -> 0.5 pts`;
  }
  const feeText = assignmentFee == null ? "unknown fee" : `$${assignmentFee.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (!breakdown) {
    return `AUTO_FUNDED_DEAL (Rep): Deal ${dealId} -> ${points} pts (fee ${feeText})`;
  }
  return `AUTO_FUNDED_DEAL (Rep): Deal ${dealId} fee ${feeText} -> ${breakdown.total} pts (base ${breakdown.base} + bonus ${breakdown.bonus})`;
}

function buildCorrectionReason(args: { dealId: string; recipientKey: RecipientKey; expected: number; net: number; note: string }) {
  const { dealId, recipientKey, expected, net, note } = args;
  const who = recipientKey === "tc" ? "TC" : recipientKey.includes("acquisitions") ? "Acq/Dispo Rep" : "Rep";
  return `CORRECTION (${who}): Deal ${dealId} expected ${expected} pts, net ${net} pts. ${note}`;
}

function isClosedFunded(status: DealStatus) {
  return status === "CLOSED_FUNDED";
}

async function listRecipientPointsForDeal(prisma: any, dealId: string): Promise<RecipientPoints[]> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      assignmentFee: true,
      acquisitionsRepId: true,
      dispoRepId: true,
      transactionCoordinatorId: true,
    },
  });

  if (!deal) return [];

  const assignmentFeeNum = deal.assignmentFee == null ? null : decToNumber(deal.assignmentFee);
  const repBreakdown =
    assignmentFeeNum == null ? undefined : calculateAssignmentFeePoints(assignmentFeeNum);
  const repPoints = repBreakdown ? repBreakdown.total : 0;
  const tcPoints = calculateTcPoints();

  const recipients: RecipientPoints[] = [];

  // Acquisitions rep always exists in schema.
  recipients.push({
    userId: deal.acquisitionsRepId,
    key: "acquisitions_rep",
    points: repPoints,
    reasonFragment: `fee=${assignmentFeeNum == null ? "null" : assignmentFeeNum}`,
  });

  if (deal.dispoRepId) {
    recipients.push({
      userId: deal.dispoRepId,
      key: "dispositions_rep",
      points: repPoints,
      reasonFragment: `fee=${assignmentFeeNum == null ? "null" : assignmentFeeNum}`,
    });
  }

  if (deal.transactionCoordinatorId) {
    recipients.push({
      userId: deal.transactionCoordinatorId,
      key: "tc",
      points: tcPoints,
      reasonFragment: "fixed=0.5",
    });
  }

  // Build reason fragments that include breakdown on reps.
  return recipients.map((r) => {
    if (r.key === "tc") return r;
    if (!repBreakdown) return r;
    return { ...r, reasonFragment: `base=${repBreakdown.base};bonus=${repBreakdown.bonus};total=${repBreakdown.total}` };
  });
}

async function getNetNonManualPoints(prisma: any, dealId: string, userId: string): Promise<number> {
  const agg = await prisma.pointEvent.aggregate({
    where: {
      dealId,
      userId,
      kind: { not: "MANUAL_ADJUSTMENT" },
    },
    _sum: { points: true },
  });

  return agg._sum.points == null ? 0 : Number(agg._sum.points);
}

export async function syncPointsForDealFundingTransition(
  prisma: any,
  actor: DealActor,
  dealId: string,
  toStatus: DealStatus
): Promise<void> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      status: true,
      assignmentFee: true,
    },
  });
  if (!deal) return;

  const recipients = await listRecipientPointsForDeal(prisma, dealId);
  if (!recipients.length) return;

  const shouldBeActive = isClosedFunded(toStatus);

  for (const recipient of recipients) {
    const expected = shouldBeActive ? recipient.points : 0;

    const net = await getNetNonManualPoints(prisma, dealId, recipient.userId);
    if (Math.abs(net - expected) < 0.0001) continue;

    const autoExisting = await prisma.pointEvent.findFirst({
      where: {
        dealId,
        userId: recipient.userId,
        kind: "AUTO_FUNDED_DEAL" as PointEventKind,
      },
    });

    if (!autoExisting) {
      // Only create AUTO when deal is active and we have a positive expected points.
      if (!shouldBeActive) {
        // No AUTO event exists but net is non-zero. Bring it to 0 with CORRECTION.
        const delta = expected - net;
        await prisma.pointEvent.create({
          data: {
            dealId,
            userId: recipient.userId,
            points: new Decimal(delta),
            kind: "CORRECTION",
            reason: buildCorrectionReason({
              dealId,
              recipientKey: recipient.key,
              expected,
              net,
              note: "Reversed: deal is no longer CLOSED_FUNDED",
            }),
            createdByUserId: actor.id,
            createdAt: new Date(),
          },
        });
        continue;
      } else if (expected === 0) {
        continue;
      }

      await prisma.pointEvent.create({
        data: {
          dealId,
          userId: recipient.userId,
          points: new Decimal(expected),
          kind: "AUTO_FUNDED_DEAL",
          reason: buildAutoReason({
            dealId,
            recipientKey: recipient.key,
            assignmentFee: deal.assignmentFee == null ? null : decToNumber(deal.assignmentFee),
            points: expected,
            breakdown: recipient.key === "tc" ? undefined : calculateAssignmentFeePoints(decToNumber(deal.assignmentFee ?? 0)),
          }),
          createdByUserId: actor.id,
          createdAt: new Date(),
        },
      });
      continue;
    }

    // Net doesn't match expected (either due to reversal/re-entry or fee changes); correct with CORRECTION.
    const delta = expected - net;
    await prisma.pointEvent.create({
      data: {
        dealId,
        userId: recipient.userId,
        points: new Decimal(delta),
        kind: "CORRECTION",
        reason: buildCorrectionReason({
          dealId,
          recipientKey: recipient.key,
          expected,
          net,
          note: shouldBeActive ? "Funded deal points sync" : "Reversed: deal is no longer CLOSED_FUNDED",
        }),
        createdByUserId: actor.id,
        createdAt: new Date(),
      },
    });
  }
}

