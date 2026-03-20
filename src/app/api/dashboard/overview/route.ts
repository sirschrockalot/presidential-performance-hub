import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDashboardOverview } from "@/features/dashboard/server/dashboard.analytics";
import { CACHE_TAGS } from "@/lib/cache/revalidation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roleCode || !user?.teamCode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const overview = await unstable_cache(
    () =>
      getDashboardOverview(prisma, {
        id: user.id,
        roleCode: user.roleCode,
        teamCode: user.teamCode,
      }),
    ["dashboard:overview", user.id, user.roleCode, user.teamCode],
    { tags: [CACHE_TAGS.dashboard], revalidate: 120 }
  )();

  return NextResponse.json({ overview });
}

