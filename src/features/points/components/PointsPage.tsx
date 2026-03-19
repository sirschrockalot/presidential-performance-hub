"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { DataTable } from '@/components/shared/DataTable';
import { useCreateManualPointAdjustment, usePointEvents, usePointRecipients, useLeaderboard, usePointsMetrics } from '@/features/points/hooks/use-points';
import type { PointEventRowDto } from '@/features/points/api/points-client';
import { useAuthz } from "@/lib/auth/authz-context";
import { Trophy, Star, TrendingUp, Award, Plus, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { ManualPointAdjustmentModal } from "@/features/points/components/ManualPointAdjustmentModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function PointsPage() {
  const { dataScope, can } = useAuthz();
  const { data: leaderboard } = useLeaderboard();
  const { data: events } = usePointEvents();
  const { data: metrics } = usePointsMetrics();
  const { data: recipients = [] } = usePointRecipients();
  const adj = useCreateManualPointAdjustment();
  const [adjustOpen, setAdjustOpen] = useState(false);

  const chartData = useMemo(() => leaderboard?.map((l) => ({ name: l.name.split(" ")[0], points: l.points })) ?? [], [leaderboard]);

  const pointColumns = useMemo<ColumnDef<PointEventRowDto, any>[]>(
    () => [
      {
        accessorKey: 'userId',
        header: 'Rep',
        cell: ({ row }) => <span className="font-medium">{row.original.userName}</span>,
      },
      {
        accessorKey: 'dealId',
        header: 'Deal',
        cell: ({ row }) => {
          const dealId = row.original.dealId;
          if (!dealId) return <span className="text-muted-foreground">—</span>;
          return (
            <Link href={`/deals/${dealId}`} className="text-sm hover:underline">
              {row.original.dealAddress ?? dealId}
            </Link>
          );
        },
      },
      {
        accessorKey: 'reason',
        header: 'Reason',
        cell: ({ getValue }) => <span className="text-muted-foreground text-xs">{getValue() as string}</span>,
      },
      {
        accessorKey: 'points',
        header: 'Points',
        meta: { align: 'right' },
        cell: ({ getValue }) => {
          const pts = getValue() as number;
          const label = pts >= 0 ? `+${pts}` : `${pts}`;
          return <span className="font-bold text-success font-mono">{label}</span>;
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() as string}</span>,
      },
      {
        accessorKey: 'isManualAdjustment',
        header: 'Type',
        cell: ({ getValue }) =>
          getValue() ? (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-warning/15 text-warning">Manual</span>
          ) : (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-success/15 text-success">Auto</span>
          ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <PageHeader title="Points & Profit Sharing" description="Million-dollar profit sharing tracking">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs space-y-1 p-3">
              <p className="font-semibold">Points Rules:</p>
              <p>Base = 2 pts per funded deal</p>
              <p>Under $8K fee = −1 point penalty</p>
              <p>$10K+ = +1 · $15K+ = +2 · $20K+ = +3 bonus</p>
              <p>TC always receives 0.5 pts</p>
              <p className="pt-1 border-t mt-1">Examples: $7.5K=1pt · $8K=2pt · $10K=3pt · $15K=4pt · $20K=5pt</p>
            </TooltipContent>
          </Tooltip>

          {can("points:manual_adjust") && (
            <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Manual Adjustment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manual Points Adjustment</DialogTitle>
                  <DialogDescription>Admin-only: add or remove points with an audit trail.</DialogDescription>
                </DialogHeader>
                <ManualPointAdjustmentModal
                  onClose={() => setAdjustOpen(false)}
                  recipients={recipients}
                  isSubmitting={adj.isPending}
                  onSubmit={(input) => {
                    adj.mutate(input, {
                      onSuccess: () => {
                        toast.success("Points adjustment recorded");
                        setAdjustOpen(false);
                      },
                      onError: (e) => {
                        const msg = e instanceof Error ? e.message : "Failed to submit adjustment";
                        toast.error(msg);
                      },
                    });
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={dataScope.mode === "rep" ? "Your Points (visible scope)" : "Total Company Points"}
          value={metrics?.totalCompanyPoints ?? 0}
          icon={Trophy}
          variant="info"
        />
        <MetricCard
          title="Top Performer"
          value={leaderboard?.[0]?.name.split(" ")[0] ?? "—"}
          icon={Award}
          subtitle={`${leaderboard?.[0]?.points ?? 0} points`}
          variant="success"
        />
        <MetricCard title="Funded Deals" value={metrics?.fundedDeals ?? 0} icon={Star} />
        <MetricCard title="Manual Adjustments" value={metrics?.manualAdjustments ?? 0} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Points by Rep</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <ReTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gold" /> Leaderboard
          </h3>
          <div className="space-y-3">
            {leaderboard?.map((entry, i) => (
              <div key={entry.userId} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/30 transition-colors">
                <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold ${i === 0 ? 'bg-gold/20 text-gold' : i === 1 ? 'bg-muted-foreground/10 text-muted-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {entry.team} · {entry.role.replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold font-mono">{entry.points}</p>
                  <p className="text-[11px] text-muted-foreground">{entry.dealEventCount} deals</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Point Events</h3>
        <DataTable columns={pointColumns} data={events ?? []} emptyMessage="No point events" />
      </div>
    </div>
  );
}

