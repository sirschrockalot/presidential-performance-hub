import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getApiSessionUser } from "@/lib/auth/require-api-user";
import { roleHasPermission } from "@/lib/auth/permissions";
import { listUsersForDealAssignment } from "@/features/deals/server/deals.service";

/** Active users for deal assignment dropdowns (create/edit). */
export async function GET() {
  const actor = await getApiSessionUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!roleHasPermission(actor.roleCode, "deal:create") && !roleHasPermission(actor.roleCode, "deal:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await listUsersForDealAssignment(prisma);
  return NextResponse.json({ users });
}
