import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { getApiSessionUser } from "@/lib/auth/require-api-user";
import { getDealMetrics } from "@/features/deals/server/deals.service";
import { CACHE_TAGS } from "@/lib/cache/revalidation";

export async function GET() {
  const actor = await getApiSessionUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const metrics = await unstable_cache(
    () => getDealMetrics(prisma, actor),
    ["deals:metrics", actor.id, actor.roleCode],
    { tags: [CACHE_TAGS.dealMetrics], revalidate: 180 }
  )();
  return NextResponse.json({ metrics });
}
