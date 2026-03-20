import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActorWithTeam } from "@/lib/auth/api-route-guard";
import { weekStartingSchema } from "@/features/kpis/schemas";
import { getKpiPageBundle } from "@/features/kpis/server/kpi-page-bundle";
import type { KpiActor } from "@/features/kpis/server/kpi-scope";
import type { Team } from "@/types";

const kpiPageBundleQuerySchema = z.object({
  team: z.enum(["acquisitions", "dispositions"]),
  weekStarting: weekStartingSchema,
});

export async function GET(req: Request) {
  const auth = await guardSessionActorWithTeam();
  if (auth.ok === false) return auth.response;
  const user = auth.user;

  const { searchParams } = new URL(req.url);
  const raw = {
    team: searchParams.get("team"),
    weekStarting: searchParams.get("weekStarting") ?? undefined,
  };

  const parsed = kpiPageBundleQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const actor: KpiActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const bundle = await getKpiPageBundle(prisma, actor, parsed.data as { team: Team; weekStarting: string });

  return NextResponse.json({ bundle });
}
