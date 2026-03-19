import type { PrismaClient } from "@prisma/client";
import { SEED_IDS } from "../ids.js";

const u = SEED_IDS.user;
const d = SEED_IDS.deal;
const dr = SEED_IDS.draw;

export async function seedDraws(prisma: PrismaClient): Promise<void> {
  await prisma.draw.createMany({
    data: [
      {
        id: dr.DR1,
        dealId: d.D6,
        repId: u.REP_ACQ_SARAH,
        amount: 6000,
        status: "PENDING",
        eligible: true,
        dateIssued: new Date("2026-02-28"),
        notes: "Draw against assigned deal with EMD received.",
        amountRecouped: 0,
        remainingBalance: 6000,
      },
      {
        id: dr.DR2,
        dealId: d.D6,
        repId: u.REP_DISPO_ALEX,
        amount: 4000,
        status: "APPROVED",
        eligible: true,
        dateIssued: new Date("2026-02-27"),
        approvedByUserId: u.ACQUISITIONS_MANAGER,
        notes: "Approved pending wire.",
        amountRecouped: 0,
        remainingBalance: 4000,
      },
      {
        id: dr.DR3,
        dealId: d.D7,
        repId: u.REP_DISPO_CASEY,
        amount: 8500,
        status: "PAID",
        eligible: true,
        dateIssued: new Date("2026-02-28"),
        approvedByUserId: u.ADMIN,
        notes: "Paid to rep.",
        amountRecouped: 0,
        remainingBalance: 8500,
      },
      {
        id: dr.DR4,
        dealId: d.D8,
        repId: u.REP_ACQ_JORDAN,
        amount: 5000,
        status: "RECOUPED",
        eligible: true,
        dateIssued: new Date("2025-12-15"),
        approvedByUserId: u.ADMIN,
        notes: "Recouped at closing.",
        amountRecouped: 5000,
        remainingBalance: 0,
      },
      {
        id: dr.DR5,
        dealId: d.D7,
        repId: u.REP_ACQ_JORDAN,
        amount: 3000,
        status: "PAID",
        eligible: true,
        dateIssued: new Date("2026-02-28"),
        approvedByUserId: u.ADMIN,
        notes: "Partial draw.",
        amountRecouped: 0,
        remainingBalance: 3000,
      },
      {
        id: dr.DR6,
        dealId: d.D2,
        repId: u.REP_ACQ_SARAH,
        amount: 2500,
        status: "DENIED",
        eligible: false,
        dateIssued: new Date("2026-02-10"),
        approvedByUserId: u.ADMIN,
        notes: "Denied — deal not assigned / EMD not complete.",
        amountRecouped: 0,
        remainingBalance: 0,
      },
    ],
  });
}
