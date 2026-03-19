import type { PrismaClient } from "@prisma/client";

/**
 * Deletes all application data in FK-safe order.
 * Used before seeding so `pnpm prisma db seed` is repeatable.
 */
export async function truncateAppTables(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.pointEvent.deleteMany(),
    prisma.pointAdjustment.deleteMany(),
    prisma.draw.deleteMany(),
    prisma.kpiEntry.deleteMany(),
    prisma.kpiTarget.deleteMany(),
    prisma.dealNote.deleteMany(),
    prisma.dealStatusHistory.deleteMany(),
    prisma.deal.deleteMany(),
    prisma.reportingPeriod.deleteMany(),
    prisma.user.deleteMany(),
    prisma.role.deleteMany(),
    prisma.team.deleteMany(),
  ]);
}
