# Local PostgreSQL + Prisma

This project uses **Prisma** with **PostgreSQL**. The schema lives in `prisma/schema.prisma`.

## Prerequisites

- Node 20+ (recommended)
- A running PostgreSQL instance (local Docker, Postgres.app, or cloud)

### Example: Docker Postgres

```bash
docker run --name pdh-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=presidential_digs_hub \
  -p 5432:5432 \
  -d postgres:16
```

Then set in `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/presidential_digs_hub?schema=public"
```

## Commands

| Script | Purpose |
|--------|---------|
| `npm run prisma:generate` | Generate Prisma Client into `node_modules/@prisma/client` |
| `npm run prisma:migrate` | Create/apply migrations in dev (`prisma migrate dev`) |
| `npm run prisma:migrate:deploy` | Apply existing migrations (CI / production) |
| `npm run prisma:seed` | Run `prisma/seed/index.ts` (sample data) |
| `npm run db:reset` | **Drops** data, reapplies migrations, runs seed |
| `npm run prisma:studio` | Open Prisma Studio GUI |

## First-time setup

```bash
cp .env.example .env
# Edit .env → set DATABASE_URL

npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Application code

- **Prisma singleton:** `src/lib/db/prisma.ts` — import `prisma` or `getPrisma()` from `@/lib/db`.
- **Env guard (optional):** `src/lib/env/database-url.ts` — `requireDatabaseUrl()` for explicit failures when the URL is missing.

> **Next.js:** Only import `@/lib/db` from **server** code (Route Handlers, Server Actions, `getServerSideProps`, etc.). Do not import Prisma in client components.

## Seed behavior

`prisma/seed/index.ts` **truncates** all application tables (in FK order), then inserts demo users, deals, KPIs, draws, and point events. Safe for local dev; **do not run against production** without review.
