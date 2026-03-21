import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import type { TeamActor } from "@/features/team/server/team.service";
import { writeAuditLog } from "@/lib/audit/audit-log";

const BCRYPT_ROUNDS = 12;

export async function changeOwnPassword(
  prisma: PrismaClient,
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (newPassword === currentPassword) {
    throw new Error("New password must be different from your current password");
  }

  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, active: true },
  });
  if (!row?.active) throw new Error("Forbidden");
  if (!row.passwordHash) {
    throw new Error("Password sign-in is not set up for this account");
  }

  const match = await bcrypt.compare(currentPassword, row.passwordHash);
  if (!match) throw new Error("Current password is incorrect");

  const nextHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash: nextHash },
    });
    await writeAuditLog(tx, {
      actorUserId: userId,
      action: "user.password_change",
      entityType: "user",
      entityId: userId,
      metadata: { self: true },
    });
  });
}

export async function adminSetUserPassword(
  prisma: PrismaClient,
  actor: TeamActor,
  targetUserId: string,
  newPassword: string
): Promise<void> {
  if (actor.roleCode !== "ADMIN") throw new Error("Forbidden");

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  if (!target) throw new Error("Not found");

  const nextHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: { passwordHash: nextHash },
    });
    await writeAuditLog(tx, {
      actorUserId: actor.id,
      action: "user.password_reset",
      entityType: "user",
      entityId: targetUserId,
      metadata: { targetUserId },
    });
  });
}
