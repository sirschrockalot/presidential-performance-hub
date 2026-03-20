"use client";

import type { WeeklyKpiSummaryTextOutput } from "@/features/kpis/lib/kpi-compliance";

type Props = {
  weeklySummaryText: WeeklyKpiSummaryTextOutput;
};

/** Deterministic weekly narrative — lazy-loaded from KPI page. */
export function KpiWeeklySummaryCard({ weeklySummaryText }: Props) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-2">
      <h3 className="text-sm font-semibold">Weekly KPI Summary</h3>
      <div className="text-sm text-muted-foreground whitespace-pre-line">
        {weeklySummaryText.acquisitionsRecap}
        {"\n"}
        {weeklySummaryText.dispositionsRecap}
        {"\n\n"}
        {weeklySummaryText.teamTakeaway}
        {"\n\n"}
        {weeklySummaryText.stretchFocusByRep.map((r) => `- ${r.text}`).join("\n")}
      </div>
    </div>
  );
}
