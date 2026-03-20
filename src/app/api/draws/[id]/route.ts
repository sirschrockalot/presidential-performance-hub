import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import {
  guardSessionActorWithTeam,
  guardSessionActorWithTeamAndPermission,
} from "@/lib/auth/api-route-guard";

import { drawIdParamSchema, drawUpdateSchema } from "@/features/draws/schemas";
import type { DrawActor } from "@/features/draws/server/draw-scope";
import { getDrawById, updateDrawStatus } from "@/features/draws/server/draws.service";
import { revalidateDrawReads } from "@/lib/cache/revalidation";
import type { UpdateDrawStatusInput } from "@/features/draws/server/draws.service";

type RouteParams = { params: Promise<{ id: string }> };

function classifyDrawErrorStatus(message: string): number {
  const text = message.toLowerCase();
  if (text.includes("forbidden")) return 403;
  if (text.includes("not found")) return 404;
  return 400;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await guardSessionActorWithTeam();
  if (auth.ok === false) return auth.response;
  const user = auth.user;

  const { id } = await params;
  const parsedId = drawIdParamSchema.parse({ id });
  const actor: DrawActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const draw = await getDrawById(prisma, actor, parsedId.id);
  if (!draw) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ draw });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await guardSessionActorWithTeamAndPermission("draw:approve");
  if (auth.ok === false) return auth.response;
  const user = auth.user;

  const { id } = await params;
  const parsedId = drawIdParamSchema.parse({ id });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = drawUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const actor: DrawActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const input: UpdateDrawStatusInput = parsed.data;

  try {
    const draw = await updateDrawStatus(prisma, actor, parsedId.id, input);
    if (!draw) return NextResponse.json({ error: "Not found" }, { status: 404 });
    revalidateDrawReads();
    return NextResponse.json({ draw });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update draw";
    return NextResponse.json({ error: msg }, { status: classifyDrawErrorStatus(msg) });
  }
}

