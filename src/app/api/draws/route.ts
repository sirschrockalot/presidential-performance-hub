import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import {
  guardSessionActorWithTeam,
  guardSessionActorWithTeamAndPermission,
} from "@/lib/auth/api-route-guard";

import type { DrawActor } from "@/features/draws/server/draw-scope";
import { listDraws, createDrawRequest } from "@/features/draws/server/draws.service";
import type { CreateDrawInput } from "@/features/draws/server/draws.service";

import { drawIdParamSchema, drawListQuerySchema, drawRequestSchema } from "@/features/draws/schemas";
import { revalidateDrawReads } from "@/lib/cache/revalidation";

function classifyDrawErrorStatus(message: string): number {
  const text = message.toLowerCase();
  if (text.includes("forbidden")) return 403;
  if (text.includes("not found")) return 404;
  return 400;
}

export async function GET(req: Request) {
  const auth = await guardSessionActorWithTeam();
  if (auth.ok === false) return auth.response;
  const user = auth.user;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const parsed = drawListQuerySchema.safeParse({ status });
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const actor: DrawActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const draws = await listDraws(prisma, actor, parsed.data.status ?? "all");
  return NextResponse.json({ draws });
}

export async function POST(req: Request) {
  const auth = await guardSessionActorWithTeamAndPermission("draw:new_request");
  if (auth.ok === false) return auth.response;
  const user = auth.user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = drawRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const actor: DrawActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const input: CreateDrawInput = parsed.data;

  try {
    const entry = await createDrawRequest(prisma, actor, input);
    revalidateDrawReads();
    return NextResponse.json({ draw: entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create draw";
    return NextResponse.json({ error: msg }, { status: classifyDrawErrorStatus(msg) });
  }
}

