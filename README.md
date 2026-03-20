# Presidential Performance Hub

`presidential-performance-hub` is a Next.js operations dashboard for a real-estate sales org. It combines KPI tracking, deal visibility, draws, points, and team management into one app used by reps, managers, and admins.

## What the app does

- Tracks weekly KPI performance for Acquisitions and Dispositions teams.
- Shows rep-level KPI compliance, historical hit rates, team summaries, and dashboard highlights.
- Manages deal pipeline records, recent activity, and performance trends.
- Supports draw workflows and visibility into rep draw history/details.
- Maintains a points leaderboard and points history.
- Includes role-based access controls for reps, managers, transaction coordinators, and admins.

## KPI coverage

- **Acquisitions KPIs:** dials, talk time, offers, contracts (plus related reporting fields).
- **Dispositions KPIs:** dials and talk time (plus related reporting fields).
- KPI pages include compliance badges, rep scorecards, historical hit-rate visuals, and weekly summaries.
- Dashboard surfaces top performer, at-risk rep, compliance snapshots, and trend indicators.

## Tech stack

- Next.js (App Router), React, TypeScript
- Prisma + PostgreSQL
- Auth.js (NextAuth v5 beta)
- React Query for client data fetching
- Tailwind + shadcn/ui-style component system
- Recharts for KPI/dashboard charts

## Local development

### 1) Install

```bash
npm install
```

### 2) Configure environment

Copy `.env.example` to `.env` and provide real values:

```bash
cp .env.example .env
```

Minimum required values:

- `DATABASE_URL`
- `DIRECT_URL` (recommended for migrations/admin tasks)
- `AUTH_SECRET`

### 3) Apply DB migrations and seed (optional)

```bash
npm run prisma:migrate
npm run prisma:seed
```

### 4) Run the app

```bash
npm run dev
```

The app runs on `http://localhost:8080`.

## Useful scripts

- `npm run dev` - Start Next.js dev server on port 8080
- `npm run build` - Production build
- `npm run start` - Start production server on port 8080
- `npm run lint` - Run ESLint
- `npm run test` - Run test suite
- `npm run prisma:migrate` - Create/apply local migrations
- `npm run prisma:migrate:deploy` - Apply migrations in deployment environments
- `npm run prisma:studio` - Open Prisma Studio
- `npm run db:clear` - Clear app data (requires `CONFIRM_CLEAR_DATA=true`)

## Data model notes

- Weekly KPI data is stored in `KpiEntry` scoped to `ReportingPeriod`.
- KPI targets are stored in `KpiTarget`.
- Daily KPI ingestion support is now scaffolded with `DailyKpiEntry` and `KpiDataSource` for nightly phone activity sync workflows.

## Deployment

- The app is designed for PostgreSQL-backed deployment (for example via Supabase + Vercel).
- Ensure all required environment variables are configured in your deployment platform before shipping.
