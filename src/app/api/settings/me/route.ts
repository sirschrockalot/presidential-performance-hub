import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActor } from "@/lib/auth/api-route-guard";
import { getUserPreferences, patchUserPreferences } from "@/features/settings/server/user-preferences.service";
import { userPreferencesPatchSchema } from "@/features/settings/schemas/settings.schema";

export async function GET() {
  const auth = await guardSessionActor();
  if (auth.ok === false) return auth.response;

  try {
    const preferences = await getUserPreferences(prisma, auth.user.id);
    return NextResponse.json({ preferences });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load preferences";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await guardSessionActor();
  if (auth.ok === false) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = userPreferencesPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const preferences = await patchUserPreferences(prisma, auth.user.id, parsed.data);
    return NextResponse.json({ preferences });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update preferences";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
