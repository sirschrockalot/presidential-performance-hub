import type { UserRoleCode } from "@prisma/client";

/**
 * Fine-grained capability keys for UI + server helpers.
 * Maps each permission to roles that may use it.
 */
export const PERMISSIONS = {
  "nav:dashboard": [
    "ADMIN",
    "ACQUISITIONS_MANAGER",
    "DISPOSITIONS_MANAGER",
    "TRANSACTION_COORDINATOR",
    "REP",
  ],
  "nav:deals": [
    "ADMIN",
    "ACQUISITIONS_MANAGER",
    "DISPOSITIONS_MANAGER",
    "TRANSACTION_COORDINATOR",
    "REP",
  ],
  "nav:kpis": [
    "ADMIN",
    "ACQUISITIONS_MANAGER",
    "DISPOSITIONS_MANAGER",
    "TRANSACTION_COORDINATOR",
    "REP",
  ],
  "nav:draws": [
    "ADMIN",
    "ACQUISITIONS_MANAGER",
    "DISPOSITIONS_MANAGER",
    "TRANSACTION_COORDINATOR",
    "REP",
  ],
  "nav:points": [
    "ADMIN",
    "ACQUISITIONS_MANAGER",
    "DISPOSITIONS_MANAGER",
    "TRANSACTION_COORDINATOR",
    "REP",
  ],
  /** Company / team analytics */
  "nav:reports": ["ADMIN", "ACQUISITIONS_MANAGER", "DISPOSITIONS_MANAGER", "TRANSACTION_COORDINATOR"],
  "nav:team": ["ADMIN", "ACQUISITIONS_MANAGER", "DISPOSITIONS_MANAGER", "TRANSACTION_COORDINATOR", "REP"],
  "nav:settings": [
    "ADMIN",
    "ACQUISITIONS_MANAGER",
    "DISPOSITIONS_MANAGER",
    "TRANSACTION_COORDINATOR",
    "REP",
  ],

  "deal:create": [
    "ADMIN",
    "ACQUISITIONS_MANAGER",
    "DISPOSITIONS_MANAGER",
    "TRANSACTION_COORDINATOR",
    "REP",
  ],
  "deal:edit": ["ADMIN", "ACQUISITIONS_MANAGER", "DISPOSITIONS_MANAGER", "TRANSACTION_COORDINATOR"],

  "team:add_member": ["ADMIN", "ACQUISITIONS_MANAGER", "DISPOSITIONS_MANAGER"],

  "kpi:new_entry": [
    "ADMIN",
    "ACQUISITIONS_MANAGER",
    "DISPOSITIONS_MANAGER",
  ],

  "draw:new_request": [
    "ADMIN",
    "ACQUISITIONS_MANAGER",
    "DISPOSITIONS_MANAGER",
    "TRANSACTION_COORDINATOR",
    "REP",
  ],

  "draw:approve": ["ADMIN"],

  "points:manual_adjust": ["ADMIN"],

  /** KPI targets, points rules, draw rules, integrations */
  "settings:admin_sections": ["ADMIN"],
} as const satisfies Record<string, readonly UserRoleCode[]>;

export type Permission = keyof typeof PERMISSIONS;

export function roleHasPermission(role: UserRoleCode | undefined, permission: Permission): boolean {
  if (!role) return false;
  const allowed = PERMISSIONS[permission];
  return (allowed as readonly UserRoleCode[]).includes(role);
}

/** Human-readable labels for header / profile */
export function roleDisplayLabel(role: UserRoleCode | undefined): string {
  switch (role) {
    case "ADMIN":
      return "Admin / Owner";
    case "ACQUISITIONS_MANAGER":
      return "Acquisitions Manager";
    case "DISPOSITIONS_MANAGER":
      return "Dispositions Manager";
    case "TRANSACTION_COORDINATOR":
      return "Transaction Coordinator";
    case "REP":
      return "Rep / Contractor";
    default:
      return "User";
  }
}
