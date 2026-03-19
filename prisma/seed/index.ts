/**
 * Database seed entrypoint.
 * Run: `npm run prisma:seed` (or `npx prisma db seed` after migrate).
 *
 * Requires `DATABASE_URL` in `.env` (never commit secrets).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { truncateAppTables } from "./truncate.js";
import { seedRolesAndTeams } from "./steps/01-roles-and-teams.js";
import { seedUsers } from "./steps/02-users.js";
import { seedReportingPeriods } from "./steps/03-reporting-periods.js";
import { seedKpiTargetsAndEntries } from "./steps/04-kpi-targets-and-entries.js";
import { seedDealsStatusHistoryAndNotes } from "./steps/05-deals-and-history.js";
import { seedDraws } from "./steps/06-draws.js";
import { seedPointEventsAndAdjustments } from "./steps/07-point-events.js";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.info("🌱 Seeding database…");

  await truncateAppTables(prisma);

  await seedRolesAndTeams(prisma);
  console.info("  ✓ Roles & teams");

  const seedPassword = process.env.SEED_USER_PASSWORD ?? "LocalDev-ChangeMe!";
  const passwordHash = await bcrypt.hash(seedPassword, 12);
  await seedUsers(prisma, passwordHash);
  console.info("  ✓ Users (demo password from SEED_USER_PASSWORD or default LocalDev-ChangeMe!)");

  await seedReportingPeriods(prisma);
  console.info("  ✓ Reporting periods");

  await seedKpiTargetsAndEntries(prisma);
  console.info("  ✓ KPI targets & entries");

  await seedDealsStatusHistoryAndNotes(prisma);
  console.info("  ✓ Deals, status history, notes");

  await seedDraws(prisma);
  console.info("  ✓ Draws");

  await seedPointEventsAndAdjustments(prisma);
  console.info("  ✓ Point events & adjustments");

  console.info("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
