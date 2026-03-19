import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { roleHasPermission } from "@/lib/auth/permissions";

import type { DrawActor } from "@/features/draws/server/draw-scope";
import { listDraws, createDrawRequest } from "@/features/draws/server/draws.service";
import type { CreateDrawInput } from "@/features/draws/server/draws.service";

import { drawIdParamSchema, drawListQuerySchema, drawRequestSchema } from "@/features/draws/schemas";

function classifyDrawErrorStatus(message: string): number {
  const text = message.toLowerCase();
  if (text.includes("forbidden")) return 403;
  if (text.includes("not found")) return 404;
  return 400;
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!roleHasPermission(user.roleCode, "draw:new_request")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
    return NextResponse.json({ draw: entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create draw";
    return NextResponse.json({ error: msg }, { status: classifyDrawErrorStatus(msg) });
  }
}

