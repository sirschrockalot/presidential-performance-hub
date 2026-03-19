import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton for **server-side** use only (API routes, Server Actions, scripts).
 *
 * - **Next.js App Router:** import from `@/lib/db` in Route Handlers / server modules only.
 * - **Vite SPA:** use this when you add a backend (e.g. Express) — not from React components.
 *
 * `DATABASE_URL` must be set at runtime (see `.env.example`).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function getPrisma(): PrismaClient {
  return prisma;
}
