import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { guardApiSessionUserWithAnyPermission } from "@/lib/auth/api-route-guard";
import { listUsersForDealAssignment } from "@/features/deals/server/deals.service";
import { CACHE_TAGS } from "@/lib/cache/revalidation";

/** Active users for deal assignment dropdowns (create/edit). */
export async function GET() {
  const auth = await guardApiSessionUserWithAnyPermission(["deal:create", "deal:edit"]);
  if (auth.ok === false) return auth.response;
  const actor = auth.user;

  const users = await unstable_cache(
    () => listUsersForDealAssignment(prisma, actor),
    ["deals:form-users", actor.id, actor.roleCode, actor.teamCode ?? ""],
    { tags: [CACHE_TAGS.dealFormUsers], revalidate: 3600 }
  )();
  return NextResponse.json({ users });
}
