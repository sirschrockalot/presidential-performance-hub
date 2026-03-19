import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { roleHasPermission } from "@/lib/auth/permissions";

import type { DrawActor } from "@/features/draws/server/draw-scope";
import { listDrawRequestReps } from "@/features/draws/server/draws.service";
import { kpiTeamQuerySchema } from "@/features/kpis/schemas";

import { z } from "zod";

const drawTeamQuerySchema = z.object({
  team: z.enum(["acquisitions", "dispositions"]).optional(),
});

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!roleHasPermission(user.roleCode, "draw:new_request")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = drawTeamQuerySchema.safeParse({ team: searchParams.get("team") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const actor: DrawActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const reps = await listDrawRequestReps(prisma, actor, parsed.data.team);
  return NextResponse.json({ reps });
}

