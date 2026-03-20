import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import {
  guardSessionActorWithTeam,
  guardSessionActorWithTeamAndPermission,
} from "@/lib/auth/api-route-guard";

import { kpiTeamQuerySchema, weekStartingSchema } from "@/features/kpis/schemas";
import { listKpiTargetsForTeam, upsertKpiTargets } from "@/features/kpis/server/kpis.service";
import type { KpiActor } from "@/features/kpis/server/kpi-scope";
import { z } from "zod";
import { CACHE_TAGS, revalidateKpiReads, revalidateKpiTargetsAndUsers } from "@/lib/cache/revalidation";

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
  const targets = await unstable_cache(
    () => listKpiTargetsForTeam(prisma, actor, parsed.data.team),
    ["kpis:targets", actor.id, actor.roleCode, actor.teamCode, parsed.data.team],
    { tags: [CACHE_TAGS.kpiTargets], revalidate: 3600 }
  )();
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
  const auth = await guardSessionActorWithTeamAndPermission("settings:admin_sections");
  if (auth.ok === false) return auth.response;
  const user = auth.user;

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
    revalidateKpiTargetsAndUsers();
    revalidateKpiReads();
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

