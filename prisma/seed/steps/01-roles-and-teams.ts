import type { PrismaClient } from "@prisma/client";
import { SEED_IDS } from "../ids.js";

export async function seedRolesAndTeams(prisma: PrismaClient): Promise<void> {
  await prisma.role.createMany({
    data: [
      {
        id: SEED_IDS.role.ADMIN,
        code: "ADMIN",
        displayName: "Admin / Owner",
        description: "Full access to configuration and sensitive operations.",
      },
      {
        id: SEED_IDS.role.ACQUISITIONS_MANAGER,
        code: "ACQUISITIONS_MANAGER",
        displayName: "Acquisitions Manager",
        description: "Oversees acquisitions team KPIs and pipeline.",
      },
      {
        id: SEED_IDS.role.DISPOSITIONS_MANAGER,
        code: "DISPOSITIONS_MANAGER",
        displayName: "Dispositions Manager",
        description: "Oversees dispositions team KPIs and buyer flow.",
      },
      {
        id: SEED_IDS.role.TRANSACTION_COORDINATOR,
        code: "TRANSACTION_COORDINATOR",
        displayName: "Transaction Coordinator",
        description: "Coordinates closing and documentation.",
      },
      {
        id: SEED_IDS.role.REP,
        code: "REP",
        displayName: "Rep / Contractor",
        description: "Field rep (acquisitions or dispositions).",
      },
    ],
  });

  await prisma.team.createMany({
    data: [
      { id: SEED_IDS.team.ACQUISITIONS, code: "ACQUISITIONS", name: "Acquisitions" },
      { id: SEED_IDS.team.DISPOSITIONS, code: "DISPOSITIONS", name: "Dispositions" },
      { id: SEED_IDS.team.OPERATIONS, code: "OPERATIONS", name: "Operations" },
    ],
  });
}
