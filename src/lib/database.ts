/**
 * Single entry for database access in application code.
 *
 * @example
 * import { prisma } from "@/lib/database";
 */
export { prisma, getPrisma } from "@/lib/db/prisma";
export type { PrismaClient } from "@prisma/client";
