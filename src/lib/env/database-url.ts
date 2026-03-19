/**
 * Server-only helper: fail fast when `DATABASE_URL` is missing.
 * Prisma CLI loads `.env` automatically; this is for app/API code paths.
 */
export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy `.env.example` to `.env` and configure your PostgreSQL connection string.",
    );
  }
  return url;
}

export function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL?.trim();
  return url || undefined;
}
