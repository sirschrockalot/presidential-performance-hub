# Security guard rails (internal)

Short checklist for API and server changes. Full enforcement is layered (Zod, services, route guards).

## API routes

- **Default:** every `/api/*` handler requires an explicit auth guard (`guardApiSessionUser`, `guardSessionActor`, `guardSessionActorWithTeam`, etc. from `src/lib/auth/api-route-guard.ts`).
- **Document exceptions:** only intentional public routes (e.g. `/api/auth/*`, `/api/health`) skip auth.
- **Permissions:** use `requirePermissionOr403` / `guard*WithPermission` — avoid ad-hoc role string checks in routes.
- **Do not** import `getCurrentUser` / `getApiSessionUser` directly in route files (except `api/me/route.ts`, which may call `getCurrentUser` after `guardSessionActor` for full session payload). `npm run test` includes `src/test/api-routes-guard-audit.test.ts`, which fails if a protected route skips the guard module or uses disallowed imports.

## Data and assignments

- **Never trust** client-supplied user IDs for deal assignments, role changes, or cross-user reads. Validation lives in services (e.g. `deal-assignment-invariants.ts`, `team-role-invariants.ts`, points summary checks in `points.queries.ts`).
- **Scoped reads:** list/detail endpoints must apply the same scope rules as sibling list APIs (team, points, deals).

## Logging

- **Do not** `console.log` / `JSON.stringify` full payloads for dashboard, KPIs, deals, imports, or user directories.
- **Do** use `logPerfMetric` or `estimateJsonCharLength` from `src/lib/logging/safe-server-log.ts` (and dashboard perf helpers) for timing, counts, and approximate sizes only.

## Imports

- Bulk import array sizes are capped in Zod schemas using `src/lib/security/import-limits.ts`. Raise limits only with product/ops agreement.

## Tests

- Add or extend regression tests under `src/**/*.test.ts` when changing auth, assignment, points scope, form-user lists, or logging utilities.
- `api-route-guard.ts` pulls `next/server` — keep heavy route-guard unit tests in integration/E2E, or extract pure checks to modules that do not import Next.js (Vitest loads `next-auth` → `next/server` unreliably in the current test setup).
