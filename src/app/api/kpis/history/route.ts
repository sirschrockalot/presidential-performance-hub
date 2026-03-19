import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

import { kpiHistoryQuerySchema } from "@/features/kpis/schemas";
import { listKpiHistory } from "@/features/kpis/server/kpis.service";
import type { KpiActor } from "@/features/kpis/server/kpi-scope";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user?.roleCode || !user?.teamCode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const raw = {
    team: searchParams.get("team"),
    repUserId: searchParams.get("repUserId") ?? undefined,
  };

  const parsed = kpiHistoryQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const actor: KpiActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const history = await listKpiHistory(prisma, actor, parsed.data.team, parsed.data.repUserId);
  return NextResponse.json({ history });
}

