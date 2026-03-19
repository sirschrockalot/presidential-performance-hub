/**
 * Prisma client entrypoint.
 *
 * The app already uses `src/lib/db/prisma.ts` internally; this file exists so
 * imports can use `@/lib/db` or `@/lib/db.ts` consistently.
 */
export { prisma, getPrisma } from "@/lib/db/prisma";
export type { PrismaClient } from "@prisma/client";

