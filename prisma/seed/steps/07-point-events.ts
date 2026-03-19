import type { PrismaClient } from "@prisma/client";
import { SEED_IDS } from "../ids.js";

const u = SEED_IDS.user;
const d = SEED_IDS.deal;

/**
 * Point totals align with business rules (for demo realism):
 * - D8 fee $12,500 → base 2 + tier +1 = 3.0 per acq/dispo rep; TC 0.5
 * - D9 fee $7,500 → base 1; TC 0.5
 * - D10 fee $18,500 → base 2 + tier +2 = 4.0; TC 0.5
 * - D12 fee $22,000 → base 2 + tier +3 = 5.0; TC 0.5
 */
export async function seedPointEventsAndAdjustments(prisma: PrismaClient): Promise<void> {
  await prisma.pointEvent.createMany({
    data: [
      // Deal D8 — funded
      {
        userId: u.REP_ACQ_JORDAN,
        dealId: d.D8,
        points: 3,
        kind: "AUTO_FUNDED_DEAL",
        reason: "Closed / funded — acquisitions rep share (fee $12,500).",
      },
      {
        userId: u.REP_DISPO_ALEX,
        dealId: d.D8,
        points: 3,
        kind: "AUTO_FUNDED_DEAL",
        reason: "Closed / funded — dispositions rep share (fee $12,500).",
      },
      {
        userId: u.TC,
        dealId: d.D8,
        points: 0.5,
        kind: "AUTO_FUNDED_DEAL",
        reason: "Closed / funded — transaction coordinator (0.5 pts).",
      },
      // Deal D9 — funded, under $8k fee penalty
      {
        userId: u.REP_ACQ_SARAH,
        dealId: d.D9,
        points: 1,
        kind: "AUTO_FUNDED_DEAL",
        reason: "Closed / funded — acquisitions rep share (fee $7,500, base after penalty).",
      },
      {
        userId: u.REP_DISPO_CASEY,
        dealId: d.D9,
        points: 1,
        kind: "AUTO_FUNDED_DEAL",
        reason: "Closed / funded — dispositions rep share (fee $7,500).",
      },
      {
        userId: u.TC,
        dealId: d.D9,
        points: 0.5,
        kind: "AUTO_FUNDED_DEAL",
        reason: "Closed / funded — transaction coordinator (0.5 pts).",
      },
      // Deal D10 — funded, $15k+ tier
      {
        userId: u.REP_ACQ_JORDAN,
        dealId: d.D10,
        points: 4,
        kind: "AUTO_FUNDED_DEAL",
        reason: "Closed / funded — acquisitions rep share (fee $18,500).",
      },
      {
        userId: u.REP_DISPO_ALEX,
        dealId: d.D10,
        points: 4,
        kind: "AUTO_FUNDED_DEAL",
        reason: "Closed / funded — dispositions rep share (fee $18,500).",
      },
      {
        userId: u.TC,
        dealId: d.D10,
        points: 0.5,
        kind: "AUTO_FUNDED_DEAL",
        reason: "Closed / funded — transaction coordinator (0.5 pts).",
      },
      // Deal D12 — funded, $20k+ tier
      {
        userId: u.REP_ACQ_SARAH,
        dealId: d.D12,
        points: 5,
        kind: "AUTO_FUNDED_DEAL",
        reason: "Closed / funded — acquisitions rep share (fee $22,000).",
      },
      {
        userId: u.REP_DISPO_ALEX,
        dealId: d.D12,
        points: 5,
        kind: "AUTO_FUNDED_DEAL",
        reason: "Closed / funded — dispositions rep share (fee $22,000).",
      },
      {
        userId: u.TC,
        dealId: d.D12,
        points: 0.5,
        kind: "AUTO_FUNDED_DEAL",
        reason: "Closed / funded — transaction coordinator (0.5 pts).",
      },
    ],
  });

  await prisma.pointAdjustment.create({
    data: {
      id: SEED_IDS.pointAdjustment.MANUAL_1,
      recipientUserId: u.REP_DISPO_ALEX,
      dealId: d.D8,
      points: 0.5,
      reason: "Seed: discretionary recognition (demo manual adjustment).",
      approvedByUserId: u.ADMIN,
    },
  });

  await prisma.pointEvent.create({
    data: {
      userId: u.REP_DISPO_ALEX,
      dealId: d.D8,
      points: 0.5,
      kind: "MANUAL_ADJUSTMENT",
      reason: "Manual adjustment — see linked PointAdjustment record.",
      pointAdjustmentId: SEED_IDS.pointAdjustment.MANUAL_1,
      createdByUserId: u.ADMIN,
    },
  });
}
