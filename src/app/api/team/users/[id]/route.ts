import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

import type { TeamActor } from "@/features/team/server/team.service";
import { getTeamMemberById, adminPatchTeamUser } from "@/features/team/server/team.service";
import { teamMutationHttpStatus } from "@/features/team/server/team-http";
import { adminPatchTeamUserSchema, teamMemberIdParamSchema } from "@/features/team/schemas/team.schema";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user?.roleCode || !user?.teamCode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsedId = teamMemberIdParamSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid user id", details: parsedId.error.flatten() }, { status: 400 });
  }

  const actor: TeamActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const member = await getTeamMemberById(prisma, actor, parsedId.data);
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ member });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user?.roleCode || !user?.teamCode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.roleCode !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  const parsed = adminPatchTeamUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const actor: TeamActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };

  try {
    const { member } = await adminPatchTeamUser(prisma, actor, parsedId.data, parsed.data);
    return NextResponse.json({ member });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update user";
    return NextResponse.json({ error: msg }, { status: teamMutationHttpStatus(msg) });
  }
}
