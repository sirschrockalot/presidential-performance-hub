import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { roleHasPermission } from "@/lib/auth/permissions";
import { z } from "zod";

import type { DrawActor } from "@/features/draws/server/draw-scope";
import { listDrawRequestDeals } from "@/features/draws/server/draws.service";

const querySchema = z.object({
  repId: z.string().min(1),
});

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!roleHasPermission(user.roleCode, "draw:new_request")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ repId: searchParams.get("repId") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const actor: DrawActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const deals = await listDrawRequestDeals(prisma, actor, parsed.data.repId);
  return NextResponse.json({ deals });
}

