"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { MetricCard } from "@/components/shared/MetricCard";
import { DataTable } from "@/components/shared/DataTable";
import { useAuthz } from "@/lib/auth/authz-context";
import type { Team } from "@/types";

import { useReports } from "@/features/reports/hooks/use-reports";
import type {
  DrawExposureRow,
  DealProfitabilityRow,
  MonthlySummaryRow,
  PointsSummaryRow,
  RepPerformanceRow,
  TeamPerformanceRow,
  WeeklySummaryRow,
} from "@/features/reports/server/reports.queries";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  Area,
  AreaChart,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { FileText, DollarSign, TrendingUp, Download, Banknote, Trophy, Star } from "lucide-react";
import { toast } from "sonner";

import { reportsDatePresetSchema } from "@/features/reports/schemas";
import type { ReportsFiltersUi } from "@/features/reports/api/reports-client";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-5))", "hsl(var(--chart-3))"];
const ALL_REPS_VALUE = "__all_reps__";

export default function ReportsPage() {
  const { can } = useAuthz();
  const canReports = can("nav:reports");

  const [activeTab, setActiveTab] = useState<"revenue" | "deals" | "team" | "draws" | "points">("revenue");
  const [datePreset, setDatePreset] = useState<ReportsFiltersUi["datePreset"]>("this-month");
  const [repId, setRepId] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | "all">("all");
  const [dealStatus, setDealStatus] = useState<ReportsFiltersUi["dealStatus"]>("CLOSED_FUNDED");

  const { data, isLoading, isError, error } = useReports(
    {
      datePreset,
      repId,
      team: team === "all" ? null : team,
      dealStatus,
    },
    { enabled: canReports }
  );

  const weeklyRevenueChart = useMemo(
    () =>
      (data?.weeklySummary ?? []).map((r) => ({
        week: r.weekStarting,
        revenue: r.totalRevenue,
      })),
    [data]
  );

  const totalRevenue = useMemo(() => (data?.weeklySummary ?? []).reduce((s, r) => s + r.totalRevenue, 0), [data]);
  const fundedDealsCount = useMemo(() => (data?.weeklySummary ?? []).reduce((s, r) => s + r.fundedDeals, 0), [data]);
  const avgFee = useMemo(() => (fundedDealsCount ? totalRevenue / fundedDealsCount : 0), [totalRevenue, fundedDealsCount]);
  const drawOutstanding = useMemo(() => (data?.drawExposure ?? []).reduce((s, r) => s + r.outstandingBalance, 0), [data]);

  const dealsByStatus = useMemo(() => {
    const dist = data?.dealDistributionByStatus ?? [];
    const funded = dist.find((d) => d.status === "CLOSED_FUNDED")?.count ?? 0;
    const canceled = dist.find((d) => d.status === "CANCELED")?.count ?? 0;
    const active = dist
      .filter((d) => d.status !== "CLOSED_FUNDED" && d.status !== "CANCELED")
      .reduce((s, d) => s + d.count, 0);
    return [
      { name: "Active", value: active },
      { name: "Funded", value: funded },
      { name: "Canceled", value: canceled },
    ];
  }, [data]);

  const revenueByRep = useMemo(() => {
    const repPerf = data?.repPerformance ?? [];
    // Keep chart focused; owner/admin can still use the table in the Team tab.
    return repPerf.slice(0, 6).map((r) => ({
      name: r.repName.split(" ")[0],
      revenue: r.totalRevenue,
    }));
  }, [data]);

  const weeklyColumns = useMemo<ColumnDef<WeeklySummaryRow, any>[]>(
    () => [
      { accessorKey: "weekStarting", header: "Week Starting", cell: ({ getValue }) => <span className="font-mono">{getValue() as string}</span> },
      { accessorKey: "fundedDeals", header: "Funded Deals", meta: { align: "right" }, cell: ({ getValue }) => <span className="font-mono">{getValue() as number}</span> },
      {
        accessorKey: "totalRevenue",
        header: "Revenue",
        meta: { align: "right" },
        cell: ({ getValue }) => <span className="font-mono">${(getValue() as number).toLocaleString()}</span>,
      },
      {
        accessorKey: "avgAssignmentFee",
        header: "Avg Fee",
        meta: { align: "right" },
        cell: ({ getValue }) => <span className="font-mono">${(getValue() as number).toLocaleString()}</span>,
      },
    ],
    []
  );

  const monthlyColumns = useMemo<ColumnDef<MonthlySummaryRow, any>[]>(
    () => [
      { accessorKey: "monthLabel", header: "Month", cell: ({ row }) => <span className="font-medium">{row.original.monthLabel}</span> },
      { accessorKey: "fundedDeals", header: "Funded Deals", meta: { align: "right" }, cell: ({ getValue }) => <span className="font-mono">{getValue() as number}</span> },
      {
        accessorKey: "totalRevenue",
        header: "Revenue",
        meta: { align: "right" },
        cell: ({ getValue }) => <span className="font-mono">${(getValue() as number).toLocaleString()}</span>,
      },
      {
        accessorKey: "avgAssignmentFee",
        header: "Avg Fee",
        meta: { align: "right" },
        cell: ({ getValue }) => <span className="font-mono">${(getValue() as number).toLocaleString()}</span>,
      },
    ],
    []
  );

  const dealColumns = useMemo<ColumnDef<DealProfitabilityRow, any>[]>(
    () => [
      { accessorKey: "propertyAddress", header: "Property" },
      {
        accessorKey: "acquisitionsRepName",
        header: "Rep(s)",
        cell: ({ row }) => {
          const rep = row.original.dispositionsRepName
            ? `${row.original.acquisitionsRepName} / ${row.original.dispositionsRepName}`
            : row.original.acquisitionsRepName;
          return <span className="text-muted-foreground">{rep}</span>;
        },
      },
      {
        accessorKey: "contractPrice",
        header: "Contract",
        meta: { align: "right" },
        cell: ({ getValue }) => <span className="font-mono">${(getValue() as number).toLocaleString()}</span>,
      },
      {
        accessorKey: "assignmentFee",
        header: "Assignment Fee",
        meta: { align: "right" },
        cell: ({ getValue }) => {
          const v = getValue() as number | null;
          return v == null ? <span className="text-muted-foreground">—</span> : <span className="font-mono text-success">${v.toLocaleString()}</span>;
        },
      },
      {
        accessorKey: "marginPct",
        header: "Margin %",
        meta: { align: "right" },
        cell: ({ getValue }) => {
          const v = getValue() as number | null;
          return v == null ? <span className="text-muted-foreground">—</span> : <span className="font-mono">{v.toFixed(1)}%</span>;
        },
      },
    ],
    []
  );

  const repPerformanceColumns = useMemo<ColumnDef<RepPerformanceRow, any>[]>(
    () => [
      { accessorKey: "repName", header: "Rep" },
      {
        accessorKey: "teamCode",
        header: "Team",
        cell: ({ getValue }) => <span className="capitalize">{(getValue() as string).toLowerCase()}</span>,
      },
      { accessorKey: "fundedDeals", header: "Funded Deals", meta: { align: "right" } },
      {
        accessorKey: "totalRevenue",
        header: "Revenue",
        meta: { align: "right" },
        cell: ({ getValue }) => <span className="font-mono">${(getValue() as number).toLocaleString()}</span>,
      },
      {
        accessorKey: "avgMarginPct",
        header: "Avg Margin %",
        meta: { align: "right" },
        cell: ({ getValue }) => {
          const v = getValue() as number | null;
          return v == null ? <span className="text-muted-foreground">—</span> : <span className="font-mono">{v.toFixed(1)}%</span>;
        },
      },
      {
        accessorKey: "pointsTotal",
        header: "Points",
        meta: { align: "right" },
        cell: ({ getValue }) => <span className="font-mono">{(getValue() as number).toFixed(1).replace(/\\.0$/, "")}</span>,
      },
    ],
    []
  );

  const teamPerformanceColumns = useMemo<ColumnDef<TeamPerformanceRow, any>[]>(
    () => [
      { accessorKey: "teamName", header: "Team" },
      { accessorKey: "fundedDeals", header: "Funded Deals", meta: { align: "right" } },
      {
        accessorKey: "totalRevenue",
        header: "Revenue",
        meta: { align: "right" },
        cell: ({ getValue }) => <span className="font-mono">${(getValue() as number).toLocaleString()}</span>,
      },
      {
        accessorKey: "pointsTotal",
        header: "Points",
        meta: { align: "right" },
        cell: ({ getValue }) => <span className="font-mono">{(getValue() as number).toFixed(1).replace(/\\.0$/, "")}</span>,
      },
    ],
    []
  );

  const drawExposureColumns = useMemo<ColumnDef<DrawExposureRow, any>[]>(
    () => [
      { accessorKey: "repName", header: "Rep" },
      { accessorKey: "approvedCount", header: "Approved", meta: { align: "right" } },
      { accessorKey: "paidCount", header: "Paid", meta: { align: "right" } },
      {
        accessorKey: "outstandingBalance",
        header: "Outstanding",
        meta: { align: "right" },
        cell: ({ getValue }) => <span className="font-mono">${(getValue() as number).toLocaleString()}</span>,
      },
    ],
    []
  );

  const pointsSummaryColumns = useMemo<ColumnDef<PointsSummaryRow, any>[]>(
    () => [
      { accessorKey: "userName", header: "User" },
      {
        accessorKey: "teamCode",
        header: "Team",
        cell: ({ getValue }) => <span className="capitalize">{(getValue() as string).toLowerCase()}</span>,
      },
      { accessorKey: "roleCode", header: "Role", cell: ({ getValue }) => <span className="capitalize">{String(getValue()).replace(/_/g, " ")}</span> },
      {
        accessorKey: "totalPoints",
        header: "Points",
        meta: { align: "right" },
        cell: ({ getValue }) => <span className="font-mono">{(getValue() as number).toFixed(1).replace(/\\.0$/, "")}</span>,
      },
      { accessorKey: "autoEvents", header: "Auto Events", meta: { align: "right" } },
      { accessorKey: "manualEvents", header: "Manual Events", meta: { align: "right" } },
    ],
    []
  );

  const exportCsv = (filename: string, rows: Record<string, unknown>[]) => {
    if (!rows.length) {
      toast.error("Nothing to export");
      return;
    }
    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const v = row[h];
            if (v === null || v === undefined) return "";
            const asStr = String(v);
            // Minimal escaping for MVP CSV.
            return asStr.includes(",") || asStr.includes('"') ? `"${asStr.replace(/"/g, '""')}"` : asStr;
          })
          .join(",")
      ),
    ];

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!canReports) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto">
        <PageHeader title="Reports" description="Financial, performance, and operational reports" />
        <EmptyState
          title="No access"
          description="Company-level reports are available to managers, admins, and transaction coordinators."
        />
      </div>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Failed to load reports";
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto">
        <PageHeader title="Reports" description="Financial, performance, and operational reports" />
        <EmptyState title="Could not load reports" description={message} />
      </div>
    );
  }

  if (isLoading || !data) return <LoadingState variant="page" />;

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <PageHeader title="Reports" description="Financial, performance, and operational reports">
        <div className="flex items-center gap-2">
          <Select value={datePreset} onValueChange={(v) => setDatePreset(v as any)}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
          <Select value={repId ?? ALL_REPS_VALUE} onValueChange={(v) => setRepId(v === ALL_REPS_VALUE ? null : v)}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Rep filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_REPS_VALUE}>All reps</SelectItem>
              {(data.filterOptions.repOptions ?? []).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={team === "all" ? "all" : team}
            onValueChange={(v) => setTeam(v === "all" ? "all" : (v as Team))}
          >
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Team filter" />
            </SelectTrigger>
            <SelectContent>
              {data.filterOptions.teamOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dealStatus} onValueChange={(v) => setDealStatus(v as any)}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CLOSED_FUNDED">Funded deals only</SelectItem>
              <SelectItem value="ALL">All deals</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              const tab = activeTab;
              if (!data) return;
              if (tab === "revenue") {
                exportCsv("weekly-summary.csv", data.weeklySummary as any);
              } else if (tab === "deals") {
                exportCsv("deal-profitability.csv", data.dealProfitability as any);
              } else if (tab === "team") {
                exportCsv("rep-performance.csv", data.repPerformance as any);
              } else if (tab === "draws") {
                exportCsv("draw-exposure.csv", data.drawExposure as any);
              } else if (tab === "points") {
                exportCsv("points-summary.csv", data.pointsSummary as any);
              }
              toast.success("Export started");
            }}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} variant="success" />
        <MetricCard title="Avg Fee" value={`$${Math.round(avgFee).toLocaleString()}`} icon={TrendingUp} />
        <MetricCard title="Funded Deals" value={fundedDealsCount} icon={FileText} variant="info" />
        <MetricCard title="Draw Exposure (Approved/Paid)" value={`$${drawOutstanding.toLocaleString()}`} icon={Banknote} variant="warning" />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="deals">Deal Summary</TabsTrigger>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
          <TabsTrigger value="draws">Draw Exposure</TabsTrigger>
          <TabsTrigger value="points">Points Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Weekly Revenue</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={weeklyRevenueChart}>
                  <defs>
                    <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#revGrad2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="lg:col-span-2 rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Deal Distribution</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={dealsByStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={55}
                    paddingAngle={2}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {dealsByStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Weekly Summary (Funded Deals)</h3>
              <DataTable columns={weeklyColumns} data={data.weeklySummary} emptyMessage="No funded deals in range" />
            </div>
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Monthly Summary (Funded Deals)</h3>
              <DataTable columns={monthlyColumns} data={data.monthlySummary} emptyMessage="No funded deals in range" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold">Deal Profitability</h3>
            <DataTable columns={dealColumns} data={data.dealProfitability} emptyMessage="No deals in range" pageSize={15} />
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-4 space-y-6">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Revenue by Rep (Top)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueByRep} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => `$${v.toLocaleString()}`}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Rep Performance</h3>
              <DataTable
                columns={repPerformanceColumns}
                data={data.repPerformance}
                emptyMessage="No rep performance in range"
              />
            </div>
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Team Performance</h3>
              <DataTable
                columns={teamPerformanceColumns}
                data={data.teamPerformance}
                emptyMessage="No team performance in range"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="draws" className="mt-4">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Draw Exposure (Approved/Paid)</h3>
            <DataTable
              columns={drawExposureColumns}
              data={data.drawExposure}
              emptyMessage="No draw exposure in range"
            />
          </div>
        </TabsContent>

        <TabsContent value="points" className="mt-4">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Points Summary</h3>
            <DataTable
              columns={pointsSummaryColumns}
              data={data.pointsSummary}
              emptyMessage="No points in range"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

