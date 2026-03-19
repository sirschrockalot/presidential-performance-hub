import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { roleHasPermission } from "@/lib/auth/permissions";

import { kpiTeamQuerySchema, weekStartingSchema } from "@/features/kpis/schemas";
import { listKpiTargetsForTeam, upsertKpiTargets } from "@/features/kpis/server/kpis.service";
import type { KpiActor } from "@/features/kpis/server/kpi-scope";
import { z } from "zod";

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
  const targets = await listKpiTargetsForTeam(prisma, actor, parsed.data.team);
  return NextResponse.json({ targets });
}

const kpiMetricKeySchema = z.enum([
  "DIALS",
  "TALK_TIME_MINUTES",
  "LEADS_WORKED",
  "OFFERS_MADE",
  "CONTRACTS_SIGNED",
  "FALLOUT_COUNT",
  "REVENUE_FROM_FUNDED",
  "BUYER_CONVERSATIONS",
  "PROPERTIES_MARKETED",
  "EMDS_RECEIVED",
  "ASSIGNMENTS_SECURED",
  "AVG_ASSIGNMENT_FEE",
]);

const kpiTargetsUpsertSchema = z.object({
  team: z.enum(["acquisitions", "dispositions"]),
  reportingPeriodStart: weekStartingSchema.optional().nullable(),
  // z.record doesn't expose `.nonempty()`; enforce emptiness via refine.
  targets: z.record(kpiMetricKeySchema, z.coerce.number().min(0)).refine((v) => Object.keys(v).length > 0, {
    message: "targets must not be empty",
  }),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.roleCode || !user?.teamCode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!roleHasPermission(user.roleCode, "settings:admin_sections")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = kpiTargetsUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const actor: KpiActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };

  try {
    const updated = await upsertKpiTargets(prisma, actor, {
      team: parsed.data.team,
      reportingPeriodStart: parsed.data.reportingPeriodStart ?? null,
      targets: parsed.data.targets,
    });
    return NextResponse.json({ targets: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update KPI targets";
    if (msg.toLowerCase().includes("locked")) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    if (msg.toLowerCase().includes("forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

