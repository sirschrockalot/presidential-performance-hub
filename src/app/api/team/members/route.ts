import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActorWithTeam, guardSessionActorWithTeamAndPermission } from "@/lib/auth/api-route-guard";

import { listTeamMembers, createTeamMember } from "@/features/team/server/team.service";
import type { TeamActor } from "@/features/team/server/team.service";
import { teamMutationHttpStatus } from "@/features/team/server/team-http";
import { createTeamMemberSchema } from "@/features/team/schemas/team.schema";

export async function GET() {
  const auth = await guardSessionActorWithTeam();
  if (auth.ok === false) return auth.response;

  const actor: TeamActor = auth.user;
  const members = await listTeamMembers(prisma, actor);
  return NextResponse.json({ members });
}

export async function POST(req: Request) {
  const teamAuth = await guardSessionActorWithTeamAndPermission("team:add_member");
  if (teamAuth.ok === false) return teamAuth.response;

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

  const actor: TeamActor = teamAuth.user;

  try {
    const member = await createTeamMember(prisma, actor, parsed.data);
    return NextResponse.json({ member }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create member";
    return NextResponse.json({ error: msg }, { status: teamMutationHttpStatus(msg) });
  }
}
