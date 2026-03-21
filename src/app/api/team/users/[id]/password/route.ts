import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActorWithTeamAndPermission } from "@/lib/auth/api-route-guard";
import type { TeamActor } from "@/features/team/server/team.service";
import { adminSetUserPassword } from "@/features/auth/server/password.service";
import { passwordMutationHttpStatus } from "@/features/auth/server/password-http";
import { adminSetUserPasswordSchema } from "@/features/auth/schemas/password.schema";
import { teamMemberIdParamSchema } from "@/features/team/schemas/team.schema";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  const auth = await guardSessionActorWithTeamAndPermission("settings:admin_sections");
  if (auth.ok === false) return auth.response;

  const { id } = await params;
  const parsedId = teamMemberIdParamSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid user id", details: parsedId.error.flatten() }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = adminSetUserPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const actor: TeamActor = { id: auth.user.id, roleCode: auth.user.roleCode, teamCode: auth.user.teamCode };

  try {
    await adminSetUserPassword(prisma, actor, parsedId.data, parsed.data.newPassword);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to set password";
    return NextResponse.json({ error: msg }, { status: passwordMutationHttpStatus(msg) });
  }
}
