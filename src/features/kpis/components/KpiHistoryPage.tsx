"use client";

import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { LoadingState } from "@/components/shared/LoadingState";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useAuthz } from "@/lib/auth/authz-context";
import { type Team } from "@/types";

import { useKpiHistory, useKpiTargets } from "@/features/kpis/hooks/use-kpis";
import { KPI_FIELD_DEFS, formatTalkTimeMinutes } from "@/features/kpis/utils/kpi-metrics";
import type { KpiHistoryRowDto } from "@/features/kpis/server/kpis.service";
import { ColumnDef } from "@tanstack/react-table";

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function KpiHistoryPage() {
  const ALL_WEEKS_VALUE = "__all_weeks__";
  const { user, roleCode } = useAuthz();

  const allowedTeams = useMemo((): Team[] => {
    if (roleCode === "REP") {
      if (user?.teamCode === "ACQUISITIONS") return ["acquisitions"];
      if (user?.teamCode === "DISPOSITIONS") return ["dispositions"];
    }
    return ["acquisitions", "dispositions"];
  }, [roleCode, user?.teamCode]);

  const [team, setTeam] = useState<Team>("acquisitions");
  const [weekFilter, setWeekFilter] = useState<string>(ALL_WEEKS_VALUE); // optional client-side filter

  useEffect(() => {
    if (!allowedTeams.includes(team)) setTeam(allowedTeams[0]);
  }, [allowedTeams, team]);

  const { data: history, isLoading } = useKpiHistory(team);
  const { data: targets } = useKpiTargets(team);

  const weeks = useMemo(() => {
    const raw = history?.map((h) => h.weekStarting) ?? [];
    return [...new Set(raw)].sort().reverse();
  }, [history]);

  const filtered = useMemo(() => {
    if (weekFilter === ALL_WEEKS_VALUE) return history ?? [];
    return (history ?? []).filter((h) => h.weekStarting === weekFilter);
  }, [history, weekFilter]);

  const columns = useMemo((): ColumnDef<KpiHistoryRowDto>[] => {
    const base: ColumnDef<KpiHistoryRowDto>[] = [
      {
        accessorKey: "weekStarting",
        header: "Week",
        cell: ({ getValue }) => {
          const w = getValue() as string;
          return <span className="font-mono">{w.slice(5)}</span>;
        },
      },
      {
        accessorKey: "repName",
        header: "Rep",
        meta: { className: "hidden md:table-cell" },
      },
    ];

    const metricCols = KPI_FIELD_DEFS[team].map((def) => {
      const accessorKey = def.field as keyof KpiHistoryRowDto;
      return {
        accessorKey,
        header: def.label,
        meta: { align: "right" },
        cell: ({ getValue, row }) => {
          const v = getValue() as number | undefined;
          const target = targets?.[def.metricKey];

          const valueText =
            v == null
              ? "—"
              : def.field === "talkTimeMinutes"
                ? formatTalkTimeMinutes(v)
                : def.kind === "money"
                  ? formatMoney(v)
                  : String(v);

          const targetText =
            target == null
              ? null
              : def.field === "talkTimeMinutes"
                ? formatTalkTimeMinutes(target)
                : def.kind === "money"
                  ? formatMoney(target)
                  : String(target);

          const isFallout = def.field === "falloutCount";

          return (
            <div className="flex flex-col items-end gap-0.5">
              <span className={["font-mono", isFallout ? "text-destructive font-semibold" : ""].join(" ")}>
                {valueText}
              </span>
              {targetText && (
                <span className="text-[11px] text-muted-foreground leading-tight">Tgt {targetText}</span>
              )}
            </div>
          );
        },
      } satisfies ColumnDef<KpiHistoryRowDto>;
    });

    return [...base, ...metricCols];
  }, [targets, team]);

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <PageHeader title="KPI History" description="Weekly KPI submissions with targets">
        <div className="flex items-center gap-2">
          <Select value={weekFilter} onValueChange={setWeekFilter}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="All weeks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_WEEKS_VALUE}>All weeks</SelectItem>
              {weeks.map((w) => (
                <SelectItem key={w} value={w}>
                  Week of {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      <Tabs value={team} onValueChange={(v) => setTeam(v as Team)}>
        <TabsList>
          {allowedTeams.includes("acquisitions") && (
            <TabsTrigger value="acquisitions">Acquisitions</TabsTrigger>
          )}
          {allowedTeams.includes("dispositions") && (
            <TabsTrigger value="dispositions">Dispositions</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value={team} className="space-y-6 mt-4">
          {isLoading ? (
            <LoadingState variant="cards" />
          ) : (
            <DataTable
              columns={columns}
              data={filtered ?? []}
              emptyMessage="No KPI history found"
              pageSize={15}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

