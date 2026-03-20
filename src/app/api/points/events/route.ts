import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActorWithTeam } from "@/lib/auth/api-route-guard";

import { listPointEvents } from "@/features/points/server/points.queries";
import { pointsEventsQuerySchema } from "@/features/points/schemas";

export async function GET(req: Request) {
  const auth = await guardSessionActorWithTeam();
  if (auth.ok === false) return auth.response;
  const user = auth.user;

  const { searchParams } = new URL(req.url);
  const parsed = pointsEventsQuerySchema.safeParse({
    repId: searchParams.get("repId") ?? undefined,
    year: searchParams.get("year") ?? undefined,
    month: searchParams.get("month") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const actor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const events = await listPointEvents(prisma, actor, parsed.data);
  return NextResponse.json({ events });
}

