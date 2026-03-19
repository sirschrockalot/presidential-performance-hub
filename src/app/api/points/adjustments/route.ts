import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { roleHasPermission } from "@/lib/auth/permissions";

import { pointsManualAdjustmentSchema } from "@/features/points/schemas";
import { createManualPointAdjustment } from "@/features/points/server/points.queries";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!roleHasPermission(user.roleCode, "points:manual_adjust")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = pointsManualAdjustmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const actor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  try {
    const created = await createManualPointAdjustment(prisma, actor, parsed.data as {
      recipientUserId: string;
      points: number;
      reason: string;
      dealId?: string | null;
    });
    return NextResponse.json({ adjustmentId: created.adjustmentId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create points adjustment";
    return NextResponse.json({ error: msg }, { status: msg.toLowerCase().includes("forbidden") ? 403 : 400 });
  }
}

