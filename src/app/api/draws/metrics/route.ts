import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActorWithTeam } from "@/lib/auth/api-route-guard";

import type { DrawActor } from "@/features/draws/server/draw-scope";
import { getDrawMetrics } from "@/features/draws/server/draws.service";
import { CACHE_TAGS } from "@/lib/cache/revalidation";

export async function GET() {
  const auth = await guardSessionActorWithTeam();
  if (auth.ok === false) return auth.response;
  const user = auth.user;

  const actor: DrawActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const metrics = await unstable_cache(
    () => getDrawMetrics(prisma, actor),
    ["draws:metrics", actor.id, actor.roleCode, actor.teamCode],
    { tags: [CACHE_TAGS.drawMetrics], revalidate: 120 }
  )();
  return NextResponse.json({ metrics });
}

