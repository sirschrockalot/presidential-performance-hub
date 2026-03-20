import type { UserRoleCode } from "@prisma/client";

/** Roles non-admin actors may grant when creating team members (prevents privilege escalation). */
export const CREATABLE_TEAM_MEMBER_ROLES_FOR_NON_ADMIN: ReadonlySet<UserRoleCode> = new Set([
  "REP",
  "TRANSACTION_COORDINATOR",
]);

/**
 * Enforces which `roleCode` may be assigned when creating a user.
 * Admin may assign any role; non-admins are limited to {@link CREATABLE_TEAM_MEMBER_ROLES_FOR_NON_ADMIN} and cannot create ADMIN.
 */
export function assertCreatableTeamMemberRole(
  actorRoleCode: UserRoleCode,
  requestedRoleCode: UserRoleCode
): void {
  if (actorRoleCode !== "ADMIN") {
    if (requestedRoleCode === "ADMIN") {
      throw new Error("Forbidden");
    }
    if (!CREATABLE_TEAM_MEMBER_ROLES_FOR_NON_ADMIN.has(requestedRoleCode)) {
      throw new Error("Forbidden");
    }
  }
}
