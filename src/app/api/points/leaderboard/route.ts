import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

import { getPointsLeaderboard } from "@/features/points/server/points.queries";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const leaderboard = await getPointsLeaderboard(prisma, actor);
  return NextResponse.json({ leaderboard });
}

