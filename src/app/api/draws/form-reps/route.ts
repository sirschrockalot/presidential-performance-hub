import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActorWithTeamAndPermission } from "@/lib/auth/api-route-guard";

import type { DrawActor } from "@/features/draws/server/draw-scope";
import { listDrawRequestReps } from "@/features/draws/server/draws.service";

import { z } from "zod";

const drawTeamQuerySchema = z.object({
  team: z.enum(["acquisitions", "dispositions"]).optional(),
});

export async function GET(req: Request) {
  const auth = await guardSessionActorWithTeamAndPermission("draw:new_request");
  if (auth.ok === false) return auth.response;
  const user = auth.user;

  const { searchParams } = new URL(req.url);
  const parsed = drawTeamQuerySchema.safeParse({ team: searchParams.get("team") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const actor: DrawActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const reps = await listDrawRequestReps(prisma, actor, parsed.data.team);
  return NextResponse.json({ reps });
}

