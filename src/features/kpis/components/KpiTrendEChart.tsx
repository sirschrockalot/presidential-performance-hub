"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { KpiTrendPointDto } from "@/features/kpis/server/kpis.service";
import { useChartThemeColors } from "@/lib/charts/use-chart-theme";

type Props = {
  data: KpiTrendPointDto[];
};

/**
 * Team performance trend — ECharts line + targets (lazy-loaded from KPI page).
 */
export function KpiTrendEChart({ data }: Props) {
  const theme = useChartThemeColors();

  const option = useMemo(() => {
    const weeks = data.map((d) => d.week);
    return {
      backgroundColor: "transparent",
      animationDuration: 400,
      legend: {
        data: ["Dials", "Dials target", "Revenue ($k)", "Revenue target ($k)"],
        bottom: 0,
        textStyle: { color: theme.mutedForeground, fontSize: 11 },
        icon: "circle",
      },
      grid: { left: 48, right: 16, top: 24, bottom: 56 },
      tooltip: {
        trigger: "axis",
        backgroundColor: theme.card,
        borderColor: theme.border,
        textStyle: { color: theme.foreground, fontSize: 12 },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: weeks,
        axisLine: { lineStyle: { color: theme.border } },
        axisLabel: { color: theme.mutedForeground, fontSize: 10 },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: "value",
          name: "Dials",
          position: "left",
          splitLine: { lineStyle: { color: theme.border, type: "dashed" } },
          axisLabel: { color: theme.mutedForeground, fontSize: 10 },
          axisLine: { show: false },
        },
        {
          type: "value",
          name: "Revenue $k",
          position: "right",
          splitLine: { show: false },
          axisLabel: { color: theme.mutedForeground, fontSize: 10 },
          axisLine: { show: false },
        },
      ],
      series: [
        {
          name: "Dials",
          type: "line",
          smooth: true,
          showSymbol: true,
          symbolSize: 5,
          data: data.map((d) => d.dials),
          lineStyle: { width: 2, color: theme.primary },
          itemStyle: { color: theme.primary },
        },
        {
          name: "Dials target",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: data.map((d) => d.dialsTarget ?? null),
          lineStyle: { width: 1.5, type: "dashed", color: theme.primary },
        },
        {
          name: "Revenue ($k)",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          showSymbol: true,
          symbolSize: 5,
          data: data.map((d) => Math.round((d.revenue / 1000) * 10) / 10),
          lineStyle: { width: 2, color: theme.success },
          itemStyle: { color: theme.success },
        },
        {
          name: "Revenue target ($k)",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          data: data.map((d) =>
            d.revenueTarget != null ? Math.round((d.revenueTarget / 1000) * 10) / 10 : null
          ),
          lineStyle: { width: 1.5, type: "dashed", color: theme.success },
        },
      ],
    };
  }, [data, theme]);

  if (!data.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No trend data yet.</p>;
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: 280, width: "100%" }}
      opts={{ renderer: "canvas" }}
      lazyUpdate
    />
  );
}
