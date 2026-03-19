/**
 * Re-export Prisma model types for a single import path (`@/domain`).
 * After `npx prisma generate`, these resolve from `@prisma/client`.
 */
export type {
  AuditLog,
  Deal,
  DealNote,
  DealStatusHistory,
  Draw,
  KpiEntry,
  KpiTarget,
  PointAdjustment,
  PointEvent,
  ReportingPeriod,
  Role,
  Team,
  User,
} from "@prisma/client";

export type {
  DealStatus,
  DrawStatus,
  PointEventKind,
  ReportingPeriodKind,
  TeamCode,
  UserRoleCode,
} from "@prisma/client";
