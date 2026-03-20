import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { getApiSessionUser } from "@/lib/auth/require-api-user";
import { roleHasPermission } from "@/lib/auth/permissions";
import { listUsersForDealAssignment } from "@/features/deals/server/deals.service";
import { CACHE_TAGS } from "@/lib/cache/revalidation";

/** Active users for deal assignment dropdowns (create/edit). */
export async function GET() {
  const actor = await getApiSessionUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!roleHasPermission(actor.roleCode, "deal:create") && !roleHasPermission(actor.roleCode, "deal:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await unstable_cache(
    () => listUsersForDealAssignment(prisma),
    ["deals:form-users"],
    { tags: [CACHE_TAGS.dealFormUsers], revalidate: 3600 }
  )();
  return NextResponse.json({ users });
}
