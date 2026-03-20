import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActorWithTeam } from "@/lib/auth/api-route-guard";

import { listPointEvents, getRepPointsSummary } from "@/features/points/server/points.queries";
import { pointsEventsQuerySchema } from "@/features/points/schemas";

type RouteParams = { params: Promise<{ repId: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const auth = await guardSessionActorWithTeam();
  if (auth.ok === false) return auth.response;

  const { repId } = await params;
  if (!repId) return NextResponse.json({ error: "Bad Request" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const parsed = pointsEventsQuerySchema.safeParse({
    repId,
    year: searchParams.get("year") ?? undefined,
    month: searchParams.get("month") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const actor = auth.user;

  try {
    const summary = await getRepPointsSummary(prisma, actor, repId);
    const events = await listPointEvents(prisma, actor, parsed.data);
    return NextResponse.json({ summary, events });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw e;
  }
}

