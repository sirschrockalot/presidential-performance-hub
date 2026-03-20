import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActorWithTeam } from "@/lib/auth/api-route-guard";
import { getDashboardOverview } from "@/features/dashboard/server/dashboard.analytics";
import { CACHE_TAGS } from "@/lib/cache/revalidation";

export async function GET() {
  const auth = await guardSessionActorWithTeam();
  if (auth.ok === false) return auth.response;
  const user = auth.user;

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

