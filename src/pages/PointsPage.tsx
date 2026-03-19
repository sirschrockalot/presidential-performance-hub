import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { DataTable } from '@/components/shared/DataTable';
import { usePointEvents, useLeaderboard, usePointsMetrics } from '@/hooks/use-points';
import { PointEvent } from '@/types';
import { deals, getUserById } from '@/data/mock-data';
import { Trophy, Star, TrendingUp, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function PointsPage() {
  const { data: leaderboard } = useLeaderboard(['u5', 'u6', 'u7', 'u8', 'u4']);
  const { data: events } = usePointEvents();
  const { data: metrics } = usePointsMetrics();

  const chartData = useMemo(
    () => leaderboard?.map(l => ({ name: l.name.split(' ')[0], points: l.points })) ?? [],
    [leaderboard]
  );

  const pointColumns = useMemo<ColumnDef<PointEvent, any>[]>(
    () => [
      {
        accessorKey: 'userId',
        header: 'Rep',
        cell: ({ getValue }) => <span className="font-medium">{getUserById(getValue() as string)?.name}</span>,
      },
      { accessorKey: 'reason', header: 'Reason', cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() as string}</span> },
      {
        accessorKey: 'points',
        header: 'Points',
        meta: { align: 'right' },
        cell: ({ getValue }) => <span className="font-bold text-success">+{getValue() as number}</span>,
      },
      { accessorKey: 'createdAt', header: 'Date', cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() as string}</span> },
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
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Points & Profit Sharing" description="Track million-dollar profit sharing points across the team" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Company Points" value={metrics?.totalCompanyPoints ?? 0} icon={Trophy} variant="info" />
        <MetricCard title="Top Performer" value={leaderboard?.[0]?.name.split(' ')[0] ?? '—'} icon={Award} subtitle={`${leaderboard?.[0]?.points ?? 0} points`} variant="success" />
        <MetricCard title="Funded Deals" value={deals.filter(d => d.status === 'closed_funded').length} icon={Star} />
        <MetricCard title="Manual Adjustments" value={metrics?.manualAdjustments ?? 0} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Points by Rep</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="points" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Trophy className="h-4 w-4 text-gold" /> Leaderboard</h3>
          <div className="space-y-4">
            {leaderboard?.map((entry, i) => (
              <div key={entry.userId} className="flex items-center gap-3">
                <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold ${i === 0 ? 'bg-gold text-gold-foreground' : i === 1 ? 'bg-muted text-muted-foreground' : 'bg-muted/50 text-muted-foreground'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{entry.team} · {entry.role.replace('_', ' ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{entry.points} pts</p>
                  <p className="text-xs text-muted-foreground">{entry.dealEventCount} events</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Point events table */}
      <div>
        <div className="mb-3"><h3 className="text-sm font-semibold">Point Events</h3></div>
        <DataTable columns={pointColumns} data={events ?? []} emptyMessage="No point events" />
      </div>
    </div>
  );
}
