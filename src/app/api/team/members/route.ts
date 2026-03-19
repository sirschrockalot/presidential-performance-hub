import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { roleHasPermission } from "@/lib/auth/permissions";

import { listTeamMembers, createTeamMember } from "@/features/team/server/team.service";
import type { TeamActor } from "@/features/team/server/team.service";
import { teamMutationHttpStatus } from "@/features/team/server/team-http";
import { createTeamMemberSchema } from "@/features/team/schemas/team.schema";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roleCode || !user?.teamCode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actor: TeamActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const members = await listTeamMembers(prisma, actor);
  return NextResponse.json({ members });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.roleCode || !user?.teamCode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!roleHasPermission(user.roleCode, "team:add_member")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createTeamMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const actor: TeamActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };

  try {
    const member = await createTeamMember(prisma, actor, parsed.data);
    return NextResponse.json({ member }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create member";
    return NextResponse.json({ error: msg }, { status: teamMutationHttpStatus(msg) });
  }
}
