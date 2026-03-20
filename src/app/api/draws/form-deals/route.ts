import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActorWithTeamAndPermission } from "@/lib/auth/api-route-guard";
import { z } from "zod";

import type { DrawActor } from "@/features/draws/server/draw-scope";
import { listDrawRequestDeals } from "@/features/draws/server/draws.service";

const querySchema = z.object({
  repId: z.string().min(1),
});

export async function GET(req: Request) {
  const auth = await guardSessionActorWithTeamAndPermission("draw:new_request");
  if (auth.ok === false) return auth.response;
  const user = auth.user;

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ repId: searchParams.get("repId") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const actor: DrawActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const deals = await listDrawRequestDeals(prisma, actor, parsed.data.repId);
  return NextResponse.json({ deals });
}

