import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActorWithTeam } from "@/lib/auth/api-route-guard";

import { getPointsLeaderboard } from "@/features/points/server/points.queries";
import { CACHE_TAGS } from "@/lib/cache/revalidation";

export async function GET() {
  const auth = await guardSessionActorWithTeam();
  if (auth.ok === false) return auth.response;
  const user = auth.user;

  const actor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const leaderboard = await unstable_cache(
    () => getPointsLeaderboard(prisma, actor),
    ["points:leaderboard", actor.id, actor.roleCode, actor.teamCode ?? ""],
    { tags: [CACHE_TAGS.pointsLeaderboard], revalidate: 120 }
  )();
  return NextResponse.json({ leaderboard });
}

