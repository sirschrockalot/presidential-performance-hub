/**
 * @deprecated Prefer `@/lib/db` (`getPrisma` / `prisma`) for the app entrypoint.
 * Kept as a shallow re-export for older import paths.
 */
export { getPrisma as getPrismaClient, prisma } from "@/lib/db/prisma";
