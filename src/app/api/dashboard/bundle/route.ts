import { NextResponse } from "next/server";
import { performance } from "node:perf_hooks";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActorWithTeam } from "@/lib/auth/api-route-guard";
import { getDashboardBundle } from "@/features/dashboard/server/dashboard-bundle";
import { isDashboardPerfEnabled } from "@/lib/perf/dashboard-perf";

export async function GET() {
  const auth = await guardSessionActorWithTeam();
  if (auth.ok === false) return auth.response;
  const user = auth.user;

  const perf = isDashboardPerfEnabled();
  const t0 = perf ? performance.now() : 0;

  const bundle = await getDashboardBundle(prisma, {
    id: user.id,
    roleCode: user.roleCode,
    teamCode: user.teamCode,
  });

  if (perf) {
    console.info(`[dashboard-perf] route /api/dashboard/bundle total: ${(performance.now() - t0).toFixed(1)}ms`);
  }

  return NextResponse.json({ bundle });
}
