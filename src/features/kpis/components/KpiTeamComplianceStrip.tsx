"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { computeKpiTeamComplianceSummary } from "@/features/kpis/lib/kpi-compliance";

export type TeamComplianceSnapshot = ReturnType<typeof computeKpiTeamComplianceSummary> | null;

type Props = {
  weekLabel: string;
  motionEase: readonly [number, number, number, number];
  acqTeamCompliance: TeamComplianceSnapshot;
  dispoTeamCompliance: TeamComplianceSnapshot;
  acqTeamCompliancePrev: TeamComplianceSnapshot;
  dispoTeamCompliancePrev: TeamComplianceSnapshot;
};

/** Below-the-fold team compliance analytics — lazy-loaded from KPI page. */
export function KpiTeamComplianceStrip({
  weekLabel,
  motionEase,
  acqTeamCompliance,
  dispoTeamCompliance,
  acqTeamCompliancePrev,
  dispoTeamCompliancePrev,
}: Props) {
  if (!acqTeamCompliance && !dispoTeamCompliance) return null;

  return (
    <motion.div
      key={`compliance-strip-${weekLabel}`}
      className="rounded-lg border bg-card p-5 space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: motionEase }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Team KPI Compliance</h3>
          <p className="text-xs text-muted-foreground">Week of {weekLabel}</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>Acq reps: {acqTeamCompliance?.totalRepsConsidered ?? 0}</div>
          <div>Dispo reps: {dispoTeamCompliance?.totalRepsConsidered ?? 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(
          [
            { team: "acquisitions" as const, data: acqTeamCompliance, prev: acqTeamCompliancePrev },
            { team: "dispositions" as const, data: dispoTeamCompliance, prev: dispoTeamCompliancePrev },
          ] as const
        ).map(({ team: t, data, prev }) => {
          if (!data) return null;
          const overallPct = data.compliancePercent;
          const overallTone =
            overallPct >= 100
              ? "bg-success/10 text-success border-success/30"
              : overallPct >= 50
                ? "bg-warning/10 text-warning border-warning/30"
                : "bg-destructive/10 text-destructive border-destructive/30";

          const deltaForMetric = (metricKey: string) => {
            const cur = data.metrics.find((m) => m.metricKey === metricKey)?.hitRatePercent ?? 0;
            const pr = prev?.metrics.find((m) => m.metricKey === metricKey)?.hitRatePercent ?? 0;
            return cur - pr;
          };

          return (
            <div key={t} className={cn("rounded-lg border p-4", overallTone)}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground capitalize">{t}</p>
                  <p className="text-sm font-semibold font-mono">{overallPct.toFixed(0)}%</p>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {data.kpisHitCount}/{data.totalKpisTracked} hits
                </p>
              </div>

              <div className="space-y-2">
                {data.metrics.map((m) => {
                  const hitPct = m.hitRatePercent;
                  const tone =
                    hitPct >= 100
                      ? "bg-success/15 text-success border-success/30"
                      : hitPct >= 90
                        ? "bg-warning/15 text-warning border-warning/30"
                        : hitPct === 0
                          ? "bg-destructive/15 text-destructive border-destructive/30"
                          : "bg-destructive/15 text-destructive border-destructive/30";
                  const delta = deltaForMetric(m.metricKey);
                  const arrow = Math.abs(delta) < 0.5 ? "→" : delta > 0 ? "↑" : "↓";
                  const label =
                    m.metricKey === "OFFERS_MADE" ? `Offers (min): ${m.hitLabel} hit` : `${m.metricLabel}: ${m.hitLabel} hit`;
                  return (
                    <div key={m.metricKey} className={cn("flex items-center justify-between gap-3 rounded-md border px-3 py-2", tone)}>
                      <p className="text-xs font-medium truncate">{label}</p>
                      <p className="text-xs font-semibold font-mono flex items-center gap-2">
                        {m.hitRatePercent.toFixed(0)}% {arrow}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
