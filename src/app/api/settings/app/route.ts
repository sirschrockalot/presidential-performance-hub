import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActor, guardSessionActorWithTeamAndPermission } from "@/lib/auth/api-route-guard";
import { getAppSettings, patchAppSettings } from "@/features/settings/server/app-settings.service";
import { appSettingsPatchSchema } from "@/features/settings/schemas/settings.schema";

export async function GET() {
  const auth = await guardSessionActor();
  if (auth.ok === false) return auth.response;

  try {
    const settings = await getAppSettings(prisma);
    return NextResponse.json({ settings });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await guardSessionActorWithTeamAndPermission("settings:admin_sections");
  if (auth.ok === false) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = appSettingsPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Provide at least one field to update" }, { status: 400 });
  }

  try {
    const settings = await patchAppSettings(prisma, parsed.data);
    return NextResponse.json({ settings });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update settings";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
