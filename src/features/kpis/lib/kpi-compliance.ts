import type { Team } from "@/types";
import type { KpiEntryWithRepDto, KpiHistoryRowDto, KpiTargetsByMetricKey } from "@/features/kpis/server/kpis.service";
import type { KpiFieldDef, KpiMetricKey } from "@/features/kpis/utils/kpi-metrics";
import { KPI_FIELD_DEFS, formatTalkTimeMinutes } from "@/features/kpis/utils/kpi-metrics";

export type KpiTeam = Exclude<Team, "operations">;

export type KpiMetricComparison = {
  metricKey: KpiMetricKey;
  metricLabel: string;
  actualTotal: number; // weekly total (as entered)
  workingDays: number;
  actualDailyAverage: number;
  dailyTarget: number;
  weeklyEquivalentTarget: number;
  varianceTotal: number; // actualTotal - weeklyEquivalentTarget
  varianceDailyAverage: number; // actualDailyAverage - dailyTarget
  percentToGoal: number; // based on daily averages (0..inf)
  hit: boolean; // "hit" means meeting the primary target threshold
  formattedDisplayLabel: string; // formatted daily average (for compact display)
  varianceText: string; // e.g. "Missed by 60/day", "Exceeded by 2h/day"

  // Acquisitions offers have special 3–5/day tiering.
  offers?: {
    floorDailyTarget: number;
    floorWeeklyEquivalentTarget: number;
    offersTier: "MISS_FLOOR" | "HIT_FLOOR_ONLY" | "HIT_TARGET";
    floorHit: boolean;
    targetHit: boolean;
    badgeLabel: string;
  };
};

export type KpiRepWeeklyCompliance = {
  team: KpiTeam;
  repUserId: string;
  repName: string;
  weekStarting: string;
  metrics: KpiMetricComparison[];
  kpisHitCount: number;
  totalKpisTracked: number;
  compliancePercent: number; // 0..100
};

export type KpiHistoricalMetricHitRate = {
  metricKey: KpiMetricKey;
  metricLabel: string;
  hitWeeks: number;
  totalWeeksCounted: number;
  hitRatePercent: number; // 0..100
};

export type KpiRepHistoricalHitRates = {
  team: KpiTeam;
  repUserId: string;
  repName: string;
  weeksCounted: number;
  metrics: KpiHistoricalMetricHitRate[];
};

export type KpiTeamComplianceMetricSummary = {
  metricKey: KpiMetricKey;
  metricLabel: string;
  hitReps: number;
  totalReps: number;
  hitRatePercent: number; // 0..100
  hitLabel: string; // e.g. "1/2"
};

export type KpiTeamComplianceSummary = {
  team: KpiTeam;
  weekStarting: string;
  totalRepsConsidered: number;
  metrics: KpiTeamComplianceMetricSummary[];
  kpisHitCount: number;
  totalKpisTracked: number;
  compliancePercent: number; // 0..100
};

export type WeeklyKpiSummaryTextOutput = {
  acquisitionsRecap: string;
  dispositionsRecap: string;
  teamTakeaway: string;
  stretchFocusByRep: Array<{ repName: string; text: string }>;
};

const KPI_COMPARISON_METRIC_KEYS_BY_TEAM: Record<KpiTeam, KpiMetricKey[]> = {
  acquisitions: ["DIALS", "TALK_TIME_MINUTES", "OFFERS_MADE", "CONTRACTS_SIGNED"],
  dispositions: ["DIALS", "TALK_TIME_MINUTES"],
};

export function getKpiComparisonMetricKeysForTeam(team: KpiTeam): KpiMetricKey[] {
  return KPI_COMPARISON_METRIC_KEYS_BY_TEAM[team];
}

function getMetricDefsForTeam(team: KpiTeam): KpiFieldDef[] {
  const allowed = new Set<KpiMetricKey>(KPI_COMPARISON_METRIC_KEYS_BY_TEAM[team]);
  return KPI_FIELD_DEFS[team].filter((d) => allowed.has(d.metricKey));
}

function shortRepName(repName: string): string {
  // Leadership examples use first name; we keep it deterministic and safe.
  return repName.trim().split(/\s+/)[0] || repName;
}

function metricHumanLabel(metricKey: KpiMetricKey): string {
  switch (metricKey) {
    case "DIALS":
      return "dials";
    case "TALK_TIME_MINUTES":
      return "talk time";
    case "OFFERS_MADE":
      return "offers";
    case "CONTRACTS_SIGNED":
      return "contracts";
    default:
      return metricKey.toLowerCase();
  }
}

function formatVarianceValue(team: KpiTeam, metricKey: KpiMetricKey, valueAbs: number): string {
  if (metricKey === "TALK_TIME_MINUTES") return formatTalkTimeMinutes(Math.round(valueAbs));
  // Use one-decimal display for daily-average variances (e.g. 0.8/day).
  const v = Number(valueAbs.toFixed(1));
  return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function computePercentToGoal(actualValue: number, targetValue: number): number {
  if (targetValue <= 0) {
    // If target is 0, reaching it is effectively guaranteed for any non-negative value.
    // Returning 100 here keeps UI deterministic and avoids division by zero.
    return actualValue <= 0 ? 100 : 100;
  }
  return (actualValue / targetValue) * 100;
}

function computeHit(actualValue: number, targetValue: number): boolean {
  // Higher is better; everything is ">= target" for KPI hit.
  return actualValue >= targetValue;
}

function pickColorClass(hit: boolean, percentToGoal: number): string {
  if (hit) return "bg-success/10 text-success";
  // Keep "simple red/yellow/green" behavior:
  if (percentToGoal >= 90) return "bg-warning/10 text-warning";
  return "bg-destructive/10 text-destructive";
}

export function computeKpiMetricComparison(params: {
  team: KpiTeam;
  metricDef: KpiFieldDef;
  actualTotal: number;
  dailyTarget: number;
  weeklyEquivalentTarget: number;
  workingDays: number;
  offersFloorDailyTarget?: number;
  offersFloorWeeklyEquivalentTarget?: number;
}): KpiMetricComparison {
  const { team, metricDef, actualTotal, dailyTarget, weeklyEquivalentTarget, workingDays } = params;
  const actualDailyAverage = workingDays > 0 ? actualTotal / workingDays : 0;
  const varianceTotal = actualTotal - weeklyEquivalentTarget;
  const varianceDailyAverage = actualDailyAverage - dailyTarget;

  const percentToGoal = computePercentToGoal(actualDailyAverage, dailyTarget);

  const formattedDisplayLabel =
    metricDef.metricKey === "TALK_TIME_MINUTES" ? formatTalkTimeMinutes(Math.round(actualDailyAverage)) : actualDailyAverage.toFixed(1).replace(/\.0$/, "");

  const varianceAbsDaily = Math.abs(varianceDailyAverage);
  const varianceText = varianceDailyAverage >= 0
    ? `Exceeded by ${formatVarianceValue(team, metricDef.metricKey, varianceAbsDaily)}/day`
    : `Missed by ${formatVarianceValue(team, metricDef.metricKey, varianceAbsDaily)}/day`;

  // Default: hit is ">= daily target".
  let hit = computeHit(actualDailyAverage, dailyTarget);
  let offers: KpiMetricComparison["offers"] | undefined;

  // Special-case Acquisitions offers with floor + target tiers.
  if (metricDef.metricKey === "OFFERS_MADE") {
    const floorDailyTarget = params.offersFloorDailyTarget ?? 3;
    const floorWeeklyEquivalentTarget = params.offersFloorWeeklyEquivalentTarget ?? floorDailyTarget * workingDays;

    const floorHit = actualDailyAverage >= floorDailyTarget;
    const targetHit = actualDailyAverage >= dailyTarget;
    const offersTier: KpiMetricComparison["offers"]["offersTier"] = !floorHit
      ? "MISS_FLOOR"
      : targetHit
        ? "HIT_TARGET"
        : "HIT_FLOOR_ONLY";

    // For offers tiering:
    // - missed floor: red
    // - hit floor only: yellow
    // - hit target: green
    // "hit" stays aligned to floorHit (used by KPI score + compliance),
    // while tiering tells whether the target was exceeded.
    hit = floorHit;

    const badgeLabel = offersTier === "HIT_TARGET" ? "Hit target" : offersTier === "HIT_FLOOR_ONLY" ? "Floor hit" : "Missed floor";

    offers = {
      floorDailyTarget,
      floorWeeklyEquivalentTarget,
      offersTier,
      floorHit,
      targetHit,
      badgeLabel,
    };

    // `varianceText` remains relative to the primary target/day; UI will prefix
    // with "Hit floor only" when the floor is met but the target is missed.
  }

  return {
    metricKey: metricDef.metricKey,
    metricLabel: metricDef.label,
    actualTotal,
    workingDays,
    actualDailyAverage,
    dailyTarget,
    weeklyEquivalentTarget,
    varianceTotal,
    varianceDailyAverage,
    percentToGoal,
    hit,
    formattedDisplayLabel,
    varianceText: offers?.offersTier === "HIT_FLOOR_ONLY" ? `Hit floor only. ${varianceText} (vs target)` : varianceText,
    offers,
  };
}

type KpiEntryLikeForWeek = Pick<KpiEntryWithRepDto, "dials" | "talkTimeMinutes" | "offersMade" | "contractsSigned" | "userId" | "repName" | "weekStarting">;

function getActualKpiValueForMetricKey(params: {
  team: KpiTeam;
  metricKey: KpiMetricKey;
  entry: KpiEntryLikeForWeek;
}): number {
  const { metricKey, entry } = params;
  switch (metricKey) {
    case "DIALS":
      return entry.dials;
    case "TALK_TIME_MINUTES":
      return entry.talkTimeMinutes;
    case "OFFERS_MADE":
      return entry.offersMade ?? 0;
    case "CONTRACTS_SIGNED":
      return entry.contractsSigned ?? 0;
    default: {
      // Defensive fallback for non-comparison metric keys.
      return 0;
    }
  }
}

export function computeKpiRepWeeklyCompliance(params: {
  team: KpiTeam;
  weekStarting: string;
  entry: KpiEntryLikeForWeek;
  targets: KpiTargetsByMetricKey;
  workingDays?: number;
}): KpiRepWeeklyCompliance {
  const { team, weekStarting, entry, targets, workingDays = 5 } = params;
  const metricDefs = getMetricDefsForTeam(team);

  const metrics = metricDefs.map((def) => {
    const actualTotal = getActualKpiValueForMetricKey({ team, metricKey: def.metricKey, entry });

    // Resolve KPI targets in a daily-average way.
    // `targets` in DB are stored as weekly totals today; convert to daily by dividing by `workingDays`.
    // Business-rule defaults are used when a target is missing.
    const resolved = (() => {
      switch (def.metricKey) {
        case "DIALS": {
          const dailyTarget = team === "acquisitions" ? 50 : 60;
          return { dailyTarget, weeklyEquivalentTarget: dailyTarget * workingDays };
        }
        case "TALK_TIME_MINUTES": {
          const dailyTarget = team === "acquisitions" ? 210 : 60;
          return { dailyTarget, weeklyEquivalentTarget: dailyTarget * workingDays };
        }
        case "OFFERS_MADE": {
          const floorDailyTarget = 3;
          const dailyTarget = 5;
          return {
            dailyTarget,
            weeklyEquivalentTarget: dailyTarget * workingDays,
            offersFloorDailyTarget: floorDailyTarget,
            offersFloorWeeklyEquivalentTarget: floorDailyTarget * workingDays,
          };
        }
        case "CONTRACTS_SIGNED": {
          const defaultWeeklyTarget = 4;
          const overrideWeeklyTarget = targets.CONTRACTS_SIGNED;
          const weeklyEquivalentTarget = overrideWeeklyTarget != null && overrideWeeklyTarget > 0 ? overrideWeeklyTarget : defaultWeeklyTarget;
          const dailyTarget = weeklyEquivalentTarget / workingDays;
          return { dailyTarget, weeklyEquivalentTarget };
        }
        default: {
          return { dailyTarget: 0, weeklyEquivalentTarget: 0 };
        }
      }
    })();

    return computeKpiMetricComparison({
      team,
      metricDef: def,
      actualTotal,
      dailyTarget: resolved.dailyTarget,
      weeklyEquivalentTarget: resolved.weeklyEquivalentTarget,
      workingDays,
      offersFloorDailyTarget: "offersFloorDailyTarget" in resolved ? resolved.offersFloorDailyTarget : undefined,
      offersFloorWeeklyEquivalentTarget: "offersFloorWeeklyEquivalentTarget" in resolved ? resolved.offersFloorWeeklyEquivalentTarget : undefined,
    });
  });

  const kpisHitCount = metrics.reduce((s, m) => s + (m.hit ? 1 : 0), 0);
  const totalKpisTracked = metrics.length;
  const compliancePercent = totalKpisTracked > 0 ? (kpisHitCount / totalKpisTracked) * 100 : 0;

  return {
    team,
    repUserId: entry.userId,
    repName: entry.repName,
    weekStarting,
    metrics,
    kpisHitCount,
    totalKpisTracked,
    compliancePercent,
  };
}

export function computeKpiTeamComplianceSummary(params: {
  team: KpiTeam;
  weekStarting: string;
  entries: KpiEntryWithRepDto[];
  targets: KpiTargetsByMetricKey;
  workingDays?: number;
}): KpiTeamComplianceSummary {
  const { team, weekStarting, entries, targets, workingDays = 5 } = params;
  const totalRepsConsidered = entries.length;

  const perRep = entries.map((entry) =>
    computeKpiRepWeeklyCompliance({
      team,
      weekStarting,
      entry,
      targets,
      workingDays,
    })
  );

  const kpisHitCount = perRep.reduce((s, r) => s + r.kpisHitCount, 0);
  const totalKpisTracked = perRep.reduce((s, r) => s + r.totalKpisTracked, 0);
  const compliancePercent = totalKpisTracked > 0 ? (kpisHitCount / totalKpisTracked) * 100 : 0;

  const metricSummaries: KpiTeamComplianceMetricSummary[] = (() => {
    const metricDefs = getMetricDefsForTeam(team);
    return metricDefs.map((def) => {
      const hitReps = perRep.filter((r) => r.metrics.find((m) => m.metricKey === def.metricKey)?.hit).length;
      const totalReps = totalRepsConsidered;
      const hitRatePercent = totalReps > 0 ? (hitReps / totalReps) * 100 : 0;
      return {
        metricKey: def.metricKey,
        metricLabel: def.label,
        hitReps,
        totalReps,
        hitRatePercent,
        hitLabel: `${hitReps}/${totalReps}`,
      };
    });
  })();

  return {
    team,
    weekStarting,
    totalRepsConsidered,
    metrics: metricSummaries,
    kpisHitCount,
    totalKpisTracked,
    compliancePercent,
  };
}

type KpiHistoryLike = Pick<KpiHistoryRowDto, "repUserId" | "repName" | "weekStarting" | "dials" | "talkTimeMinutes" | "offersMade" | "contractsSigned">;

function getActualKpiValueForMetricKeyFromHistory(params: {
  metricKey: KpiMetricKey;
  row: KpiHistoryLike;
}): number {
  const { metricKey, row } = params;
  switch (metricKey) {
    case "DIALS":
      return row.dials;
    case "TALK_TIME_MINUTES":
      return row.talkTimeMinutes;
    case "OFFERS_MADE":
      return row.offersMade ?? 0;
    case "CONTRACTS_SIGNED":
      return row.contractsSigned ?? 0;
    default: {
      return 0;
    }
  }
}

export function computeKpiRepHistoricalHitRates(params: {
  team: KpiTeam;
  repUserId: string;
  repName: string;
  historyRows: KpiHistoryLike[];
  targets: KpiTargetsByMetricKey;
  workingDays?: number;
}): KpiRepHistoricalHitRates {
  const { team, repUserId, repName, historyRows, targets, workingDays = 5 } = params;
  const metricDefs = getMetricDefsForTeam(team);

  const weeksCounted = historyRows.length;
  const metrics = metricDefs.map((def) => {
    const hitWeeks = historyRows.reduce((s, row) => {
      const actualTotal = getActualKpiValueForMetricKeyFromHistory({ metricKey: def.metricKey, row });

      const dailyTarget = (() => {
        switch (def.metricKey) {
          case "DIALS": {
            return team === "acquisitions" ? 50 : 60;
          }
          case "TALK_TIME_MINUTES": {
            return team === "acquisitions" ? 210 : 60;
          }
          case "OFFERS_MADE": {
            const floorDailyTarget = 3;
            // For "offers hit %" we count meeting the minimum compliance floor.
            return floorDailyTarget;
          }
          case "CONTRACTS_SIGNED": {
            const defaultWeeklyTarget = 4;
            const overrideWeeklyTarget = targets.CONTRACTS_SIGNED;
            const weeklyTarget = overrideWeeklyTarget != null && overrideWeeklyTarget > 0 ? overrideWeeklyTarget : defaultWeeklyTarget;
            return weeklyTarget / workingDays;
          }
          default: {
            return 0;
          }
        }
      })();

      const actualDailyAverage = actualTotal / workingDays;
      return s + (actualDailyAverage >= dailyTarget ? 1 : 0);
    }, 0);

    const hitRatePercent = weeksCounted > 0 ? (hitWeeks / weeksCounted) * 100 : 0;
    return {
      metricKey: def.metricKey,
      metricLabel: def.label,
      hitWeeks,
      totalWeeksCounted: weeksCounted,
      hitRatePercent,
    };
  });

  return {
    team,
    repUserId,
    repName,
    weeksCounted,
    metrics,
  };
}

function chooseLeader(params: { reps: Array<{ repName: string; compliancePercent: number; kpisHitCount: number }> }): string {
  const sorted = params.reps.slice().sort((a, b) => {
    if (b.compliancePercent !== a.compliancePercent) return b.compliancePercent - a.compliancePercent;
    if (b.kpisHitCount !== a.kpisHitCount) return b.kpisHitCount - a.kpisHitCount;
    return a.repName.localeCompare(b.repName);
  });
  return sorted[0]?.repName ?? "";
}

function chooseAtRisk(params: { reps: Array<{ repName: string; compliancePercent: number; kpisHitCount: number }> }): string {
  const sorted = params.reps.slice().sort((a, b) => {
    if (a.compliancePercent !== b.compliancePercent) return a.compliancePercent - b.compliancePercent;
    if (a.kpisHitCount !== b.kpisHitCount) return a.kpisHitCount - b.kpisHitCount;
    return a.repName.localeCompare(b.repName);
  });
  return sorted[0]?.repName ?? "";
}

function joinMetricList(items: string[]): string {
  if (items.length === 0) return "none";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function buildTeamRecapSentence(params: {
  team: KpiTeam;
  leader: KpiRepWeeklyCompliance;
  atRisk: KpiRepWeeklyCompliance | null;
}): string {
  const { team, leader, atRisk } = params;
  const metricKeys = KPI_COMPARISON_METRIC_KEYS_BY_TEAM[team];

  const hitMetrics = leader.metrics.filter((m) => m.hit).map((m) => metricHumanLabel(m.metricKey));
  const missedMetrics = leader.metrics.filter((m) => !m.hit).map((m) => metricHumanLabel(m.metricKey));

  const leaderShort = shortRepName(leader.repName);
  const teamLabel = team === "acquisitions" ? "acquisitions" : "dispositions";

  if (missedMetrics.length === 0 && metricKeys.length > 1) {
    return `${leaderShort} hit all ${teamLabel} KPIs and led the team in compliance.`;
  }

  const leaderHit = hitMetrics.length ? joinMetricList(hitMetrics) : "no KPIs";
  const leaderMissed = missedMetrics.length ? joinMetricList(missedMetrics) : "nothing";

  const atRiskSentence = (() => {
    if (!atRisk) return "";
    const rShort = shortRepName(atRisk.repName);
    const rHit = joinMetricList(atRisk.metrics.filter((m) => m.hit).map((m) => metricHumanLabel(m.metricKey)));
    const rMiss = joinMetricList(atRisk.metrics.filter((m) => !m.hit).map((m) => metricHumanLabel(m.metricKey)));
    // Mirror the requested example style.
    return `${rShort} hit ${rHit} but missed ${rMiss}.`;
  })();

  if (!atRiskSentence) {
    return `${leaderShort} hit ${leaderHit} but missed ${leaderMissed}.`;
  }

  // Keep it tight: leader sentence + most-at-risk sentence.
  return `${leaderShort} hit ${leaderHit} but missed ${leaderMissed}. ${atRiskSentence}`;
}

export function generateWeeklyKpiSummaryText(params: {
  weekStarting: string;
  acquisitions: { entries: KpiEntryWithRepDto[]; targets: KpiTargetsByMetricKey };
  dispositions: { entries: KpiEntryWithRepDto[]; targets: KpiTargetsByMetricKey };
}): WeeklyKpiSummaryTextOutput {
  const { weekStarting, acquisitions, dispositions } = params;

  const computeTeamReps = (team: KpiTeam, entries: KpiEntryWithRepDto[], targets: KpiTargetsByMetricKey) =>
    entries
      .map((e) =>
        computeKpiRepWeeklyCompliance({
          team,
          weekStarting,
          entry: e,
          targets,
        })
      )
      .sort((a, b) => a.repName.localeCompare(b.repName));

  const acqReps = computeTeamReps("acquisitions", acquisitions.entries, acquisitions.targets);
  const dispoReps = computeTeamReps("dispositions", dispositions.entries, dispositions.targets);

  const acqLeaderName = chooseLeader({
    reps: acqReps.map((r) => ({ repName: r.repName, compliancePercent: r.compliancePercent, kpisHitCount: r.kpisHitCount })),
  });
  const acqAtRiskName = chooseAtRisk({
    reps: acqReps.map((r) => ({ repName: r.repName, compliancePercent: r.compliancePercent, kpisHitCount: r.kpisHitCount })),
  });

  const acqLeader = acqReps.length ? acqReps.find((r) => r.repName === acqLeaderName) ?? acqReps[0] : undefined;
  const acqAtRisk = acqReps.length && acqAtRiskName ? acqReps.find((r) => r.repName === acqAtRiskName) ?? null : null;

  const dispLeaderName = chooseLeader({
    reps: dispoReps.map((r) => ({ repName: r.repName, compliancePercent: r.compliancePercent, kpisHitCount: r.kpisHitCount })),
  });
  const dispAtRiskName = chooseAtRisk({
    reps: dispoReps.map((r) => ({ repName: r.repName, compliancePercent: r.compliancePercent, kpisHitCount: r.kpisHitCount })),
  });

  const dispLeader = dispoReps.length ? dispoReps.find((r) => r.repName === dispLeaderName) ?? dispoReps[0] : undefined;
  const dispAtRisk = dispoReps.length && dispAtRiskName ? dispoReps.find((r) => r.repName === dispAtRiskName) ?? null : null;

  const acquisitionsRecap = acqLeader
    ? buildTeamRecapSentence({
        team: "acquisitions",
        leader: acqLeader,
        atRisk: acqAtRisk && acqReps.length > 1 ? acqAtRisk : null,
      })
    : "No acquisitions KPI submissions found for this week.";

  const dispositionsRecap = dispLeader
    ? buildTeamRecapSentence({
        team: "dispositions",
        leader: dispLeader,
        atRisk: dispAtRisk && dispoReps.length > 1 ? dispAtRisk : null,
      })
    : "No dispositions KPI submissions found for this week.";

  const allWeeklyReps = [...acqReps, ...dispoReps].sort((a, b) => a.repName.localeCompare(b.repName));
  const stretchFocusByRep = allWeeklyReps.map((r) => {
    const missed = r.metrics.filter((m) => !m.hit);
    if (missed.length === 0) {
      return { repName: r.repName, text: `${shortRepName(r.repName)} is on track across all KPIs.` };
    }
    const worst = missed.slice().sort((a, b) => a.varianceDailyAverage - b.varianceDailyAverage)[0]; // most negative variance first
    return { repName: r.repName, text: `${shortRepName(r.repName)}'s biggest gap was ${metricHumanLabel(worst.metricKey)}.` };
  });

  const teamTakeaway = (() => {
    const calcOverall = (reps: KpiRepWeeklyCompliance[]) => {
      const total = reps.reduce((s, r) => s + r.totalKpisTracked, 0);
      const hits = reps.reduce((s, r) => s + r.kpisHitCount, 0);
      return total > 0 ? (hits / total) * 100 : 0;
    };
    const acqCompliance = calcOverall(acqReps);
    const dispoCompliance = calcOverall(dispoReps);

    // Identify the most commonly missed metric across both teams.
    const missCounts = new Map<KpiMetricKey, number>();
    for (const r of allWeeklyReps) {
      for (const m of r.metrics) {
        if (m.hit) continue;
        missCounts.set(m.metricKey, (missCounts.get(m.metricKey) ?? 0) + 1);
      }
    }
    const mostMissed = Array.from(missCounts.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })[0];
    const mostMissedLabel = mostMissed ? metricHumanLabel(mostMissed[0]) : null;

    if (!mostMissedLabel) {
      return `Great week overall—no KPI misses detected for reporting reps (week of ${weekStarting}).`;
    }

    return `Team compliance (week of ${weekStarting}): Acquisitions ${acqCompliance.toFixed(0)}% · Dispositions ${dispoCompliance.toFixed(0)}%. Biggest opportunity: improve ${mostMissedLabel}.`;
  })();

  return {
    acquisitionsRecap,
    dispositionsRecap,
    teamTakeaway,
    stretchFocusByRep,
  };
}

export function kpiHitBadgeVariant(params: { hit: boolean; percentToGoal: number }): { className: string; label: string } {
  const { hit, percentToGoal } = params;
  const colorClass = pickColorClass(hit, percentToGoal);
  const label = hit ? "Hit" : percentToGoal >= 90 ? "Close" : "Miss";
  return { className: colorClass, label };
}

