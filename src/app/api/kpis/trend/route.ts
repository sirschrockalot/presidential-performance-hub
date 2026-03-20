import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActorWithTeam } from "@/lib/auth/api-route-guard";

import { kpiTeamQuerySchema } from "@/features/kpis/schemas";
import { getKpiTrend } from "@/features/kpis/server/kpis.service";
import type { KpiActor } from "@/features/kpis/server/kpi-scope";
import { CACHE_TAGS } from "@/lib/cache/revalidation";

export async function GET(req: Request) {
  const auth = await guardSessionActorWithTeam();
  if (auth.ok === false) return auth.response;
  const user = auth.user;

  const { searchParams } = new URL(req.url);
  const raw = { team: searchParams.get("team") };
  const parsed = kpiTeamQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const actor: KpiActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const trend = await unstable_cache(
    () => getKpiTrend(prisma, actor, parsed.data.team),
    ["kpis:trend", actor.id, actor.roleCode, actor.teamCode, parsed.data.team],
    { tags: [CACHE_TAGS.kpiTrend], revalidate: 300 }
  )();
  return NextResponse.json({ trend });
}

