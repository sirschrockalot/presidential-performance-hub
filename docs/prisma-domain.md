# Prisma domain models — Presidential Digs Performance Hub

Canonical schema: `prisma/schema.prisma` (PostgreSQL).

## Model overview

| Model | Purpose |
|--------|---------|
| **Role** | Lookup / RBAC anchor. One row per `UserRoleCode` (seeded). Users reference `roleId`. |
| **Team** | Lookup for business team (`ACQUISITIONS`, `DISPOSITIONS`, `OPERATIONS`). Users and KPI rows reference `teamId`. |
| **User** | Internal user; belongs to one `Role` and one `Team`. Linked to deals (acq / dispo / TC), KPIs, draws, points, notes, audit. |
| **Deal** | Source of truth for a wholesale deal: reps, fees, EMD flags, milestones, current `DealStatus`. Drives draw eligibility and funded-deal point accrual. |
| **DealStatusHistory** | Append-only-style history of status transitions (`fromStatus` → `toStatus`), who changed it, when, optional note. |
| **DealNote** | User-authored notes on a deal (separate from status history). |
| **ReportingPeriod** | Bounded reporting window (weekly primary); used to group `KpiEntry` and optional `KpiTarget`. |
| **KpiEntry** | One row per user per `ReportingPeriod` (weekly KPI submission). Optional fields hold acq- vs dispo-specific metrics. |
| **KpiTarget** | Target value per `metricKey` for a `Team`, optionally scoped to a `ReportingPeriod`. |
| **Draw** | Draw against a `Deal` for a `rep` (`User`). `eligible` stored for audit; business rule: deal `ASSIGNED` + `buyerEmdReceived`. |
| **PointAdjustment** | Manual adjustment record (recipient, optional deal, approver, reason). Links to ledger via `PointEvent`. |
| **PointEvent** | Points ledger line: auto (funded deal) or manual (via adjustment). Ties to `User` and optionally `Deal`. |
| **AuditLog** | Generic audit trail: actor, action, entity type/id, JSON metadata. |

## Point rules (reference)

Implemented in application layer later (not in DB): base 2, &lt; $8k fee −1, tiers +1/+2/+3 at $10k/$15k/$20k (highest tier only), TC 0.5 on funded deals. `PointEvent` stores resulting `points` and `kind`.

## TypeScript

- Prisma-generated types: import from `@prisma/client` or `@/domain` (`prisma-types.ts`).
- UI legacy string enums: use `@/domain` mappers in `prisma-enums.ts`.
