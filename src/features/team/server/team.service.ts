import type { PrismaClient, TeamCode, UserRoleCode } from "@prisma/client";
import { USER_ROLE_CODE_TO_UI, TEAM_CODE_TO_UI } from "@/domain/prisma-enums";
import type { TeamMember } from "@/features/team/services/team.service";
import { writeAuditLog } from "@/lib/audit/audit-log";

export type TeamActor = {
  id: string;
  roleCode: UserRoleCode;
  teamCode: TeamCode;
};

function isoDate(d: Date): string {
  // Keep stable format for UI (YYYY-MM-DD).
  return d.toISOString().slice(0, 10);
}

export async function listTeamMembers(prisma: PrismaClient, actor: TeamActor): Promise<TeamMember[]> {
  // Scope visibility:
  // - Admin: all users
  // - Managers / TC: their current team only (reduces info leakage)
  // - Rep: only themselves
  const usersWhere =
    actor.roleCode === "ADMIN"
      ? {}
      : actor.roleCode === "REP"
        ? { id: actor.id, team: { code: actor.teamCode } }
        : { team: { code: actor.teamCode } };

  const users = await prisma.user.findMany({
    where: usersWhere,
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      joinedAt: true,
      role: { select: { code: true } },
      team: { select: { code: true } },
    },
    orderBy: { name: "asc" },
  });

  const userIds = users.map((u) => u.id);
  if (!userIds.length) return [];

  const [pointsAgg, drawAgg] = await Promise.all([
    prisma.pointEvent.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _sum: { points: true },
      _count: { _all: true },
    }),
    prisma.draw.groupBy({
      by: ["repId"],
      where: {
        repId: { in: userIds },
        status: { in: ["APPROVED", "PAID"] },
      },
      _sum: { remainingBalance: true },
    }),
  ]);

  const pointsByUserId = new Map(pointsAgg.map((g) => [g.userId, g._sum.points == null ? 0 : Number(g._sum.points)]));
  const drawBalanceByRepId = new Map(
    drawAgg.map((g) => [g.repId, g._sum.remainingBalance == null ? 0 : Number(g._sum.remainingBalance)])
  );

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: USER_ROLE_CODE_TO_UI[u.role.code] as any,
    team: TEAM_CODE_TO_UI[u.team.code] as any,
    active: u.active,
    joinedAt: isoDate(u.joinedAt),
    points: pointsByUserId.get(u.id) ?? 0,
    drawBalance: drawBalanceByRepId.get(u.id) ?? 0,
  }));
}

export async function adminUpdateUserStatusAndRole(
  prisma: PrismaClient,
  actor: TeamActor,
  targetUserId: string,
  input: { active?: boolean; roleCode?: UserRoleCode }
): Promise<{ member: TeamMember }> {
  if (actor.roleCode !== "ADMIN") throw new Error("Forbidden");

  const before = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      role: { select: { code: true } },
      team: { select: { code: true } },
    },
  });
  if (!before) throw new Error("Not found");

  const afterActive = input.active ?? before.active;
  const afterRoleCode = input.roleCode ?? before.role.code;

  const roleChanged = afterRoleCode !== before.role.code;
  const statusChanged = afterActive !== before.active;

  if (!roleChanged && !statusChanged) {
    const member = (await listTeamMembers(prisma, actor)).find((m) => m.id === targetUserId);
    if (!member) throw new Error("Failed to load user");
    return { member };
  }

  await prisma.$transaction(async (tx) => {
    let roleId = before.role.code;
    if (roleChanged) {
      const role = await tx.role.findUnique({ where: { code: afterRoleCode } });
      if (!role) throw new Error("Unknown role");
      roleId = role.code;

      await tx.user.update({
        where: { id: targetUserId },
        data: {
          active: afterActive,
          roleId: role.id,
        },
      });
    } else {
      await tx.user.update({
        where: { id: targetUserId },
        data: { active: afterActive },
      });
    }

    if (statusChanged) {
      await writeAuditLog(tx, {
        actorUserId: actor.id,
        action: "user.status_change",
        entityType: "user",
        entityId: targetUserId,
        metadata: {
          before: { active: before.active },
          after: { active: afterActive },
        },
      });
    }

    if (roleChanged) {
      await writeAuditLog(tx, {
        actorUserId: actor.id,
        action: "user.role_change",
        entityType: "user",
        entityId: targetUserId,
        metadata: {
          before: { roleCode: before.role.code },
          after: { roleCode: afterRoleCode },
        },
      });
    }
  });

  const member = (await listTeamMembers(prisma, { ...actor, roleCode: actor.roleCode, teamCode: actor.teamCode })).find(
    (m) => m.id === targetUserId
  );
  if (!member) throw new Error("Failed to load updated user");

  return { member };
}

