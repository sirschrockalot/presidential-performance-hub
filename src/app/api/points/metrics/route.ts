import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActorWithTeam } from "@/lib/auth/api-route-guard";

import { getPointsMetrics } from "@/features/points/server/points.queries";
import { CACHE_TAGS } from "@/lib/cache/revalidation";

export async function GET() {
  const auth = await guardSessionActorWithTeam();
  if (auth.ok === false) return auth.response;
  const user = auth.user;

  const actor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const metrics = await unstable_cache(
    () => getPointsMetrics(prisma, actor),
    ["points:metrics", actor.id, actor.roleCode, actor.teamCode ?? ""],
    { tags: [CACHE_TAGS.pointsMetrics], revalidate: 120 }
  )();
  return NextResponse.json({ metrics });
}

