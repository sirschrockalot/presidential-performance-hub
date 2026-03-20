"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { useAuthz } from "@/lib/auth/authz-context";
import { useDashboardBundle } from "@/features/dashboard/hooks/use-dashboard-bundle";
import { DashboardGridBody } from "@/features/dashboard/components/DashboardGridBody";

export default function DashboardPage() {
  const { status, roleCode } = useAuthz();
  const { data: bundle, isLoading: bundleLoading } = useDashboardBundle();

  const overview = bundle?.overview;
  const metrics = bundle?.dealMetrics;
  const drawMetrics = bundle?.drawMetrics;
  const pointsMetrics = bundle?.pointsMetrics;
  const recentDeals = bundle?.recentDeals ?? [];

  const topReps = useMemo(() => (bundle?.leaderboard ?? []).slice(0, 5), [bundle?.leaderboard]);

  const revenueTrendDeltaPct = useMemo(() => {
    const series = overview?.assignmentRevenueTrend ?? [];
    const current = series[series.length - 1]?.revenue ?? 0;
    const prev = series[series.length - 2]?.revenue ?? 0;
    if (!prev) return 0;
    return ((current - prev) / prev) * 100;
  }, [overview?.assignmentRevenueTrend]);

  if (status === "loading" || bundleLoading || !bundle || !overview || !metrics || !drawMetrics || !pointsMetrics) {
    return <LoadingState variant="page" />;
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <PageHeader title="Dashboard" description="Executive overview of operations, deals, and team performance" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
      >
        <DashboardGridBody
          metrics={metrics}
          overview={overview}
          drawMetrics={drawMetrics}
          pointsMetrics={pointsMetrics}
          roleCode={roleCode}
          recentDeals={recentDeals}
          topReps={topReps}
          revenueTrendDeltaPct={revenueTrendDeltaPct}
        />
      </motion.div>
    </div>
  );
}
