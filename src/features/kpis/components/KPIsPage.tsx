"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import {
  useKpiEntries,
  useKpiWeeks,
  useKpiTrend,
  useKpiWeekSummary,
  useKpiTargets,
  useKpiFormUsers,
  useUpsertKpiEntry,
} from '@/features/kpis/hooks/use-kpis';
import { Team } from '@/types';
import { Phone, Clock, FileText, TrendingUp, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
          name={"repUserId" as any}
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
                name={def.field as any}
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
            name={"revenueFromFunded" as any}
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

  const { data: weeks } = useKpiWeeks(team);
  const { data: entries, isLoading } = useKpiEntries(team, week);
  const { data: summary } = useKpiWeekSummary(team, week);
  const { data: trendData } = useKpiTrend(team);
  const { data: targets } = useKpiTargets(team);
  const { data: repUsers } = useKpiFormUsers(team);

  useEffect(() => {
    if (!weeks?.length) return;
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

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <PageHeader title="KPI Tracking" description="Weekly performance metrics by team">
        <div className="flex items-center gap-2">
          <Select value={week} onValueChange={setWeek}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {weeks?.map((w) => (
                <SelectItem key={w} value={w}>
                  Week of {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                {repUsers && repUsers.length > 0 ? (
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
                  <div className="py-10 text-center text-muted-foreground">Loading reps…</div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </PageHeader>

      <Tabs value={team} onValueChange={(v) => setTeam(v as Team)}>
        <TabsList>
          {allowedTeams.includes("acquisitions") && <TabsTrigger value="acquisitions">Acquisitions</TabsTrigger>}
          {allowedTeams.includes("dispositions") && <TabsTrigger value="dispositions">Dispositions</TabsTrigger>}
        </TabsList>

        <TabsContent value={team} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Dials" value={summary?.totalDials ?? 0} icon={Phone} />
            <MetricCard
              title="Talk Time"
              value={
                summary
                  ? `${Math.round(summary.totalTalkTime / 60)}h ${summary.totalTalkTime % 60}m`
                  : '—'
              }
              icon={Clock}
            />
            <MetricCard title="Entries" value={summary?.repCount ?? 0} icon={FileText} subtitle="Reps reporting" />
            <MetricCard
              title="Revenue"
              value={`$${(summary?.totalRevenue ?? 0).toLocaleString()}`}
              icon={TrendingUp}
              variant="success"
            />
          </div>

          {/* Rep scorecards */}
          {isLoading ? (
            <LoadingState variant="cards" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {entries?.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border bg-card p-5 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {entry.repName.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{entry.repName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{team}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm">
                    {KPI_FIELD_DEFS[team]
                      .filter((d) => d.field !== "revenueFromFunded")
                      .map((def) => {
                        const value = (entry as any)[def.field] as number | undefined;
                        const target = targets?.[def.metricKey];
                        const isFallout = def.field === "falloutCount";

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
                            <span className="text-xs text-muted-foreground">{def.label}</span>
                            <p className={["font-semibold font-mono", isFallout ? "text-destructive" : ""].join(" ")}>
                              {valueText}
                            </p>
                            {targetText != null && (
                              <p className="text-[11px] text-muted-foreground">
                                Target: {targetText}
                              </p>
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

          {/* Trend chart */}
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Performance Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line name="Dials" type="monotone" dataKey="dials" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                <Line
                  name="Dials Target"
                  type="monotone"
                  dataKey="dialsTarget"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.5}
                  strokeDasharray="6 6"
                  dot={false}
                />
                <Line name="Revenue ($)" type="monotone" dataKey="revenue" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
                <Line
                  name="Revenue Target"
                  type="monotone"
                  dataKey="revenueTarget"
                  stroke="hsl(var(--success))"
                  strokeWidth={1.5}
                  strokeDasharray="6 6"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

