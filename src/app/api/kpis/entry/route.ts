import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActorWithTeamAndPermission } from "@/lib/auth/api-route-guard";

import { kpiUpsertSchema } from "@/features/kpis/schemas";
import { upsertKpiEntry } from "@/features/kpis/server/kpis.service";
import type { UpsertKpiEntryInput } from "@/features/kpis/server/kpis.service";
import type { KpiActor } from "@/features/kpis/server/kpi-scope";
import { revalidateKpiReads } from "@/lib/cache/revalidation";

export async function POST(req: Request) {
  const auth = await guardSessionActorWithTeamAndPermission("kpi:new_entry");
  if (auth.ok === false) return auth.response;
  const user = auth.user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = kpiUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const actor: KpiActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  try {
    const entry = await upsertKpiEntry(prisma, actor, parsed.data as UpsertKpiEntryInput);
    revalidateKpiReads();
    return NextResponse.json({ entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to upsert KPI entry";
    if (msg.toLowerCase().includes("forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (msg.toLowerCase().includes("locked")) {
      return NextResponse.json({ error: "Reporting period is locked" }, { status: 403 });
    }
    if (msg.toLowerCase().includes("invalid")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

