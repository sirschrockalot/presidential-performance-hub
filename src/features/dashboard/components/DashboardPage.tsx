"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ActivityFeed } from "@/components/shared/ActivityFeed";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";

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
  const kpiDashboard = overview?.kpiDashboard;

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

  const formatWeekLabel = (weekStarting: string | null | undefined) => {
    if (!weekStarting) return "—";
    const d = new Date(`${weekStarting}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return weekStarting;
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const complianceTone = (pct: number) =>
    pct >= 100
      ? "bg-success/10 text-success border-success/30"
      : pct >= 50 && pct <= 75
        ? "bg-warning/10 text-warning border-warning/30"
        : "bg-destructive/10 text-destructive border-destructive/30";

  const hitTone = (hitRatePercent: number) =>
    hitRatePercent >= 100
      ? "bg-success/10 text-success border-success/30"
      : hitRatePercent >= 90
        ? "bg-warning/10 text-warning border-warning/30"
        : "bg-destructive/10 text-destructive border-destructive/30";

  const hitBadgeLabel = (hitRatePercent: number) =>
    hitRatePercent >= 100 ? "Hit KPI" : hitRatePercent >= 90 ? "Near Miss" : "Missed KPI";

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

          {kpiDashboard && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-baseline justify-between gap-4 mb-3">
                <h2 className="text-sm font-semibold text-card-foreground">KPI Hit Rate</h2>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {kpiDashboard.lastWeekStarting ? `Week of ${formatWeekLabel(kpiDashboard.lastWeekStarting)}` : "—"}
                </span>
              </div>

              <div className="text-xs text-muted-foreground mb-3">
                Top:{" "}
                <span className="font-medium">
                  {kpiDashboard.topPerformer ? kpiDashboard.topPerformer.repName.split(" ")[0] : "—"}
                </span>
                {kpiDashboard.topPerformer && (
                  <span className={cn("ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", complianceTone(kpiDashboard.topPerformer.compliancePercent))}>
                    🟢 {kpiDashboard.topPerformer.compliancePercent.toFixed(0)}%
                  </span>
                )}
                {" · "}
                At-risk:{" "}
                <span className="font-medium">
                  {kpiDashboard.mostAtRisk ? kpiDashboard.mostAtRisk.repName.split(" ")[0] : "—"}
                </span>
                {kpiDashboard.mostAtRisk && (
                  <span className={cn("ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", complianceTone(kpiDashboard.mostAtRisk.compliancePercent))}>
                    {kpiDashboard.mostAtRisk.compliancePercent >= 50 ? "🟡" : "🔴"} {kpiDashboard.mostAtRisk.compliancePercent.toFixed(0)}%
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {kpiDashboard.leaderboard.map((entry, i) => (
                  <div key={entry.repUserId} className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center h-7 w-7 rounded-full text-[11px] font-bold ${
                        i === 0 ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.repName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{entry.team}</p>
                    </div>
                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", complianceTone(entry.compliancePercent))}>
                      {entry.compliancePercent >= 100 ? "🟢" : entry.compliancePercent >= 50 ? "🟡" : "🔴"} {entry.compliancePercent.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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

          {kpiDashboard && (
            <div className="rounded-lg border bg-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-card-foreground">KPI Compliance (Last Week)</h2>
                  <p className="text-xs text-muted-foreground">
                    {kpiDashboard.lastWeekStarting ? `Week of ${formatWeekLabel(kpiDashboard.lastWeekStarting)}` : "No completed week found"}
                  </p>
                  {kpiDashboard.weeklySummaryText && (
                    <Button
                      className="mt-2"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(kpiDashboard.weeklySummaryText ?? "");
                          toast.success("Weekly KPI summary copied");
                        } catch {
                          toast.error("Failed to copy summary");
                        }
                      }}
                    >
                      Copy Weekly KPI Summary
                    </Button>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>
                    WoW: Acq{" "}
                    <span
                      className={cn(
                        "font-medium",
                        kpiDashboard.trendDeltaPctPoints.acquisitions >= 0 ? "text-success" : "text-destructive"
                      )}
                    >
                      {kpiDashboard.trendDeltaPctPoints.acquisitions >= 0 ? "↑ " : "↓ "}
                      {Math.abs(kpiDashboard.trendDeltaPctPoints.acquisitions).toFixed(0)}pp
                    </span>
                  </div>
                  <div>
                    WoW: Dispo{" "}
                    <span
                      className={cn(
                        "font-medium",
                        kpiDashboard.trendDeltaPctPoints.dispositions >= 0 ? "text-success" : "text-destructive"
                      )}
                    >
                      {kpiDashboard.trendDeltaPctPoints.dispositions >= 0 ? "↑ " : "↓ "}
                      {Math.abs(kpiDashboard.trendDeltaPctPoints.dispositions).toFixed(0)}pp
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["acquisitions", "dispositions"] as const).map((team) => {
                  const card = kpiDashboard[team];
                  const pct = card.overallCompliancePercent;
                  const colorClass = complianceTone(pct);
                  return (
                    <div key={team} className={cn("rounded-lg border p-4", colorClass)}>
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="text-xs font-medium text-muted-foreground capitalize">{team}</p>
                        <span className="text-sm font-semibold font-mono">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="mt-3 space-y-1">
                        {card.metrics.map((m) => (
                          <div key={m.metricKey} className="flex items-center justify-between gap-3">
                            <span className="text-xs text-muted-foreground">{m.metricLabel}</span>
                            {m.metricKey === "OFFERS_MADE" && kpiDashboard.offersTierBreakdown ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold font-mono text-muted-foreground">
                                  {m.hitLabel} hit
                                </span>
                                {(["belowMinimum", "metMinimum", "hitTarget"] as const).map((k) => {
                                  const tier = kpiDashboard.offersTierBreakdown?.[k];
                                  if (!tier) return null;
                                  const prevTier = kpiDashboard.offersTierBreakdown?.prev?.[k];
                                  const curRate = tier.totalReps ? (tier.reps / tier.totalReps) * 100 : 0;
                                  const prevRate = prevTier?.totalReps ? (prevTier.reps / prevTier.totalReps) * 100 : 0;
                                  const delta = curRate - prevRate;
                                  const arrow = Math.abs(delta) < 0.5 ? "→" : delta > 0 ? "↑" : "↓";
                                  const chipTone =
                                    k === "hitTarget"
                                      ? "bg-success/10 text-success border-success/30"
                                      : k === "metMinimum"
                                        ? "bg-warning/10 text-warning border-warning/30"
                                        : "bg-destructive/10 text-destructive border-destructive/30";
                                  const chipEmoji = k === "hitTarget" ? "🟢" : k === "metMinimum" ? "🟡" : "🔴";
                                  const chipText = k === "hitTarget" ? "Hit Target" : k === "metMinimum" ? "Met Minimum" : "Below Minimum";
                                  return (
                                    <span
                                      key={k}
                                      className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border", chipTone)}
                                    >
                                      {chipEmoji} {tier.reps}/{tier.totalReps} {arrow}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border", hitTone(m.hitRatePercent))}>
                                  {m.hitRatePercent >= 100 ? "🟢" : m.hitRatePercent >= 90 ? "🟡" : "🔴"} {hitBadgeLabel(m.hitRatePercent)}
                                </span>
                                <span className={cn("text-[11px] font-semibold font-mono text-muted-foreground")}>
                                  {m.hitLabel} hit
                                </span>
                                <span className={cn("text-[11px] font-medium text-muted-foreground")}>
                                  {m.hitRatePercentPrev == null
                                    ? "—"
                                    : Math.abs(m.hitRatePercent - m.hitRatePercentPrev) < 0.5
                                      ? "→"
                                      : m.hitRatePercent - m.hitRatePercentPrev > 0
                                        ? "↑"
                                        : "↓"}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {kpiDashboard.offersTierBreakdown?.hitTarget.totalReps > 0 && (
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Acq Offers (3–5/day)
                    </h3>
                    <span className="text-sm font-semibold font-mono">
                      {kpiDashboard.offersTierBreakdown.hitTarget.reps}/{kpiDashboard.offersTierBreakdown.hitTarget.totalReps} hit
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border",
                        "bg-destructive/10 text-destructive border-destructive/30"
                      )}
                    >
                      🔴 Below Minimum: {kpiDashboard.offersTierBreakdown.belowMinimum.reps}/{kpiDashboard.offersTierBreakdown.belowMinimum.totalReps}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border",
                        "bg-warning/10 text-warning border-warning/30"
                      )}
                    >
                      🟡 Met Minimum: {kpiDashboard.offersTierBreakdown.metMinimum.reps}/{kpiDashboard.offersTierBreakdown.metMinimum.totalReps}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border",
                        "bg-success/10 text-success border-success/30"
                      )}
                    >
                      🟢 Hit Target: {kpiDashboard.offersTierBreakdown.hitTarget.reps}/{kpiDashboard.offersTierBreakdown.hitTarget.totalReps}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
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
