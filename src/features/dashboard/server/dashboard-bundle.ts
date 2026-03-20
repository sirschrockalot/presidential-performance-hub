import { unstable_cache } from "next/cache";
import { performance } from "node:perf_hooks";
import type { PrismaClient, TeamCode, UserRoleCode } from "@prisma/client";

import { CACHE_TAGS } from "@/lib/cache/revalidation";
import { listDashboardRecentDeals, getDealMetrics } from "@/features/deals/server/deals.service";
import type { DrawActor } from "@/features/draws/server/draw-scope";
import { getDrawMetrics } from "@/features/draws/server/draws.service";
import { getPointsLeaderboard, getPointsMetrics } from "@/features/points/server/points.queries";
import { getDashboardOverview } from "@/features/dashboard/server/dashboard.analytics";
import { isDashboardPerfEnabled, withDashboardPerf, logDashboardPayloadParts } from "@/lib/perf/dashboard-perf";

export type DashboardBundleUser = {
  id: string;
  roleCode: string;
  teamCode: string;
};

/**
 * Loads all dashboard read models in parallel, reusing the same `unstable_cache`
 * keys/tags as the standalone API routes so entries are shared and invalidation
 * behavior is unchanged.
 */
export async function getDashboardBundle(prisma: PrismaClient, user: DashboardBundleUser) {
  const overviewActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };
  const roleCode = user.roleCode as UserRoleCode;
  const teamCode = user.teamCode as TeamCode;
  const dealActor = { id: user.id, roleCode };
  const drawActor: DrawActor = { id: user.id, roleCode, teamCode };
  const pointsActor = { id: user.id, roleCode, teamCode };
  const pointsCacheTeam = user.teamCode ?? "";

  const perf = isDashboardPerfEnabled();
  const tBundle = perf ? performance.now() : 0;

  const [
    overview,
    recentDeals,
    dealMetrics,
    drawMetrics,
    leaderboard,
    pointsMetrics,
  ] = await Promise.all([
    unstable_cache(
      () => withDashboardPerf("bundle.overview", () => getDashboardOverview(prisma, overviewActor)),
      ["dashboard:overview", user.id, user.roleCode, user.teamCode],
      { tags: [CACHE_TAGS.dashboard], revalidate: 120 }
    )(),
    unstable_cache(
      () => withDashboardPerf("bundle.recentDeals", () => listDashboardRecentDeals(prisma, dealActor, 5)),
      ["deals:dashboard-recent", user.id, user.roleCode, "5"],
      { tags: [CACHE_TAGS.deals], revalidate: 120 }
    )(),
    unstable_cache(
      () => withDashboardPerf("bundle.dealMetrics", () => getDealMetrics(prisma, dealActor)),
      ["deals:metrics", user.id, user.roleCode],
      { tags: [CACHE_TAGS.dealMetrics], revalidate: 180 }
    )(),
    unstable_cache(
      () => withDashboardPerf("bundle.drawMetrics", () => getDrawMetrics(prisma, drawActor)),
      ["draws:metrics", user.id, user.roleCode, user.teamCode],
      { tags: [CACHE_TAGS.drawMetrics], revalidate: 120 }
    )(),
    unstable_cache(
      () =>
        withDashboardPerf("bundle.pointsLeaderboard", () =>
          getPointsLeaderboard(prisma, pointsActor, { maxRows: 32 })
        ),
      ["points:leaderboard", user.id, user.roleCode, pointsCacheTeam, "dash32"],
      { tags: [CACHE_TAGS.pointsLeaderboard], revalidate: 120 }
    )(),
    unstable_cache(
      () => withDashboardPerf("bundle.pointsMetrics", () => getPointsMetrics(prisma, pointsActor)),
      ["points:metrics", user.id, user.roleCode, pointsCacheTeam],
      { tags: [CACHE_TAGS.pointsMetrics], revalidate: 120 }
    )(),
  ]);

  const bundle = {
    overview,
    recentDeals,
    dealMetrics,
    drawMetrics,
    leaderboard,
    pointsMetrics,
  };

  if (perf) {
    const wall = performance.now() - tBundle;
    console.info(`[dashboard-perf] bundle.parallel wall: ${wall.toFixed(1)}ms (per-slice logs only on cache miss)`);
    logDashboardPayloadParts({
      overview: bundle.overview,
      recentDeals: bundle.recentDeals,
      dealMetrics: bundle.dealMetrics,
      drawMetrics: bundle.drawMetrics,
      leaderboard: bundle.leaderboard,
      pointsMetrics: bundle.pointsMetrics,
    });
  }

  return bundle;
}
