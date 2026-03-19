import type { Team as UiTeam } from "@/types";
import type { TeamCode } from "@prisma/client";
import type { UserRoleCode as PrismaUserRoleCode } from "@prisma/client";

export type KpiActor = {
  id: string;
  roleCode: PrismaUserRoleCode;
  teamCode: TeamCode;
};

export function uiTeamToPrismaTeamCode(team: UiTeam): TeamCode {
  switch (team) {
    case "acquisitions":
      return "ACQUISITIONS";
    case "dispositions":
      return "DISPOSITIONS";
    case "operations":
      return "OPERATIONS";
    default: {
      const _exhaustive: never = team;
      return _exhaustive;
    }
  }
}

/**
 * Determines whether actor is allowed to access the requested KPI team
 * and provides the Prisma `userId` constraint for REP scoping.
 */
export function kpiEntryUserWhereForScope(actor: KpiActor, requestedTeamCode: TeamCode): { userId?: string } {
  switch (actor.roleCode) {
    case "ADMIN":
      return {};
    case "ACQUISITIONS_MANAGER":
      if (requestedTeamCode !== "ACQUISITIONS") return { userId: "__none__" };
      return {};
    case "DISPOSITIONS_MANAGER":
      if (requestedTeamCode !== "DISPOSITIONS") return { userId: "__none__" };
      return {};
    case "TRANSACTION_COORDINATOR":
      // TC is allowed to view both acquisitions + dispositions teams.
      return {};
    case "REP":
      // Reps can only view their own KPI entry, and only for their assigned team.
      if (requestedTeamCode !== actor.teamCode) return { userId: "__none__" };
      return { userId: actor.id };
    default:
      return { userId: "__none__" };
  }
}

export function canMutateKpiEntries(actor: KpiActor): boolean {
  return actor.roleCode === "ADMIN" || actor.roleCode === "ACQUISITIONS_MANAGER" || actor.roleCode === "DISPOSITIONS_MANAGER";
}

