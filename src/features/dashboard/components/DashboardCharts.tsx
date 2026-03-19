"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import type { DealMetricsDto } from "@/features/deals/server/deals.service";
import type { DashboardOverviewDto } from "@/features/dashboard/api/dashboard-client";

type Props = {
  metrics: DealMetricsDto;
  overview: DashboardOverviewDto;
};

/**
 * Recharts bundle is large; loaded dynamically from the dashboard to speed initial JS parse on other routes.
 */
export function DashboardCharts({ metrics, overview }: Props) {
  return (
    <>
      <div className="lg:col-span-3 rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-card-foreground">Deal Pipeline</h2>
          <Link href="/deals" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={metrics.pipelineByStatus} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="lg:col-span-2 rounded-lg border bg-card p-5">
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-card-foreground mb-3">Assignment Revenue Trend</h2>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={overview.assignmentRevenueTrend}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-card-foreground mb-3">Points Trend (Auto)</h2>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={overview.pointsTrend}>
                <defs>
                  <linearGradient id="ptsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v.toFixed(1)}`}
                />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`${v.toFixed(1)} pts`, "Points"]}
                />
                <Area type="monotone" dataKey="points" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#ptsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
