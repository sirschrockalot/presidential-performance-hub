"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { LoadingState } from "@/components/shared/LoadingState";
import { DataTable } from "@/components/shared/DataTable";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useAuthz } from "@/lib/auth/authz-context";
import type { Team } from "@/types";

import { useKpiHistory, useKpiFormUsers, useKpiTargets } from "@/features/kpis/hooks/use-kpis";
import { KPI_FIELD_DEFS, formatTalkTimeMinutes } from "@/features/kpis/utils/kpi-metrics";
import type { KpiHistoryRowDto } from "@/features/kpis/server/kpis.service";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

import { Phone, Clock, TrendingUp } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function KpiRepScorecardPage() {
  const { user, roleCode } = useAuthz();

  const allowedTeams = useMemo((): Team[] => {
    if (roleCode === "REP") {
      if (user?.teamCode === "ACQUISITIONS") return ["acquisitions"];
      if (user?.teamCode === "DISPOSITIONS") return ["dispositions"];
    }
    return ["acquisitions", "dispositions"];
  }, [roleCode, user?.teamCode]);

  const [team, setTeam] = useState<Team>(allowedTeams[0]);
  useEffect(() => {
    if (!allowedTeams.includes(team)) setTeam(allowedTeams[0]);
  }, [allowedTeams, team]);

  const { data: repUsers } = useKpiFormUsers(team);
  const [selectedRepId, setSelectedRepId] = useState<string>("");

  useEffect(() => {
    if (roleCode === "REP") {
      setSelectedRepId(user?.id ?? "");
      return;
    }
    if (!repUsers || repUsers.length === 0) return;
    setSelectedRepId((cur) => cur || repUsers[0].id);
  }, [roleCode, user?.id, repUsers]);

  const repId = roleCode === "REP" ? (user?.id ?? "") : selectedRepId;

  const { data: history, isLoading } = useKpiHistory(team);
  const { data: targets } = useKpiTargets(team);
  const repHistory = useMemo(() => (history ?? []).filter((h) => h.repUserId === repId), [history, repId]);

  const availableWeeks = useMemo(() => {
    const w = [...new Set(repHistory.map((h) => h.weekStarting))];
    w.sort().reverse();
    return w;
  }, [repHistory]);

  const [week, setWeek] = useState<string>("");
  useEffect(() => {
    if (!availableWeeks.length) {
      setWeek("");
      return;
    }
    setWeek((cur) => (cur && availableWeeks.includes(cur) ? cur : availableWeeks[0]));
  }, [availableWeeks]);

  const current = repHistory.find((r) => r.weekStarting === week);
  const repName = current?.repName ?? repHistory[0]?.repName ?? (roleCode === "REP" ? user?.name : undefined) ?? "Rep";

  const chartPoints = useMemo(() => {
    const points = availableWeeks
      .slice()
      .sort() // asc
      .map((wFull) => {
        const row = repHistory.find((r) => r.weekStarting === wFull);
        const dials = row?.dials ?? 0;
        const talkTime = row?.talkTimeMinutes ?? 0;
        const revenue = row?.revenueFromFunded ?? 0;
        return {
          week: wFull.slice(5),
          weekFull: wFull,
          dials,
          talkTime,
          revenue,
          entryCount: row ? 1 : 0,
          dialsTarget: targets?.DIALS ?? undefined,
          revenueTarget: targets?.REVENUE_FROM_FUNDED ?? undefined,
        };
      });
    return points;
  }, [availableWeeks, repHistory, targets]);

  const columns = useMemo((): ColumnDef<KpiHistoryRowDto>[] => {
    if (team === "acquisitions") {
      return [
        {
          accessorKey: "weekStarting",
          header: "Week",
          cell: ({ getValue }) => <span className="font-mono">{(getValue() as string).slice(5)}</span>,
        },
        { accessorKey: "dials", header: "Dials", meta: { align: "right" } },
        { accessorKey: "talkTimeMinutes", header: "Talk Time (min)", meta: { align: "right" } },
        { accessorKey: "leadsWorked", header: "Leads", meta: { align: "right" } },
        { accessorKey: "offersMade", header: "Offers", meta: { align: "right" } },
        { accessorKey: "contractsSigned", header: "Contracts", meta: { align: "right" } },
        { accessorKey: "falloutCount", header: "Fallout", meta: { align: "right" } },
        { accessorKey: "revenueFromFunded", header: "Revenue", meta: { align: "right" } },
      ];
    }

    return [
      {
        accessorKey: "weekStarting",
        header: "Week",
        cell: ({ getValue }) => <span className="font-mono">{(getValue() as string).slice(5)}</span>,
      },
      { accessorKey: "dials", header: "Dials", meta: { align: "right" } },
      { accessorKey: "talkTimeMinutes", header: "Talk Time (min)", meta: { align: "right" } },
      { accessorKey: "buyerConversations", header: "Buyer Convos", meta: { align: "right" } },
      { accessorKey: "propertiesMarketed", header: "Marketed", meta: { align: "right" } },
      { accessorKey: "emdsReceived", header: "EMDs", meta: { align: "right" } },
      { accessorKey: "assignmentsSecured", header: "Assignments", meta: { align: "right" } },
      { accessorKey: "avgAssignmentFee", header: "Avg Fee", meta: { align: "right" } },
      { accessorKey: "falloutCount", header: "Fallout", meta: { align: "right" } },
      { accessorKey: "revenueFromFunded", header: "Revenue", meta: { align: "right" } },
    ];
  }, [team]);

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <PageHeader
        title="Rep Scorecard"
        description={roleCode === "REP" ? `Your weekly KPIs for ${team}` : `Weekly KPIs for ${repName}`}
      >
        {roleCode !== "REP" && (
          <Select value={selectedRepId} onValueChange={setSelectedRepId}>
            <SelectTrigger className="w-64 h-9">
              <SelectValue placeholder="Select rep" />
            </SelectTrigger>
            <SelectContent>
              {repUsers?.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </PageHeader>

      <Tabs value={team} onValueChange={(v) => setTeam(v as Team)}>
        <TabsList>
          {allowedTeams.includes("acquisitions") && <TabsTrigger value="acquisitions">Acquisitions</TabsTrigger>}
          {allowedTeams.includes("dispositions") && <TabsTrigger value="dispositions">Dispositions</TabsTrigger>}
        </TabsList>

        <TabsContent value={team} className="space-y-6 mt-4">
          {isLoading ? (
            <LoadingState variant="cards" />
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Dials" value={current?.dials ?? 0} icon={Phone} />
                <MetricCard
                  title="Talk Time"
                  value={current ? formatTalkTimeMinutes(current.talkTimeMinutes) : "—"}
                  icon={Clock}
                />
                <MetricCard
                  title="Fallout"
                  value={current?.falloutCount ?? 0}
                  subtitle="Count"
                />
                <MetricCard
                  title="Revenue"
                  value={current ? formatMoney(current.revenueFromFunded) : "—"}
                  icon={TrendingUp}
                  variant="success"
                />
              </div>

              <div className="rounded-lg border bg-card p-5">
                <h3 className="text-sm font-semibold mb-4">Performance Trend</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
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

              <div className="flex items-center gap-2">
                <Select value={week} onValueChange={setWeek}>
                  <SelectTrigger className="w-44 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWeeks.map((w) => (
                      <SelectItem key={w} value={w}>
                        Week of {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border bg-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {repName.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{repName}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {team} · {week ? `Week of ${week}` : ""}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm">
                  {current ? (
                    <>
                      {KPI_FIELD_DEFS[team]
                        .filter((d) => d.field !== "revenueFromFunded")
                        .map((def) => {
                          const value = (current as any)[def.field] as number | undefined;
                          const target = targets?.[def.metricKey];
                          const isFallout = def.field === "falloutCount";

                          const valueText =
                            def.field === "talkTimeMinutes"
                              ? formatTalkTimeMinutes(value ?? 0)
                              : def.kind === "money"
                                ? formatMoney(value ?? 0)
                                : String(value ?? 0);

                          const targetText =
                            target == null
                              ? null
                              : def.field === "talkTimeMinutes"
                                ? formatTalkTimeMinutes(target)
                                : def.kind === "money"
                                  ? formatMoney(target)
                                  : String(target);

                          return (
                            <div key={def.field}>
                              <span className="text-xs text-muted-foreground">{def.label}</span>
                              <p className={["font-semibold font-mono", isFallout ? "text-destructive" : ""].join(" ")}>
                                {valueText}
                              </p>
                              {targetText != null && (
                                <p className="text-[11px] text-muted-foreground">Target: {targetText}</p>
                              )}
                            </div>
                          );
                        })}

                      <div className="col-span-2 pt-1 border-t">
                        <span className="text-xs text-muted-foreground">Revenue</span>
                        <p className="font-semibold text-success font-mono">{formatMoney(current.revenueFromFunded)}</p>
                        {targets?.REVENUE_FROM_FUNDED != null && (
                          <p className="text-[11px] text-muted-foreground">
                            Target: {formatMoney(targets.REVENUE_FROM_FUNDED)}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 text-sm text-muted-foreground">No entry for this week.</div>
                  )}
                </div>
              </div>

              <DataTable
                columns={columns}
                data={repHistory.slice().sort((a, b) => b.weekStarting.localeCompare(a.weekStarting))}
                emptyMessage="No KPI history found"
                pageSize={10}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

