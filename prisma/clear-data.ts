/**
 * Clear application data from PostgreSQL while preserving schema, migrations,
 * lookup tables (Role, Team), and the user named exactly "Joel Schrock".
 *
 * Safety (both required):
 *   - NODE_ENV must not be "production"
 *   - CONFIRM_CLEAR_DATA must be "true"
 *
 * Does not touch `_prisma_migrations` or any Prisma system tables.
 * Does not reseed data.
 *
 * Run:
 *   CONFIRM_CLEAR_DATA=true npm run db:clear
 */

import { PrismaClient } from "@prisma/client";

const PRESERVED_USER_NAME = "Joel Schrock";

const prisma = new PrismaClient();

type Summary = Record<string, number>;

function assertSafeToRun(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[clear-data] Refusing to run: NODE_ENV is production. This script must never run against prod."
    );
  }
  if (process.env.VERCEL_ENV === "production") {
    throw new Error(
      "[clear-data] Refusing to run: VERCEL_ENV is production."
    );
  }
  if (process.env.CONFIRM_CLEAR_DATA !== "true") {
    throw new Error(
      '[clear-data] Set CONFIRM_CLEAR_DATA=true to confirm. Example: CONFIRM_CLEAR_DATA=true npm run db:clear'
    );
  }
}

async function resolvePreservedUserId(): Promise<string> {
  const matches = await prisma.user.findMany({
    where: { name: PRESERVED_USER_NAME },
    select: { id: true, email: true, name: true },
  });

  if (matches.length === 0) {
    throw new Error(
      `[clear-data] No user with name exactly "${PRESERVED_USER_NAME}" found. Aborting — no data was deleted.`
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `[clear-data] Found ${matches.length} users named "${PRESERVED_USER_NAME}". Resolve duplicates before running. Aborting.`
    );
  }

  const u = matches[0]!;
  console.log(
    `[clear-data] Preserving user: ${u.name} <${u.email}> (id=${u.id})`
  );
  return u.id;
}

async function main(): Promise<void> {
  assertSafeToRun();

  const preservedUserId = await resolvePreservedUserId();
  const summary: Summary = {};

  const record = (table: string, count: number) => {
    summary[table] = count;
  };

  await prisma.$transaction(
    async (tx) => {
      // Order follows FK constraints (same spirit as prisma/seed/truncate.ts).
      // Role / Team: intentionally not cleared — required for a valid User row.

      let r = await tx.auditLog.deleteMany({});
      record("AuditLog", r.count);

      r = await tx.pointEvent.deleteMany({});
      record("PointEvent", r.count);

      r = await tx.pointAdjustment.deleteMany({});
      record("PointAdjustment", r.count);

      r = await tx.draw.deleteMany({});
      record("Draw", r.count);

      r = await tx.kpiEntry.deleteMany({});
      record("KpiEntry", r.count);

      r = await tx.kpiTarget.deleteMany({});
      record("KpiTarget", r.count);

      // Cascade from Deal would remove these; explicit counts are clearer in logs.
      r = await tx.dealNote.deleteMany({});
      record("DealNote", r.count);

      r = await tx.dealStatusHistory.deleteMany({});
      record("DealStatusHistory", r.count);

      r = await tx.deal.deleteMany({});
      record("Deal", r.count);

      r = await tx.reportingPeriod.deleteMany({});
      record("ReportingPeriod", r.count);

      r = await tx.user.deleteMany({
        where: { NOT: { id: preservedUserId } },
      });
      record("User (deleted)", r.count);

      // Preserved reference rows (not deleted) — report counts for visibility.
      const rolesLeft = await tx.role.count();
      const teamsLeft = await tx.team.count();
      const usersLeft = await tx.user.count();
      record("Role (retained rows)", rolesLeft);
      record("Team (retained rows)", teamsLeft);
      record("User (retained rows)", usersLeft);
    },
    {
      maxWait: 30_000,
      timeout: 120_000,
    }
  );

  console.log("\n[clear-data] Deletion summary (counts):\n");
  const orderedKeys = [
    "AuditLog",
    "PointEvent",
    "PointAdjustment",
    "Draw",
    "KpiEntry",
    "KpiTarget",
    "DealNote",
    "DealStatusHistory",
    "Deal",
    "ReportingPeriod",
    "User (deleted)",
    "Role (retained rows)",
    "Team (retained rows)",
    "User (retained rows)",
  ];
  for (const k of orderedKeys) {
    if (k in summary) {
      console.log(`  ${k}: ${summary[k]}`);
    }
  }

  const stillThere = await prisma.user.findFirst({
    where: { id: preservedUserId, name: PRESERVED_USER_NAME },
  });
  if (!stillThere) {
    throw new Error("[clear-data] Invariant failed: preserved user missing after transaction.");
  }
  console.log(
    `\n[clear-data] Confirmed: "${PRESERVED_USER_NAME}" still exists and is the only remaining user (if others were present before).\n`
  );
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
