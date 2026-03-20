import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActorWithTeam } from "@/lib/auth/api-route-guard";

import { kpiEntriesQuerySchema } from "@/features/kpis/schemas";
import { getKpiWeekSummary } from "@/features/kpis/server/kpis.service";
import type { KpiActor } from "@/features/kpis/server/kpi-scope";
import { CACHE_TAGS } from "@/lib/cache/revalidation";

export async function GET(req: Request) {
  const auth = await guardSessionActorWithTeam();
  if (auth.ok === false) return auth.response;
  const user = auth.user;

  const { searchParams } = new URL(req.url);
  const raw = {
    team: searchParams.get("team"),
    weekStarting: searchParams.get("weekStarting") ?? undefined,
  };

  // summary requires a weekStarting; reuse and validate strictly.
  const parsed = kpiEntriesQuerySchema.safeParse(raw);
  if (!parsed.success || !parsed.data.weekStarting) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const actor: KpiActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const summary = await unstable_cache(
    () => getKpiWeekSummary(prisma, actor, parsed.data.team, parsed.data.weekStarting),
    ["kpis:summary", actor.id, actor.roleCode, actor.teamCode, parsed.data.team, parsed.data.weekStarting],
    { tags: [CACHE_TAGS.kpiSummary], revalidate: 120 }
  )();
  return NextResponse.json({ summary });
}

