import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { guardApiSessionUser } from "@/lib/auth/api-route-guard";
import { getDealMetrics } from "@/features/deals/server/deals.service";
import { CACHE_TAGS } from "@/lib/cache/revalidation";

export async function GET() {
  const auth = await guardApiSessionUser();
  if (auth.ok === false) return auth.response;
  const actor = auth.user;

  const metrics = await unstable_cache(
    () => getDealMetrics(prisma, actor),
    ["deals:metrics", actor.id, actor.roleCode],
    { tags: [CACHE_TAGS.dealMetrics], revalidate: 180 }
  )();
  return NextResponse.json({ metrics });
}
