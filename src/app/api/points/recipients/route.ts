import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { roleHasPermission } from "@/lib/auth/permissions";

import { listPointRecipientsForManualAdjustment } from "@/features/points/server/points.queries";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!roleHasPermission(user.roleCode, "points:manual_adjust")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const recipients = await listPointRecipientsForManualAdjustment(prisma, actor);
  return NextResponse.json({ recipients });
}

