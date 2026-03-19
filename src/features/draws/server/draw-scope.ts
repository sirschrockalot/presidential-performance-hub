import type { Prisma, TeamCode, UserRoleCode } from "@prisma/client";

import type { Team } from "@/types";

export type DrawActor = {
  id: string;
  roleCode: UserRoleCode;
  teamCode: TeamCode;
};

export function uiTeamToPrismaTeamCode(team: Team): TeamCode {
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
 * Row-level scope for draw queries.
 * - Reps: only their own draws
 * - Team managers: draws for reps on their business team
 * - TC: draws for deals they coordinate
 * - Admin: all
 */
export function drawWhereForScope(actor: DrawActor): Prisma.DrawWhereInput {
  switch (actor.roleCode) {
    case "ADMIN":
      return {};
    case "ACQUISITIONS_MANAGER":
      return { rep: { team: { code: "ACQUISITIONS" } } };
    case "DISPOSITIONS_MANAGER":
      return { rep: { team: { code: "DISPOSITIONS" } } };
    case "TRANSACTION_COORDINATOR":
      return { deal: { transactionCoordinatorId: actor.id } };
    case "REP":
      return { repId: actor.id };
    default:
      return { id: "__none__" };
  }
}

export function teamCodeForRepScope(actor: DrawActor): TeamCode | null {
  if (actor.roleCode === "ACQUISITIONS_MANAGER") return "ACQUISITIONS";
  if (actor.roleCode === "DISPOSITIONS_MANAGER") return "DISPOSITIONS";
  return null;
}

