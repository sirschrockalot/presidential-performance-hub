# Authentication & RBAC

## Stack

- **Next.js App Router** + **Auth.js / NextAuth v5** (`next-auth@5`) with **Credentials** provider
- **JWT sessions** (Edge-safe middleware uses `getToken` only — no Prisma on the Edge runtime)
- **PostgreSQL users** via Prisma (`passwordHash` with bcrypt, `mockScopeId` aligned to mock fixtures `u1`–`u8`)

## Environment

See `.env.example`:

- `AUTH_SECRET` — required
- `AUTH_TRUST_HOST=true` — typical for local dev
- `DATABASE_URL` — required for login (user lookup)
- `SEED_USER_PASSWORD` — optional; defaults to `LocalDev-ChangeMe!` when seeding

## Scripts

- `npm run dev` — Next.js on port **8080**
- `npm run prisma:migrate` — apply migrations (includes `User.passwordHash` / `mockScopeId`)
- `npm run prisma:seed` — creates demo users **u1–u8** with shared demo password

## Session shape

JWT / session carry: `roleCode` (Prisma `UserRoleCode`), `teamCode` (`TeamCode`), `mockScopeId` (e.g. `u5` for reps).

## Permission map

Source of truth: `src/lib/auth/permissions.ts` (`PERMISSIONS` + `roleHasPermission`).

Client context: `AuthzProvider` / `useAuthz()` in `src/lib/auth/authz-context.tsx`.

Server helper: `getCurrentUser()` in `src/lib/auth/current-user.ts`.

## Data scoping (mock layer)

`src/lib/auth/data-scope.ts` defines `DataScope` and filters mock services until APIs read Prisma only:

- **Admin / managers** — `full`
- **Rep** — own deals (acq or dispo rep), own KPI rows, draws, points events
- **Transaction Coordinator** — deals where `transactionCoordinatorId` matches, related draws/points

## API example

`GET /api/me` returns the current session user as JSON (401 if unauthenticated).
