import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

import { kpiTeamQuerySchema } from "@/features/kpis/schemas";
import { listKpiWeeks } from "@/features/kpis/server/kpis.service";
import type { KpiActor } from "@/features/kpis/server/kpi-scope";
import { CACHE_TAGS } from "@/lib/cache/revalidation";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user?.roleCode || !user?.teamCode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const raw = { team: searchParams.get("team") };
  const parsed = kpiTeamQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const actor: KpiActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const weeks = await unstable_cache(
    () => listKpiWeeks(prisma, actor, parsed.data.team),
    ["kpis:weeks", actor.id, actor.roleCode, actor.teamCode, parsed.data.team],
    { tags: [CACHE_TAGS.kpiWeeks], revalidate: 300 }
  )();
  return NextResponse.json({ weeks });
}

