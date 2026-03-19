import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

import type { DrawActor } from "@/features/draws/server/draw-scope";
import { listRepDrawHistory } from "@/features/draws/server/draws.service";
import { drawRepHistoryQuerySchema } from "@/features/draws/schemas";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const raw = { repId: searchParams.get("repId") ?? undefined };
  const parsed = drawRepHistoryQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const actor: DrawActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const history = await listRepDrawHistory(prisma, actor, parsed.data.repId ?? null);
  return NextResponse.json({ history });
}

