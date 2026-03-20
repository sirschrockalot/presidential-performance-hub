import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActorWithTeamAndPermission } from "@/lib/auth/api-route-guard";

import { listPointRecipientsForManualAdjustment } from "@/features/points/server/points.queries";

export async function GET() {
  const auth = await guardSessionActorWithTeamAndPermission("points:manual_adjust");
  if (auth.ok === false) return auth.response;
  const user = auth.user;

  const actor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const recipients = await listPointRecipientsForManualAdjustment(prisma, actor);
  return NextResponse.json({ recipients });
}

