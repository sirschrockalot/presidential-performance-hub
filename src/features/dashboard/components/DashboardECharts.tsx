"use client";

import Link from "next/link";
import { memo, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { ArrowRight } from "lucide-react";
import type { DealMetricsDto } from "@/features/deals/server/deals.service";
import type { DashboardOverviewDto } from "@/features/dashboard/api/dashboard-client";
import { colorWithAlpha, useChartThemeColors } from "@/lib/charts/use-chart-theme";

type Props = {
  metrics: DealMetricsDto;
  overview: DashboardOverviewDto;
};

function baseTextStyle(color: string) {
  return { color, fontSize: 11 };
}

const EC_OPTS = { renderer: "canvas" as const };

/**
 * Apache ECharts for dashboard pipeline, revenue/points trends, and optional rep compliance bars.
 * Loaded with `dynamic(..., { ssr: false })` from the dashboard page.
 */
function DashboardEChartsComponent({ metrics, overview }: Props) {
  const theme = useChartThemeColors();

  const pipelineOption = useMemo(() => {
    const data = metrics.pipelineByStatus.map((d) => d.name);
    const values = metrics.pipelineByStatus.map((d) => d.count);
    return {
      backgroundColor: "transparent",
      animationDuration: 400,
      grid: { left: 44, right: 12, top: 28, bottom: 28 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: theme.card,
        borderColor: theme.border,
        textStyle: baseTextStyle(theme.foreground),
      },
      xAxis: {
        type: "category",
        data,
        axisLine: { lineStyle: { color: theme.border } },
        axisLabel: baseTextStyle(theme.mutedForeground),
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: theme.border, type: "dashed" } },
        axisLabel: baseTextStyle(theme.mutedForeground),
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          data: values,
          barMaxWidth: 36,
          itemStyle: {
            color: theme.primary,
            borderRadius: [4, 4, 0, 0],
          },
          emphasis: {
            itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,0.12)" },
          },
        },
      ],
    };
  }, [metrics.pipelineByStatus, theme]);

  const revenueOption = useMemo(() => {
    const months = overview.assignmentRevenueTrend.map((d) => d.month);
    const rev = overview.assignmentRevenueTrend.map((d) => d.revenue);
    return {
      backgroundColor: "transparent",
      animationDuration: 450,
      grid: { left: 48, right: 12, top: 20, bottom: 28 },
      tooltip: {
        trigger: "axis",
        backgroundColor: theme.card,
        borderColor: theme.border,
        textStyle: baseTextStyle(theme.foreground),
        valueFormatter: (v: number) => `$${v.toLocaleString()}`,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: months,
        axisLine: { lineStyle: { color: theme.border } },
        axisLabel: baseTextStyle(theme.mutedForeground),
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: theme.border, type: "dashed" } },
        axisLabel: {
          ...baseTextStyle(theme.mutedForeground),
          formatter: (v: number) => `$${(v / 1000).toFixed(0)}k`,
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "line",
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          data: rev,
          lineStyle: { width: 2, color: colorWithAlpha(theme.success, 1) },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: colorWithAlpha(theme.success, 0x33 / 255) },
                { offset: 1, color: colorWithAlpha(theme.success, 0) },
              ],
            },
          },
          itemStyle: { color: colorWithAlpha(theme.success, 1) },
        },
      ],
    };
  }, [overview.assignmentRevenueTrend, theme]);

  const pointsOption = useMemo(() => {
    const months = overview.pointsTrend.map((d) => d.month);
    const pts = overview.pointsTrend.map((d) => d.points);
    return {
      backgroundColor: "transparent",
      animationDuration: 450,
      grid: { left: 44, right: 12, top: 20, bottom: 28 },
      tooltip: {
        trigger: "axis",
        backgroundColor: theme.card,
        borderColor: theme.border,
        textStyle: baseTextStyle(theme.foreground),
        valueFormatter: (v: number) => `${Number(v).toFixed(1)} pts`,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: months,
        axisLine: { lineStyle: { color: theme.border } },
        axisLabel: baseTextStyle(theme.mutedForeground),
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: theme.border, type: "dashed" } },
        axisLabel: baseTextStyle(theme.mutedForeground),
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "line",
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          data: pts,
          lineStyle: { width: 2, color: colorWithAlpha(theme.primary, 1) },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: colorWithAlpha(theme.primary, 0x33 / 255) },
                { offset: 1, color: colorWithAlpha(theme.primary, 0) },
              ],
            },
          },
          itemStyle: { color: colorWithAlpha(theme.primary, 1) },
        },
      ],
    };
  }, [overview.pointsTrend, theme]);

  const complianceOption = useMemo(() => {
    const board = overview.kpiDashboard?.leaderboard ?? [];
    if (board.length === 0) return null;
    const sorted = [...board].sort((a, b) => a.compliancePercent - b.compliancePercent);
    const names = sorted.map((r) => r.repName.split(" ")[0] ?? r.repName);
    const values = sorted.map((r) => r.compliancePercent);
    const colors = sorted.map((r) =>
      r.compliancePercent >= 100
        ? theme.success
        : r.compliancePercent >= 50
          ? theme.warning
          : theme.destructive
    );
    return {
      backgroundColor: "transparent",
      animationDuration: 400,
      grid: { left: 72, right: 28, top: 12, bottom: 12 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: theme.card,
        borderColor: theme.border,
        textStyle: baseTextStyle(theme.foreground),
        valueFormatter: (v: number) => `${v.toFixed(0)}%`,
      },
      xAxis: {
        type: "value",
        max: 100,
        splitLine: { lineStyle: { color: theme.border, type: "dashed" } },
        axisLabel: { ...baseTextStyle(theme.mutedForeground), formatter: "{value}%" },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: "category",
        data: names,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: baseTextStyle(theme.mutedForeground),
      },
      series: [
        {
          type: "bar",
          data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } })),
          barMaxWidth: 18,
          label: {
            show: true,
            position: "right",
            formatter: (p: { value?: number }) => `${(p.value ?? 0).toFixed(0)}%`,
            color: theme.mutedForeground,
            fontSize: 10,
          },
        },
      ],
    };
  }, [overview.kpiDashboard?.leaderboard, theme]);

  return (
    <>
      <div className="lg:col-span-3 rounded-lg border bg-card p-5 flex flex-col min-h-[260px]">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <h2 className="text-sm font-semibold text-card-foreground">Deal Pipeline</h2>
          <Link
            href="/deals"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex-1 min-h-[200px]">
          <ReactECharts
            option={pipelineOption}
            style={{ height: "100%", minHeight: 200 }}
            opts={EC_OPTS}
            lazyUpdate
          />
        </div>
      </div>

      <div className="lg:col-span-2 rounded-lg border bg-card p-5 flex flex-col gap-6 min-h-[260px]">
        <div className="flex-1 min-h-[170px] flex flex-col">
          <h2 className="text-sm font-semibold text-card-foreground mb-2 shrink-0">Assignment Revenue Trend</h2>
          <div className="flex-1 min-h-[150px]">
            <ReactECharts
              option={revenueOption}
              style={{ height: "100%", minHeight: 150 }}
              opts={EC_OPTS}
              lazyUpdate
            />
          </div>
        </div>
        <div className="flex-1 min-h-[170px] flex flex-col">
          <h2 className="text-sm font-semibold text-card-foreground mb-2 shrink-0">Points Trend (Auto)</h2>
          <div className="flex-1 min-h-[150px]">
            <ReactECharts
              option={pointsOption}
              style={{ height: "100%", minHeight: 150 }}
              opts={EC_OPTS}
              lazyUpdate
            />
          </div>
        </div>
      </div>

      {complianceOption && (
        <div className="lg:col-span-5 rounded-lg border bg-card p-5 flex flex-col min-h-[220px]">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h2 className="text-sm font-semibold text-card-foreground">Rep KPI compliance (last week)</h2>
            <Link href="/kpis" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              KPIs <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">Sorted low → high · Green = 100%, yellow = 50–99%, red = &lt;50%</p>
          <div className="flex-1 min-h-[160px]">
            <ReactECharts
              option={complianceOption}
              style={{ height: "100%", minHeight: 160 }}
              opts={EC_OPTS}
              lazyUpdate
            />
          </div>
        </div>
      )}
    </>
  );
}

export const DashboardECharts = memo(DashboardEChartsComponent);
