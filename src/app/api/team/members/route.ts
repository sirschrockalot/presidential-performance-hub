import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

import { listTeamMembers } from "@/features/team/server/team.service";
import type { TeamActor } from "@/features/team/server/team.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roleCode || !user?.teamCode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actor: TeamActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const members = await listTeamMembers(prisma, actor);
  return NextResponse.json({ members });
}

