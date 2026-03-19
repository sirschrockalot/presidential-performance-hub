import type { PrismaClient } from "@prisma/client";
import { SEED_IDS } from "../ids.js";

export async function seedReportingPeriods(prisma: PrismaClient): Promise<void> {
  await prisma.reportingPeriod.createMany({
    data: [
      {
        id: SEED_IDS.reportingPeriod.WEEK_2026_02_24,
        kind: "WEEKLY",
        periodStart: new Date("2026-02-24T00:00:00.000Z"),
        periodEnd: new Date("2026-03-02T00:00:00.000Z"),
        label: "Week of Feb 24, 2026",
        isLocked: false,
      },
      {
        id: SEED_IDS.reportingPeriod.WEEK_2026_03_03,
        kind: "WEEKLY",
        periodStart: new Date("2026-03-03T00:00:00.000Z"),
        periodEnd: new Date("2026-03-09T00:00:00.000Z"),
        label: "Week of Mar 3, 2026",
        isLocked: false,
      },
    ],
  });
}
