import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActorWithTeamAndPermission } from "@/lib/auth/api-route-guard";

import { pointsManualAdjustmentSchema } from "@/features/points/schemas";
import { createManualPointAdjustment } from "@/features/points/server/points.queries";
import { revalidatePointsReads } from "@/lib/cache/revalidation";

export async function POST(req: Request) {
  const auth = await guardSessionActorWithTeamAndPermission("points:manual_adjust");
  if (auth.ok === false) return auth.response;
  const user = auth.user;

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
    revalidatePointsReads();
    return NextResponse.json({ adjustmentId: created.adjustmentId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create points adjustment";
    return NextResponse.json({ error: msg }, { status: msg.toLowerCase().includes("forbidden") ? 403 : 400 });
  }
}

