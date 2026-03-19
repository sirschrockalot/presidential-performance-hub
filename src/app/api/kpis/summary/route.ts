import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

import { kpiEntriesQuerySchema } from "@/features/kpis/schemas";
import { getKpiWeekSummary } from "@/features/kpis/server/kpis.service";
import type { KpiActor } from "@/features/kpis/server/kpi-scope";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user?.roleCode || !user?.teamCode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const summary = await getKpiWeekSummary(prisma, actor, parsed.data.team, parsed.data.weekStarting);
  return NextResponse.json({ summary });
}

