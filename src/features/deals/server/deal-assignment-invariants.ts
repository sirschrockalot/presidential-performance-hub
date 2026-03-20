import type { PrismaClient, TeamCode, UserRoleCode } from "@prisma/client";

import type { DealActor } from "@/features/deals/server/deal-scope";

export const INVALID_DEAL_ASSIGNMENT_MESSAGE = "Invalid deal assignment" as const;

type AssignmentUserRow = {
  id: string;
  teamCode: TeamCode;
  roleCode: UserRoleCode;
};

export async function loadActorTeamCode(prisma: PrismaClient, actor: DealActor): Promise<TeamCode | undefined> {
  if (actor.teamCode) return actor.teamCode;
  const row = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { team: { select: { code: true } } },
  });
  return row?.team.code;
}

async function loadAssignmentUsers(
  prisma: PrismaClient,
  acqId: string,
  dispoId: string | null,
  tcId: string | null
): Promise<Map<string, AssignmentUserRow>> {
  const ids = [acqId, ...(dispoId ? [dispoId] : []), ...(tcId ? [tcId] : [])];
  const users = await prisma.user.findMany({
    where: { id: { in: ids }, active: true },
    select: {
      id: true,
      team: { select: { code: true } },
      role: { select: { code: true } },
    },
  });
  return new Map(
    users.map((u) => [u.id, { id: u.id, teamCode: u.team.code, roleCode: u.role.code }])
  );
}

/**
 * Resolves deal acq/dispo/TC user IDs from client input without trusting arbitrary users:
 * - ADMIN: all assignees must exist and be active.
 * - REP: forced to own acq (non-DISPOSITIONS team) or dispo (DISPOSITIONS team); slots validated by team/role.
 * - Other roles: acq on ACQUISITIONS, dispo on DISPOSITIONS, TC must have TRANSACTION_COORDINATOR role.
 */
export async function resolveValidatedDealAssignments(
  prisma: PrismaClient,
  actor: DealActor,
  acqId: string,
  dispoId: string | null,
  tcId: string | null
): Promise<{ acqId: string; dispoId: string | null; tcId: string | null }> {
  let acq = acqId;
  let dispo = dispoId;
  let tc = tcId;

  if (actor.roleCode === "ADMIN") {
    const byId = await loadAssignmentUsers(prisma, acq, dispo, tc);
    const uniqueIds = new Set<string>([acq, ...(dispo ? [dispo] : []), ...(tc ? [tc] : [])]);
    if (byId.size !== uniqueIds.size) {
      throw new Error(INVALID_DEAL_ASSIGNMENT_MESSAGE);
    }
    return { acqId: acq, dispoId: dispo, tcId: tc };
  }

  let repTeam: TeamCode | undefined;
  if (actor.roleCode === "REP") {
    repTeam = await loadActorTeamCode(prisma, actor);
    if (repTeam === "DISPOSITIONS") {
      dispo = actor.id;
    } else {
      acq = actor.id;
    }
  }

  const byId = await loadAssignmentUsers(prisma, acq, dispo, tc);
  const uniqueIds = new Set<string>([acq, ...(dispo ? [dispo] : []), ...(tc ? [tc] : [])]);
  if (byId.size !== uniqueIds.size) {
    throw new Error(INVALID_DEAL_ASSIGNMENT_MESSAGE);
  }

  const acqUser = byId.get(acq);
  if (!acqUser || acqUser.teamCode !== "ACQUISITIONS") {
    throw new Error(INVALID_DEAL_ASSIGNMENT_MESSAGE);
  }
  if (dispo) {
    const d = byId.get(dispo);
    if (!d || d.teamCode !== "DISPOSITIONS") {
      throw new Error(INVALID_DEAL_ASSIGNMENT_MESSAGE);
    }
  }
  if (tc) {
    const t = byId.get(tc);
    if (!t || t.roleCode !== "TRANSACTION_COORDINATOR") {
      throw new Error(INVALID_DEAL_ASSIGNMENT_MESSAGE);
    }
  }

  if (actor.roleCode === "REP") {
    if (repTeam === "DISPOSITIONS") {
      if (dispo !== actor.id) throw new Error(INVALID_DEAL_ASSIGNMENT_MESSAGE);
    } else if (acq !== actor.id) {
      throw new Error(INVALID_DEAL_ASSIGNMENT_MESSAGE);
    }
  }

  return { acqId: acq, dispoId: dispo, tcId: tc };
}
