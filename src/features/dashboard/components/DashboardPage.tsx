"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ActivityFeed } from "@/components/shared/ActivityFeed";
import { useDealMetrics, useDeals } from "@/features/deals/hooks/use-deals";
import { useLeaderboard, usePointsMetrics } from "@/features/points/hooks/use-points";
import { useDrawMetrics } from "@/features/draws/hooks/use-draws";
import { useDashboardOverview } from "@/features/dashboard/hooks/use-dashboard-overview";
import {
  DollarSign,
  Handshake,
  TrendingUp,
  Banknote,
  Trophy,
  Star,
  BarChart3,
  ArrowRight,
  Target,
} from "lucide-react";
import { LoadingState } from "@/components/shared/LoadingState";
import { useAuthz } from "@/lib/auth/authz-context";
import { DashboardChartsSkeleton } from "@/features/dashboard/components/DashboardChartsSkeleton";

const DashboardCharts = dynamic(
  () => import("@/features/dashboard/components/DashboardCharts").then((m) => m.DashboardCharts),
  { ssr: false, loading: () => <DashboardChartsSkeleton /> }
);

export default function DashboardPage() {
  const { status, roleCode } = useAuthz();
  const { data: overview, isLoading: overviewLoading } = useDashboardOverview();

  const { data: dealRows } = useDeals({ sortBy: "updatedAt", sortOrder: "desc", limit: 5 });
  const recentDeals = useMemo(() => dealRows ?? [], [dealRows]);

  const { data: metrics } = useDealMetrics();
  const { data: drawMetrics } = useDrawMetrics();
  const { data: leaderboard } = useLeaderboard();
  const { data: pointsMetrics } = usePointsMetrics();

  const topReps = useMemo(() => (leaderboard ?? []).slice(0, 5), [leaderboard]);
  const pointsSubtitle = roleCode === "REP" ? "Your profit-sharing points" : "Company-wide profit sharing";

  const revenueTrendDeltaPct = (() => {
    const series = overview?.assignmentRevenueTrend ?? [];
    const current = series[series.length - 1]?.revenue ?? 0;
    const prev = series[series.length - 2]?.revenue ?? 0;
    if (!prev) return 0;
    return ((current - prev) / prev) * 100;
  })();

  if (status === "loading" || !metrics || overviewLoading || !overview || !drawMetrics || !pointsMetrics) {
    return <LoadingState variant="page" />;
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <PageHeader title="Dashboard" description="Executive overview of operations, deals, and team performance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Active Deals" value={metrics.activeCount} icon={Handshake} subtitle="In pipeline" variant="info" />
        <MetricCard
          title="Assignment Revenue (This Month)"
          value={`$${(overview?.totalAssignmentRevenueThisMonth ?? 0).toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: revenueTrendDeltaPct, label: "vs last month" }}
          variant="success"
        />
        <MetricCard
          title="Avg Assignment Fee (This Month)"
          value={`$${(overview?.avgAssignmentFeeThisMonth ?? 0).toLocaleString()}`}
          icon={TrendingUp}
          subtitle={`${overview?.fundedDealsThisMonth ?? 0} funded deals`}
        />
        <MetricCard title="Outstanding Draws" value={`$${(drawMetrics?.outstanding ?? 0).toLocaleString()}`} icon={Banknote} variant="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <DashboardCharts metrics={metrics} overview={overview} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-gold" /> Leaderboard
            </h2>
            <Link href="/points" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {topReps.map((entry, i) => (
              <div key={entry.userId} className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center h-7 w-7 rounded-full text-[11px] font-bold ${
                    i === 0 ? "bg-gold/20 text-gold" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{entry.team}</p>
                </div>
                <span className="text-sm font-bold font-mono">{entry.points}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-lg border bg-card p-5">
          <h2 className="text-sm font-semibold text-card-foreground mb-3">Recent Activity</h2>
          <ActivityFeed items={overview.recentActivity} maxItems={6} />
        </div>

        <div className="lg:col-span-4 space-y-4">
          <MetricCard title="Total Points" value={pointsMetrics.totalCompanyPoints} icon={Trophy} subtitle={pointsSubtitle} variant="info" />
          <MetricCard
            title="Funded Deals (This Month)"
            value={overview.fundedDealsThisMonth}
            icon={Star}
            subtitle={`Avg fee: $${(overview.avgAssignmentFeeThisMonth ?? 0).toLocaleString()}`}
          />
          <MetricCard
            title="Weekly KPI Snapshot"
            value={overview.weeklySnapshot.totalDials}
            icon={BarChart3}
            subtitle={`Talk time: ${overview.weeklySnapshot.totalTalkTimeMinutes} min · Reps: ${overview.weeklySnapshot.repCount}`}
          />
          <MetricCard
            title="Conversion (Offers → Contracts)"
            value={`${overview.weeklySnapshot.conversionRate.toFixed(1)}%`}
            icon={Target}
            subtitle={`Offers: ${overview.weeklySnapshot.offersMade} · Contracts: ${overview.weeklySnapshot.contractsSigned}`}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-card-foreground">Recent Deals</h2>
          <Link href="/deals" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            View all deals <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Property</th>
                <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Rep</th>
                <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Fee</th>
              </tr>
            </thead>
            <tbody>
              {recentDeals.map((deal) => (
                <tr key={deal.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3">
                    <Link href={`/deals/${deal.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                      {deal.propertyAddress}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground hidden md:table-cell">{deal.acquisitionsRepName}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={deal.status} />
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {deal.assignmentFee ? (
                      <span className="font-medium text-success">${deal.assignmentFee.toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
