import type { PrismaClient } from "@prisma/client";

import {
  mergeUserPreferences,
  type UserPreferencesState,
  type UserPreferencesPatch,
} from "@/features/settings/schemas/settings.schema";

export async function getUserPreferences(prisma: PrismaClient, userId: string): Promise<UserPreferencesState> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });
  return mergeUserPreferences(u?.preferences);
}

export async function patchUserPreferences(
  prisma: PrismaClient,
  userId: string,
  patch: UserPreferencesPatch
): Promise<UserPreferencesState> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });
  const current = mergeUserPreferences(u?.preferences);
  const next: UserPreferencesState = {
    theme: patch.theme ?? current.theme,
    notifications: {
      ...current.notifications,
      ...(patch.notifications ?? {}),
    },
  };

  await prisma.user.update({
    where: { id: userId },
    data: { preferences: next },
  });

  return next;
}
