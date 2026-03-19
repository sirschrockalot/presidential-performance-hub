/**
 * Maps between Prisma enum values (SCREAMING_SNAKE) and existing UI / mock string literals.
 * Use these when bridging Prisma queries to components that still expect legacy shapes.
 */
import type { DealStatus, DrawStatus, TeamCode, UserRoleCode } from "@prisma/client";

// ---------------------------------------------------------------------------
// DealStatus
// ---------------------------------------------------------------------------

export const DEAL_STATUS_TO_UI: Record<DealStatus, string> = {
  LEAD: "lead",
  UNDER_CONTRACT: "under_contract",
  MARKETED: "marketed",
  BUYER_COMMITTED: "buyer_committed",
  EMD_RECEIVED: "emd_received",
  ASSIGNED: "assigned",
  CLOSED_FUNDED: "closed_funded",
  CANCELED: "canceled",
};

export const DEAL_STATUS_FROM_UI: Record<string, DealStatus> = {
  lead: "LEAD",
  under_contract: "UNDER_CONTRACT",
  marketed: "MARKETED",
  buyer_committed: "BUYER_COMMITTED",
  emd_received: "EMD_RECEIVED",
  assigned: "ASSIGNED",
  closed_funded: "CLOSED_FUNDED",
  canceled: "CANCELED",
};

// ---------------------------------------------------------------------------
// DrawStatus
// ---------------------------------------------------------------------------

export const DRAW_STATUS_TO_UI: Record<DrawStatus, string> = {
  PENDING: "pending",
  APPROVED: "approved",
  PAID: "paid",
  RECOUPED: "recouped",
  DENIED: "denied",
};

export const DRAW_STATUS_FROM_UI: Record<string, DrawStatus> = {
  pending: "PENDING",
  approved: "APPROVED",
  paid: "PAID",
  recouped: "RECOUPED",
  denied: "DENIED",
};

// ---------------------------------------------------------------------------
// TeamCode
// ---------------------------------------------------------------------------

export const TEAM_CODE_TO_UI: Record<TeamCode, string> = {
  ACQUISITIONS: "acquisitions",
  DISPOSITIONS: "dispositions",
  OPERATIONS: "operations",
};

export const TEAM_CODE_FROM_UI: Record<string, TeamCode> = {
  acquisitions: "ACQUISITIONS",
  dispositions: "DISPOSITIONS",
  operations: "OPERATIONS",
};

// ---------------------------------------------------------------------------
// UserRoleCode (maps to existing `UserRole` union strings in src/types)
// ACQUISITIONS_MANAGER / DISPOSITIONS_MANAGER = contractor IC roles (legacy names).
// ---------------------------------------------------------------------------

export const USER_ROLE_CODE_TO_UI: Record<UserRoleCode, string> = {
  ADMIN: "admin",
  ACQUISITIONS_MANAGER: "acquisitions_manager",
  DISPOSITIONS_MANAGER: "dispositions_manager",
  TRANSACTION_COORDINATOR: "transaction_coordinator",
  REP: "rep",
};

export const USER_ROLE_CODE_FROM_UI: Record<string, UserRoleCode> = {
  admin: "ADMIN",
  acquisitions_manager: "ACQUISITIONS_MANAGER",
  dispositions_manager: "DISPOSITIONS_MANAGER",
  transaction_coordinator: "TRANSACTION_COORDINATOR",
  rep: "REP",
};
