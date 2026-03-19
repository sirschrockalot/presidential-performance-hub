import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

import type { DrawActor } from "@/features/draws/server/draw-scope";
import { getDrawMetrics } from "@/features/draws/server/draws.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor: DrawActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const metrics = await getDrawMetrics(prisma, actor);
  return NextResponse.json({ metrics });
}

