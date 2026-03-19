import type { PrismaClient, Prisma, TeamCode, UserRoleCode } from "@prisma/client";
import bcrypt from "bcryptjs";

import { USER_ROLE_CODE_TO_UI, TEAM_CODE_TO_UI } from "@/domain/prisma-enums";
import type { TeamMemberDto } from "@/features/team/types/team.types";
import type { UserRole, Team } from "@/types";
import { writeAuditLog } from "@/lib/audit/audit-log";

export type TeamActor = {
  id: string;
  roleCode: UserRoleCode;
  teamCode: TeamCode;
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function canAccessUser(actor: TeamActor, target: { id: string; teamCode: TeamCode }): boolean {
  if (actor.roleCode === "ADMIN") return true;
  if (actor.roleCode === "REP") return actor.id === target.id;
  return target.teamCode === actor.teamCode;
}

async function mapUsersToMembers(
  prisma: PrismaClient,
  users: Array<{
    id: string;
    name: string;
    email: string;
    active: boolean;
    joinedAt: Date;
    role: { code: UserRoleCode };
    team: { code: TeamCode };
  }>
): Promise<TeamMemberDto[]> {
  const userIds = users.map((u) => u.id);
  if (!userIds.length) return [];

  const [pointsAgg, drawAgg] = await Promise.all([
    prisma.pointEvent.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _sum: { points: true },
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
    role: USER_ROLE_CODE_TO_UI[u.role.code] as UserRole,
    team: TEAM_CODE_TO_UI[u.team.code] as Team,
    active: u.active,
    joinedAt: isoDate(u.joinedAt),
    points: pointsByUserId.get(u.id) ?? 0,
    drawBalance: drawBalanceByRepId.get(u.id) ?? 0,
  }));
}

export async function listTeamMembers(prisma: PrismaClient, actor: TeamActor): Promise<TeamMemberDto[]> {
  const usersWhere: Prisma.UserWhereInput =
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

  return mapUsersToMembers(prisma, users);
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  active: true,
  joinedAt: true,
  role: { select: { code: true } },
  team: { select: { code: true } },
} as const;

export async function getTeamMemberById(
  prisma: PrismaClient,
  actor: TeamActor,
  targetUserId: string
): Promise<TeamMemberDto | null> {
  const u = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { ...userSelect, team: { select: { code: true } } },
  });
  if (!u) return null;
  if (!canAccessUser(actor, { id: u.id, teamCode: u.team.code })) return null;

  const [m] = await mapUsersToMembers(prisma, [u]);
  return m ?? null;
}

export type CreateTeamMemberServiceInput = {
  name: string;
  email: string;
  password: string;
  roleCode: UserRoleCode;
  teamCode: TeamCode;
};

export async function createTeamMember(
  prisma: PrismaClient,
  actor: TeamActor,
  input: CreateTeamMemberServiceInput
): Promise<TeamMemberDto> {
  const email = input.email.toLowerCase().trim();

  if (actor.roleCode !== "ADMIN" && input.roleCode === "ADMIN") {
    throw new Error("Forbidden");
  }

  let teamCode = input.teamCode;
  if (actor.roleCode !== "ADMIN") {
    if (actor.roleCode !== "ACQUISITIONS_MANAGER" && actor.roleCode !== "DISPOSITIONS_MANAGER") {
      throw new Error("Forbidden");
    }
    teamCode = actor.teamCode;
    if (input.teamCode !== actor.teamCode) {
      throw new Error("You can only add members to your assigned team");
    }
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new Error("Email already in use");

  const [roleRow, teamRow] = await Promise.all([
    prisma.role.findUnique({ where: { code: input.roleCode } }),
    prisma.team.findUnique({ where: { code: teamCode } }),
  ]);
  if (!roleRow) throw new Error("Unknown role");
  if (!teamRow) throw new Error("Unknown team");

  const passwordHash = await bcrypt.hash(input.password, 12);

  const created = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      active: true,
      passwordHash,
      roleId: roleRow.id,
      teamId: teamRow.id,
    },
    select: userSelect,
  });

  await writeAuditLog(prisma, {
    actorUserId: actor.id,
    action: "user.create",
    entityType: "user",
    entityId: created.id,
    metadata: {
      email: created.email,
      roleCode: input.roleCode,
      teamCode,
    },
  });

  const [m] = await mapUsersToMembers(prisma, [created]);
  if (!m) throw new Error("Failed to load created user");
  return m;
}

export type AdminPatchUserInput = {
  active?: boolean;
  roleCode?: UserRoleCode;
  name?: string;
  email?: string;
  teamCode?: TeamCode;
};

export async function adminPatchTeamUser(
  prisma: PrismaClient,
  actor: TeamActor,
  targetUserId: string,
  input: AdminPatchUserInput
): Promise<{ member: TeamMemberDto }> {
  if (actor.roleCode !== "ADMIN") throw new Error("Forbidden");

  const before = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      joinedAt: true,
      role: { select: { code: true, id: true } },
      team: { select: { code: true, id: true } },
    },
  });
  if (!before) throw new Error("Not found");

  const nextEmail = input.email !== undefined ? input.email.toLowerCase().trim() : before.email;
  if (nextEmail !== before.email) {
    const clash = await prisma.user.findFirst({
      where: { email: nextEmail, NOT: { id: targetUserId } },
      select: { id: true },
    });
    if (clash) throw new Error("Email already in use");
  }

  const afterActive = input.active ?? before.active;
  const afterRoleCode = input.roleCode ?? before.role.code;
  const afterName = input.name !== undefined ? input.name.trim() : before.name;
  const afterTeamCode = input.teamCode ?? before.team.code;

  let nextRoleId = before.role.id;
  let nextTeamId = before.team.id;

  if (input.roleCode !== undefined && afterRoleCode !== before.role.code) {
    const role = await prisma.role.findUnique({ where: { code: afterRoleCode } });
    if (!role) throw new Error("Unknown role");
    nextRoleId = role.id;
  }

  if (input.teamCode !== undefined && afterTeamCode !== before.team.code) {
    const team = await prisma.team.findUnique({ where: { code: afterTeamCode } });
    if (!team) throw new Error("Unknown team");
    nextTeamId = team.id;
  }

  const roleChanged = nextRoleId !== before.role.id;
  const teamChanged = nextTeamId !== before.team.id;
  const statusChanged = afterActive !== before.active;
  const nameChanged = afterName !== before.name;
  const emailChanged = nextEmail !== before.email;

  if (!roleChanged && !teamChanged && !statusChanged && !nameChanged && !emailChanged) {
    const member = await getTeamMemberById(prisma, actor, targetUserId);
    if (!member) throw new Error("Failed to load user");
    return { member };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: {
        active: afterActive,
        name: afterName,
        email: nextEmail,
        roleId: nextRoleId,
        teamId: nextTeamId,
      },
    });

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

    if (teamChanged) {
      await writeAuditLog(tx, {
        actorUserId: actor.id,
        action: "user.team_change",
        entityType: "user",
        entityId: targetUserId,
        metadata: {
          before: { teamCode: before.team.code },
          after: { teamCode: afterTeamCode },
        },
      });
    }

    if (nameChanged || emailChanged) {
      await writeAuditLog(tx, {
        actorUserId: actor.id,
        action: "user.profile_update",
        entityType: "user",
        entityId: targetUserId,
        metadata: {
          nameChanged,
          emailChanged,
        },
      });
    }
  });

  const member = await getTeamMemberById(prisma, actor, targetUserId);
  if (!member) throw new Error("Failed to load updated user");
  return { member };
}

/** @deprecated Use adminPatchTeamUser */
export async function adminUpdateUserStatusAndRole(
  prisma: PrismaClient,
  actor: TeamActor,
  targetUserId: string,
  input: { active?: boolean; roleCode?: UserRoleCode }
): Promise<{ member: TeamMemberDto }> {
  return adminPatchTeamUser(prisma, actor, targetUserId, input);
}
