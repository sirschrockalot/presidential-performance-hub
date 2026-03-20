"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as ReTooltip, XAxis, YAxis } from "recharts";

const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

type Row = { name: string; points: number };

type Props = {
  chartData: Row[];
};

/** Recharts bar chart — code-split from Points page for lighter first paint. */
export function PointsByRepBarChart({ chartData }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} barSize={36}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <ReTooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="points" radius={[4, 4, 0, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
