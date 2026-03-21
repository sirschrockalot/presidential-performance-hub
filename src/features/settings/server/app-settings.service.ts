import type { PrismaClient } from "@prisma/client";

import {
  mergeAppSettingsPayload,
  type AppSettingsState,
  type AppSettingsPatch,
} from "@/features/settings/schemas/settings.schema";

export async function getAppSettings(prisma: PrismaClient): Promise<AppSettingsState> {
  let row = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  if (!row) {
    row = await prisma.appSettings.create({ data: { payload: {} } });
  }
  return mergeAppSettingsPayload(row.payload);
}

export async function patchAppSettings(prisma: PrismaClient, patch: AppSettingsPatch): Promise<AppSettingsState> {
  if (Object.keys(patch).length === 0) {
    throw new Error("Provide at least one field to update");
  }

  const currentRow = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  const currentPayload = mergeAppSettingsPayload(currentRow?.payload);
  const next: AppSettingsState = { ...currentPayload, ...patch };

  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", payload: next },
    update: { payload: next },
  });

  return next;
}
