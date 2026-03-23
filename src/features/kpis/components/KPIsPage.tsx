"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { useKpiPageBundle, useUpsertKpiEntry } from '@/features/kpis/hooks/use-kpis';
import { Team } from '@/types';
import { Phone, Clock, FileText, TrendingUp, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from "@/lib/utils";
import type { KpiEntryWithRepDto, UpsertKpiEntryInput } from '@/features/kpis/server/kpis.service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from "sonner";
import { useAuthz } from "@/lib/auth/authz-context";
import { acquisitionsKpiUpsertSchema, dispositionsKpiUpsertSchema } from "@/features/kpis/schemas";
import { KPI_FIELD_DEFS, formatTalkTimeMinutes } from "@/features/kpis/utils/kpi-metrics";
import type { KpiTargetsByMetricKey } from "@/features/kpis/server/kpis.service";
import {
  computeKpiRepWeeklyCompliance,
  computeKpiTeamComplianceSummary,
  computeKpiRepHistoricalHitRates,
  generateWeeklyKpiSummaryText,
  getKpiComparisonMetricKeysForTeam,
  kpiHitBadgeVariant,
} from "@/features/kpis/lib/kpi-compliance";
import type { KpiTeam } from "@/features/kpis/lib/kpi-compliance";

const KpiTrendEChart = dynamic(
  () => import("@/features/kpis/components/KpiTrendEChart").then((m) => m.KpiTrendEChart),
  {
    ssr: false,
    loading: () => <div className="h-[280px] w-full rounded-md bg-muted/40 animate-pulse" aria-hidden />,
  }
);

const KpiTeamComplianceStripLazy = dynamic(
  () => import("@/features/kpis/components/KpiTeamComplianceStrip").then((m) => m.KpiTeamComplianceStrip),
  {
    ssr: false,
    loading: () => <div className="h-40 rounded-lg border bg-muted/30 animate-pulse" aria-hidden />,
  }
);

const KpiWeeklySummaryCardLazy = dynamic(
  () => import("@/features/kpis/components/KpiWeeklySummaryCard").then((m) => m.KpiWeeklySummaryCard),
  {
    ssr: false,
    loading: () => <div className="h-32 rounded-lg border bg-muted/30 animate-pulse" aria-hidden />,
  }
);

const kpiMotionEase = [0.22, 1, 0.36, 1] as const;

type KpiEntryNumericField =
  | "dials"
  | "talkTimeMinutes"
  | "leadsWorked"
  | "offersMade"
  | "contractsSigned"
  | "falloutCount"
  | "revenueFromFunded"
  | "buyerConversations"
  | "propertiesMarketed"
  | "emdsReceived"
  | "assignmentsSecured"
  | "avgAssignmentFee";

function getKpiEntryNumericValue(entry: KpiEntryWithRepDto, field: KpiEntryNumericField): number | undefined {
  switch (field) {
    case "dials":
      return entry.dials;
    case "talkTimeMinutes":
      return entry.talkTimeMinutes;
    case "leadsWorked":
      return entry.leadsWorked;
    case "offersMade":
      return entry.offersMade;
    case "contractsSigned":
      return entry.contractsSigned;
    case "falloutCount":
      return entry.falloutCount;
    case "revenueFromFunded":
      return entry.revenueFromFunded;
    case "buyerConversations":
      return entry.buyerConversations;
    case "propertiesMarketed":
      return entry.propertiesMarketed;
    case "emdsReceived":
      return entry.emdsReceived;
    case "assignmentsSecured":
      return entry.assignmentsSecured;
    case "avgAssignmentFee":
      return entry.avgAssignmentFee;
    default: {
      const _exhaustive: never = field;
      return _exhaustive;
    }
  }
}

function KpiEntryForm({
  team,
  weekStarting,
  repUsers,
  repUserId,
  existingEntry,
  onRepUserIdChange,
  onClose,
}: {
  team: Team;
  weekStarting: string;
  repUsers: { id: string; name: string }[];
  repUserId: string;
  existingEntry: KpiEntryWithRepDto | undefined;
  onRepUserIdChange: (id: string) => void;
  onClose: () => void;
}) {
  const schema = team === "acquisitions" ? acquisitionsKpiUpsertSchema : dispositionsKpiUpsertSchema;
  const defaults: UpsertKpiEntryInput = team === "acquisitions"
    ? {
        team: "acquisitions",
        weekStarting,
        repUserId,
        dials: existingEntry?.dials ?? 0,
        talkTimeMinutes: existingEntry?.talkTimeMinutes ?? 0,
        leadsWorked: existingEntry?.leadsWorked ?? 0,
        offersMade: existingEntry?.offersMade ?? 0,
        contractsSigned: existingEntry?.contractsSigned ?? 0,
        falloutCount: existingEntry?.falloutCount ?? 0,
        revenueFromFunded: existingEntry?.revenueFromFunded ?? 0,
      }
    : {
        team: "dispositions",
        weekStarting,
        repUserId,
        dials: existingEntry?.dials ?? 0,
        talkTimeMinutes: existingEntry?.talkTimeMinutes ?? 0,
        buyerConversations: existingEntry?.buyerConversations ?? 0,
        propertiesMarketed: existingEntry?.propertiesMarketed ?? 0,
        emdsReceived: existingEntry?.emdsReceived ?? 0,
        assignmentsSecured: existingEntry?.assignmentsSecured ?? 0,
        avgAssignmentFee: existingEntry?.avgAssignmentFee ?? 0,
        falloutCount: existingEntry?.falloutCount ?? 0,
        revenueFromFunded: existingEntry?.revenueFromFunded ?? 0,
      };

  const form = useForm<UpsertKpiEntryInput>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const upsertMutation = useUpsertKpiEntry();

  useEffect(() => {
    form.reset(defaults);
  }, [form, team, weekStarting, repUserId, existingEntry]);

  const onSubmit = async (values: UpsertKpiEntryInput) => {
    try {
      await upsertMutation.mutateAsync(values);
      toast.success(existingEntry ? "KPI entry updated" : "KPI entry submitted");
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to submit KPI entry";
      toast.error(msg);
    }
  };

  const fieldDefs = KPI_FIELD_DEFS[team];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="repUserId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Rep</FormLabel>
              <FormControl>
                <Select
                  onValueChange={(v) => {
                    field.onChange(v);
                    onRepUserIdChange(v);
                  }}
                  value={field.value ?? repUserId}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rep" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {repUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          {fieldDefs
            .filter((d) => d.field !== "revenueFromFunded")
            .map((def) => (
              <FormField
                key={def.field}
                control={form.control}
                name={def.field as keyof UpsertKpiEntryInput}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{def.label}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        step={def.kind === "int" ? 1 : 0.01}
                        {...field}
                        className="h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

          <FormField
            control={form.control}
            name="revenueFromFunded"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel className="text-xs">{KPI_FIELD_DEFS[team].find((d) => d.field === "revenueFromFunded")?.label ?? "Revenue"}</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" step={0.01} {...field} className="h-9" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={upsertMutation.isPending}>
            {existingEntry ? "Update Entry" : "Submit Entry"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function KPIsPage() {
  const { roleCode, can, user } = useAuthz();
  const [team, setTeam] = useState<Team>("acquisitions");
  const [week, setWeek] = useState("2026-03-03");
  const [entryOpen, setEntryOpen] = useState(false);
  const [repUserIdForForm, setRepUserIdForForm] = useState<string>("");

  const openEntryEditorForRep = useCallback((repUserId: string) => {
    setRepUserIdForForm(repUserId);
    setEntryOpen(true);
  }, []);

  const allowedTeams = useMemo((): Team[] => {
    if (roleCode === "REP") {
      if (user?.teamCode === "ACQUISITIONS") return ["acquisitions"];
      if (user?.teamCode === "DISPOSITIONS") return ["dispositions"];
    }
    return ["acquisitions", "dispositions"];
  }, [roleCode, user?.teamCode]);

  useEffect(() => {
    if (!allowedTeams.includes(team)) {
      setTeam(allowedTeams[0]);
    }
  }, [allowedTeams, team]);

  const { data: bundle, isPending: bundlePending, isError: bundleError, error: bundleErrorValue } = useKpiPageBundle(team, week);

  const weeks = bundle?.weeks ?? [];

  const prevWeekDerived = useMemo(() => {
    if (!weeks.length) return week;
    const idx = weeks.indexOf(week);
    if (idx === -1) return week;
    return weeks[idx + 1] ?? week;
  }, [weeks, week]);
  const prevWeekStarting = bundle ? bundle.prevWeekStarting : prevWeekDerived;

  const acquisitionsEntries = bundle?.entries?.acquisitions?.current;
  const dispositionsEntries = bundle?.entries?.dispositions?.current;
  const acquisitionsPrevEntries = bundle?.entries?.acquisitions?.previous;
  const dispositionsPrevEntries = bundle?.entries?.dispositions?.previous;

  const { data: entries, isLoading } =
    team === "acquisitions"
      ? { data: acquisitionsEntries, isLoading: bundlePending && acquisitionsEntries === undefined }
      : { data: dispositionsEntries, isLoading: bundlePending && dispositionsEntries === undefined };

  const summary = bundle?.summary;
  const trendData = bundle?.trendPoints;
  const acquisitionsTargets = bundle?.targets?.acquisitions;
  const dispositionsTargets = bundle?.targets?.dispositions;
  const { data: targets } =
    team === "acquisitions"
      ? { data: acquisitionsTargets }
      : { data: dispositionsTargets };

  const repUsers = bundle?.formUsers;
  const history = bundle?.history;

  useEffect(() => {
    if (!weeks.length) return;
    if (weeks.includes(week)) return;
    setWeek(weeks[0]);
  }, [weeks, week]);

  useEffect(() => {
    // Reset rep selection when switching teams.
    setRepUserIdForForm("");
  }, [team]);

  useEffect(() => {
    if (!entryOpen) return;
    if (repUserIdForForm) return;
    const first = repUsers?.[0]?.id;
    if (first) setRepUserIdForForm(first);
  }, [entryOpen, repUserIdForForm, repUsers]);

  const repUserIdForFormEffective = repUserIdForForm || repUsers?.[0]?.id;
  const existingEntryForForm = entries?.find((e) => e.userId === repUserIdForFormEffective);

  const kpiTeam: KpiTeam = team === "acquisitions" ? "acquisitions" : team === "dispositions" ? "dispositions" : "acquisitions";
  const kpiMetricKeysForTeam = useMemo(() => getKpiComparisonMetricKeysForTeam(kpiTeam), [kpiTeam]);

  const acqTeamCompliance = useMemo(() => {
    if (!acquisitionsTargets || !acquisitionsEntries) return null;
    return computeKpiTeamComplianceSummary({
      team: "acquisitions",
      weekStarting: week,
      entries: acquisitionsEntries,
      targets: acquisitionsTargets as KpiTargetsByMetricKey,
    });
  }, [acquisitionsEntries, acquisitionsTargets, week]);

  const dispoTeamCompliance = useMemo(() => {
    if (!dispositionsTargets || !dispositionsEntries) return null;
    return computeKpiTeamComplianceSummary({
      team: "dispositions",
      weekStarting: week,
      entries: dispositionsEntries,
      targets: dispositionsTargets as KpiTargetsByMetricKey,
    });
  }, [dispositionsEntries, dispositionsTargets, week]);

  const acqTeamCompliancePrev = useMemo(() => {
    if (!acquisitionsTargets || !acquisitionsPrevEntries) return null;
    return computeKpiTeamComplianceSummary({
      team: "acquisitions",
      weekStarting: prevWeekStarting,
      entries: acquisitionsPrevEntries,
      targets: acquisitionsTargets as KpiTargetsByMetricKey,
    });
  }, [acquisitionsPrevEntries, acquisitionsTargets, prevWeekStarting]);

  const dispoTeamCompliancePrev = useMemo(() => {
    if (!dispositionsTargets || !dispositionsPrevEntries) return null;
    return computeKpiTeamComplianceSummary({
      team: "dispositions",
      weekStarting: prevWeekStarting,
      entries: dispositionsPrevEntries,
      targets: dispositionsTargets as KpiTargetsByMetricKey,
    });
  }, [dispositionsPrevEntries, dispositionsTargets, prevWeekStarting]);

  const repWeeklyComplianceByUserId = useMemo(() => {
    if (!targets || !entries) return new Map<string, ReturnType<typeof computeKpiRepWeeklyCompliance>>();
    const m = new Map<string, ReturnType<typeof computeKpiRepWeeklyCompliance>>();
    for (const e of entries) {
      const comp = computeKpiRepWeeklyCompliance({
        team: kpiTeam,
        weekStarting: week,
        entry: e,
        targets: targets as KpiTargetsByMetricKey,
      });
      m.set(e.userId, comp);
    }
    return m;
  }, [entries, targets, kpiTeam, week]);

  const repPrevWeeklyComplianceByUserId = useMemo(() => {
    const prevEntries = team === "acquisitions" ? acquisitionsPrevEntries : dispositionsPrevEntries;
    const prevTargets = team === "acquisitions" ? acquisitionsTargets : dispositionsTargets;
    if (!prevTargets || !prevEntries) return new Map<string, ReturnType<typeof computeKpiRepWeeklyCompliance>>();

    const m = new Map<string, ReturnType<typeof computeKpiRepWeeklyCompliance>>();
    for (const e of prevEntries) {
      const comp = computeKpiRepWeeklyCompliance({
        team: kpiTeam,
        weekStarting: prevWeekStarting,
        entry: e,
        targets: prevTargets as KpiTargetsByMetricKey,
      });
      m.set(e.userId, comp);
    }
    return m;
  }, [
    team,
    acquisitionsPrevEntries,
    dispositionsPrevEntries,
    acquisitionsTargets,
    dispositionsTargets,
    kpiTeam,
    prevWeekStarting,
  ]);

  const currentTeamLeaders = useMemo(() => {
    if (!entries) return { leaderUserId: null as string | null, atRiskUserId: null as string | null };
    const list = entries
      .slice()
      .sort((a, b) => {
        const aa = repWeeklyComplianceByUserId.get(a.userId)?.compliancePercent ?? 0;
        const bb = repWeeklyComplianceByUserId.get(b.userId)?.compliancePercent ?? 0;
        if (bb !== aa) return bb - aa;
        return a.userId.localeCompare(b.userId);
      });
    const leaderUserId = list[0]?.userId ?? null;
    const atRiskUserId = list[list.length - 1]?.userId ?? null;
    return { leaderUserId, atRiskUserId };
  }, [entries, repWeeklyComplianceByUserId]);

  const repHistoricalHitRatesByUserId = useMemo(() => {
    if (!targets || !entries) return new Map<string, ReturnType<typeof computeKpiRepHistoricalHitRates>>();
    const m = new Map<string, ReturnType<typeof computeKpiRepHistoricalHitRates>>();
    if (!history || history.length === 0) return m;

    const historyByRep = new Map<string, typeof history>();
    for (const row of history) {
      const cur = historyByRep.get(row.repUserId) ?? [];
      cur.push(row);
      historyByRep.set(row.repUserId, cur);
    }

    for (const e of entries) {
      const rows = historyByRep.get(e.userId) ?? [];
      const comp = computeKpiRepHistoricalHitRates({
        team: kpiTeam,
        repUserId: e.userId,
        repName: e.repName,
        historyRows: rows,
        targets: targets as KpiTargetsByMetricKey,
      });
      m.set(e.userId, comp);
    }

    return m;
  }, [entries, history, targets, kpiTeam]);

  const weeklySummaryText = useMemo(() => {
    if (!acquisitionsEntries || !dispositionsEntries || !acquisitionsTargets || !dispositionsTargets) return null;
    if (!week) return null;
    return generateWeeklyKpiSummaryText({
      weekStarting: week,
      acquisitions: { entries: acquisitionsEntries, targets: acquisitionsTargets as KpiTargetsByMetricKey },
      dispositions: { entries: dispositionsEntries, targets: dispositionsTargets as KpiTargetsByMetricKey },
    });
  }, [acquisitionsEntries, dispositionsEntries, acquisitionsTargets, dispositionsTargets, week]);

  const weeklySummaryCopyText = useMemo(() => {
    if (!weeklySummaryText) return null;
    return [
      weeklySummaryText.acquisitionsRecap,
      weeklySummaryText.dispositionsRecap,
      "",
      weeklySummaryText.teamTakeaway,
      "",
      ...weeklySummaryText.stretchFocusByRep.map((r) => `- ${r.text}`),
    ].join("\n");
  }, [weeklySummaryText]);

  const formatWeekLabel = (weekStarting: string | null | undefined) => {
    if (!weekStarting) return "—";
    const d = new Date(`${weekStarting}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return weekStarting;
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <PageHeader title="KPI Tracking" description="Weekly performance metrics by team">
        <div className="flex items-center gap-2">
          {weeks.length > 0 ? (
            <Select
              value={weeks.includes(week) ? week : weeks[0]}
              onValueChange={setWeek}
            >
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((w) => (
                  <SelectItem key={w} value={w}>
                    Week of {formatWeekLabel(w)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="w-40 h-9 rounded-md bg-muted/60 animate-pulse" aria-hidden />
          )}
          {weeklySummaryCopyText && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(weeklySummaryCopyText);
                  toast.success("Weekly KPI summary copied");
                } catch {
                  toast.error("Failed to copy summary");
                }
              }}
            >
              Copy Weekly KPI Summary
            </Button>
          )}
          {can("kpi:new_entry") && (
            <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> New Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Submit Weekly KPI</DialogTitle>
                  <DialogDescription>
                    Enter your KPI metrics for the current week. All fields are required.
                  </DialogDescription>
                </DialogHeader>
                {bundlePending ? (
                  <div className="py-10 text-center text-muted-foreground">Loading reps…</div>
                ) : bundleError ? (
                  <div className="py-6 text-center text-sm text-destructive">
                    {bundleErrorValue instanceof Error ? bundleErrorValue.message : "Failed to load reps"}
                  </div>
                ) : repUsers && repUsers.length > 0 ? (
                  <KpiEntryForm
                    team={team}
                    weekStarting={week}
                    repUsers={repUsers}
                    repUserId={repUserIdForFormEffective || repUsers[0].id}
                    existingEntry={existingEntryForForm}
                    onRepUserIdChange={setRepUserIdForForm}
                    onClose={() => setEntryOpen(false)}
                  />
                ) : (
                  <div className="py-6 text-center text-muted-foreground">
                    No reps available for this team.
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </PageHeader>

      <Tabs value={team} onValueChange={(v) => setTeam(v as Team)} className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            View Team KPIs
          </p>
          <TabsList className="h-auto w-full max-w-md grid grid-cols-2 rounded-xl border bg-muted/70 p-1.5">
            {allowedTeams.includes("acquisitions") && (
              <TabsTrigger
                value="acquisitions"
                className="h-11 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/20"
              >
                Acquisitions
              </TabsTrigger>
            )}
            {allowedTeams.includes("dispositions") && (
              <TabsTrigger
                value="dispositions"
                className="h-11 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/20"
              >
                Dispositions
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value={team} className="space-y-6 mt-4">
          <motion.div
            key={`metrics-${team}-${week}`}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.06, delayChildren: 0.04 },
              },
            }}
          >
            <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: kpiMotionEase } } }}>
              <MetricCard title="Total Dials" value={summary?.totalDials ?? 0} icon={Phone} />
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: kpiMotionEase } } }}>
              <MetricCard
                title="Talk Time"
                value={
                  summary
                    ? `${Math.round(summary.totalTalkTime / 60)}h ${summary.totalTalkTime % 60}m`
                    : '—'
                }
                icon={Clock}
              />
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: kpiMotionEase } } }}>
              <MetricCard title="Entries" value={summary?.repCount ?? 0} icon={FileText} subtitle="Reps reporting" />
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: kpiMotionEase } } }}>
              <MetricCard
                title="Revenue"
                value={`$${(summary?.totalRevenue ?? 0).toLocaleString()}`}
                icon={TrendingUp}
                variant="success"
              />
            </motion.div>
          </motion.div>

          <KpiTeamComplianceStripLazy
            weekLabel={formatWeekLabel(week)}
            motionEase={kpiMotionEase}
            acqTeamCompliance={acqTeamCompliance}
            dispoTeamCompliance={dispoTeamCompliance}
            acqTeamCompliancePrev={acqTeamCompliancePrev}
            dispoTeamCompliancePrev={dispoTeamCompliancePrev}
          />

          {weeklySummaryText ? (
            <KpiWeeklySummaryCardLazy weeklySummaryText={weeklySummaryText} />
          ) : null}

          {/* Rep scorecards */}
          {isLoading ? (
            <LoadingState variant="cards" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {entries?.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "rounded-lg border bg-card p-5 hover:border-primary/20 transition-colors",
                    currentTeamLeaders.leaderUserId === entry.userId ? "border-success/50 ring-1 ring-success/20" : "",
                    currentTeamLeaders.atRiskUserId === entry.userId ? "border-destructive/50 ring-1 ring-destructive/20" : ""
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {entry.repName.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{entry.repName}</p>
                        <p className="text-xs text-muted-foreground capitalize">{team}</p>
                      </div>
                    </div>
                    {can("kpi:new_entry") && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs shrink-0"
                        onClick={() => openEntryEditorForRep(entry.userId)}
                      >
                        Edit weekly entry
                      </Button>
                    )}
                  </div>

                  {(() => {
                    const repCompliance = repWeeklyComplianceByUserId.get(entry.userId);
                    if (!repCompliance) return null;

                    const pct = repCompliance.compliancePercent;
                    const tone =
                      pct >= 100 ? "bg-success/10 text-success border-success/30" : pct >= 50 && pct <= 75 ? "bg-warning/10 text-warning border-warning/30" : "bg-destructive/10 text-destructive border-destructive/30";

                    return (
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">KPI Score</p>
                          <p className="text-sm font-semibold font-mono">
                            <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold", tone)}>
                              {repCompliance.kpisHitCount} / {repCompliance.totalKpisTracked}
                            </span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Compliance</p>
                          <p className="text-sm font-semibold font-mono">{repCompliance.compliancePercent.toFixed(0)}%</p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm">
                    {KPI_FIELD_DEFS[team]
                      .filter((d) => d.field !== "revenueFromFunded")
                      .map((def) => {
                        const value = getKpiEntryNumericValue(entry, def.field as KpiEntryNumericField);
                        const target = targets?.[def.metricKey];
                        const isFallout = def.field === "falloutCount";
                        const isTrackedKpi = kpiMetricKeysForTeam.includes(def.metricKey);
                        const repCompliance = repWeeklyComplianceByUserId.get(entry.userId);
                        const metricComp = repCompliance?.metrics.find((m) => m.metricKey === def.metricKey);

                        const valueText =
                          def.field === "talkTimeMinutes"
                            ? formatTalkTimeMinutes(value ?? 0)
                            : def.kind === "money"
                              ? `$${(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : (value ?? 0);

                        const targetText =
                          target == null
                            ? null
                            : def.field === "talkTimeMinutes"
                              ? formatTalkTimeMinutes(target)
                              : def.kind === "money"
                                ? `$${target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : target;

                        return (
                          <div key={def.field}>
                            {isTrackedKpi && metricComp ? (
                              <span className="text-xs text-muted-foreground hidden">{def.label}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">{def.label}</span>
                            )}
                            {isTrackedKpi && metricComp ? (
                              (() => {
                                const prevMetricComp = repPrevWeeklyComplianceByUserId.get(entry.userId)?.metrics.find((m) => m.metricKey === def.metricKey);
                                const delta = metricComp.percentToGoal - (prevMetricComp?.percentToGoal ?? metricComp.percentToGoal);
                                const trendArrow = Math.abs(delta) < 0.5 ? "→" : delta > 0 ? "↑" : "↓";

                                const dailyAvgStr =
                                  def.metricKey === "TALK_TIME_MINUTES"
                                    ? formatTalkTimeMinutes(Math.round(metricComp.actualDailyAverage))
                                    : metricComp.actualDailyAverage.toFixed(1).replace(/\.0$/, "");

                                const dailyTargetStr =
                                  def.metricKey === "TALK_TIME_MINUTES"
                                    ? formatTalkTimeMinutes(Math.round(metricComp.dailyTarget))
                                    : metricComp.dailyTarget.toFixed(1).replace(/\.0$/, "");

                                const nearMiss = !metricComp.hit && metricComp.percentToGoal >= 90 && metricComp.percentToGoal < 100;

                                const offersTier = metricComp.offers?.offersTier;
                                const offersBadge =
                                  offersTier === "HIT_TARGET"
                                    ? { emoji: "🟢", text: "Hit Target", tone: "bg-success/10 text-success border-success/30" }
                                    : offersTier === "HIT_FLOOR_ONLY"
                                      ? { emoji: "🟡", text: "Met Minimum", tone: "bg-warning/10 text-warning border-warning/30" }
                                      : { emoji: "🔴", text: "Below Minimum", tone: "bg-destructive/10 text-destructive border-destructive/30" };

                                const binaryBadge = metricComp.hit
                                  ? { emoji: "🟢", text: "Hit KPI", tone: "bg-success/10 text-success border-success/30" }
                                  : nearMiss
                                    ? { emoji: "🟡", text: "Near Miss", tone: "bg-warning/10 text-warning border-warning/30" }
                                    : { emoji: "🔴", text: "Missed KPI", tone: "bg-destructive/10 text-destructive border-destructive/30" };

                                const varianceTone = metricComp.offers
                                  ? offersTier === "HIT_FLOOR_ONLY"
                                    ? "text-warning"
                                    : offersTier === "HIT_TARGET"
                                      ? "text-success"
                                      : "text-destructive"
                                  : metricComp.hit
                                    ? "text-success"
                                    : nearMiss
                                      ? "text-warning"
                                      : "text-destructive";

                                const variancePrefix = metricComp.offers
                                  ? offersTier === "HIT_TARGET"
                                    ? "✅"
                                    : offersTier === "HIT_FLOOR_ONLY"
                                      ? "🟡"
                                      : "❌"
                                  : metricComp.hit
                                    ? "✅"
                                    : nearMiss
                                      ? "✅"
                                      : "❌";

                                const totalLine =
                                  metricComp.offers ? (
                                    `Offers: ${metricComp.actualTotal.toLocaleString()}`
                                  ) : def.metricKey === "TALK_TIME_MINUTES" ? (
                                    `Talk Time: ${formatTalkTimeMinutes(metricComp.actualTotal)}`
                                  ) : (
                                    `${def.metricKey === "DIALS" ? "Dials" : def.metricKey === "CONTRACTS_SIGNED" ? "Contracts" : def.label}: ${metricComp.actualTotal.toLocaleString()}`
                                  );

                                return (
                                  <>
                                    <p className="text-sm font-semibold font-mono leading-tight">{totalLine}</p>

                                    {metricComp.offers ? (
                                      <>
                                        <div className="flex items-center justify-between gap-2 mt-1">
                                          <span
                                            className={cn(
                                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border",
                                              offersBadge.tone
                                            )}
                                          >
                                            {offersBadge.emoji} {offersBadge.text}
                                          </span>
                                          <span className={cn("text-[11px] font-medium", varianceTone)}>{trendArrow}</span>
                                        </div>

                                        <p className="text-[11px] text-muted-foreground mt-1 font-semibold">
                                          {dailyAvgStr}/day avg • Minimum: {metricComp.offers.floorDailyTarget.toFixed(0).replace(/\.0$/, "")}/day • Target:{" "}
                                          {metricComp.dailyTarget.toFixed(0).replace(/\.0$/, "")}/day
                                        </p>
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-[11px] text-muted-foreground mt-1 font-semibold">
                                          {dailyAvgStr}/day avg • KPI: {dailyTargetStr}/day
                                        </p>

                                        <div className="flex items-center justify-between gap-2 mt-1">
                                          <span
                                            className={cn(
                                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border",
                                              binaryBadge.tone
                                            )}
                                          >
                                            {binaryBadge.emoji} {binaryBadge.text}
                                          </span>
                                          <span className={cn("text-[11px] font-medium", varianceTone)}>{trendArrow}</span>
                                        </div>
                                      </>
                                    )}

                                    <p className={cn("text-[11px] leading-4 mt-1 font-semibold", varianceTone)}>
                                      {variancePrefix} {metricComp.varianceText}
                                    </p>
                                  </>
                                );
                              })()
                            ) : (
                              <>
                                <p className={["font-semibold font-mono", isFallout ? "text-destructive" : ""].join(" ")}>
                                  {valueText}
                                </p>
                                {targetText != null && (
                                  <p className="text-[11px] text-muted-foreground">Target: {targetText}</p>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}

                    <div className="col-span-2 pt-1 border-t">
                      <span className="text-xs text-muted-foreground">Revenue</span>
                      <p className="font-semibold text-success font-mono">
                        ${entry.revenueFromFunded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      {targets?.REVENUE_FROM_FUNDED != null && (
                        <p className="text-[11px] text-muted-foreground">
                          Target: ${targets.REVENUE_FROM_FUNDED.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Historical hit rates */}
                  {(() => {
                    const repHistory = repHistoricalHitRatesByUserId.get(entry.userId);
                    if (!repHistory) return null;
                    return (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-baseline justify-between gap-4 mb-3">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Historical KPI Hit Rate</h4>
                          <span className="text-[11px] text-muted-foreground font-mono">{repHistory.weeksCounted} weeks</span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                          {repHistory.metrics.map((m) => (
                            <div key={m.metricKey} className="space-y-1">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-xs text-muted-foreground truncate">{m.metricLabel}</span>
                                <span className="text-xs font-semibold font-mono">{m.hitRatePercent.toFixed(0)}%</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                      m.hitRatePercent >= 100
                                        ? "bg-success"
                                        : m.hitRatePercent >= 90
                                          ? "bg-warning"
                                          : "bg-destructive"
                                  )}
                                  style={{ width: `${Math.min(100, Math.max(0, m.hitRatePercent))}%` }}
                                />
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                {m.hitWeeks}/{m.totalWeeksCounted} weeks
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}

              {entries?.length === 0 && (
                <div className="col-span-2 rounded-lg border border-dashed bg-card p-12 text-center text-muted-foreground">
                  <p className="font-medium">No KPI entries for this week</p>
                  <p className="text-sm mt-1">Click "New Entry" to submit weekly metrics</p>
                </div>
              )}
            </div>
          )}

          {/* Trend chart (ECharts, code-split) */}
          <motion.div
            key={`trend-${team}`}
            className="rounded-lg border bg-card p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: kpiMotionEase }}
          >
            <h3 className="text-sm font-semibold mb-4">Performance Trend</h3>
            <KpiTrendEChart data={trendData ?? []} />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

