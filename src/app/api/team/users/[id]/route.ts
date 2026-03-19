import { NextResponse } from "next/server";

import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

import type { TeamActor } from "@/features/team/server/team.service";
import { adminUpdateUserStatusAndRole } from "@/features/team/server/team.service";
import { UserRoleCode } from "@prisma/client";

const userIdParamSchema = z.string().min(1);

const updateUserAdminSchema = z
  .object({
    active: z.boolean().optional(),
    roleCode: z.nativeEnum(UserRoleCode).optional(),
  })
  .strict()
  .refine((v) => v.active !== undefined || v.roleCode !== undefined, {
    message: "Provide at least one of `active` or `roleCode`",
    path: [],
  });

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user?.roleCode || !user?.teamCode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.roleCode !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsedId = userIdParamSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateUserAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const actor: TeamActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };

  try {
    const updated = await adminUpdateUserStatusAndRole(prisma, actor, parsedId.data, parsed.data);
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update user";
    if (msg.toLowerCase().includes("forbidden")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (msg.toLowerCase().includes("not found")) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

