import { useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useDealMetrics } from '@/hooks/use-deals';
import { useLeaderboard } from '@/hooks/use-points';
import { useDrawMetrics } from '@/hooks/use-draws';
import { deals, getUserById, kpiEntries, users } from '@/data/mock-data';
import { DollarSign, Handshake, TrendingUp, Banknote, Trophy, Users, BarChart3, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

const recentDeals = [...deals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

export default function Dashboard() {
  const { data: metrics } = useDealMetrics();
  const { data: drawMetrics } = useDrawMetrics();
  const { data: leaderboard } = useLeaderboard(['u5', 'u6', 'u7', 'u8']);
  const totalPoints = useMemo(() => leaderboard?.reduce((s, e) => s + e.points, 0) ?? 0, [leaderboard]);

  if (!metrics) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <PageHeader title="Dashboard" description="Executive overview of deals, performance, and financials" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Dashboard" description="Executive overview of deals, performance, and financials" />

      {/* Metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Active Deals" value={metrics.activeCount} icon={Handshake} subtitle="In pipeline" variant="info" />
        <MetricCard title="Total Revenue" value={`$${metrics.totalRevenue.toLocaleString()}`} icon={DollarSign} trend={{ value: 12, label: 'vs last month' }} variant="success" />
        <MetricCard title="Avg Assignment Fee" value={`$${metrics.avgFee.toLocaleString()}`} icon={TrendingUp} subtitle={`${metrics.fundedCount} funded deals`} />
        <MetricCard title="Outstanding Draws" value={`$${(drawMetrics?.outstanding ?? 0).toLocaleString()}`} icon={Banknote} variant="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline chart */}
        <div className="lg:col-span-2 rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-card-foreground">Deal Pipeline</h2>
            <Link to="/deals" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={metrics.pipelineByStatus} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Leaderboard */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-gold" /> Leaderboard
            </h2>
            <Link to="/points" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {leaderboard?.map((entry, i) => (
              <div key={entry.userId} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {entry.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{entry.team}</p>
                </div>
                <span className="text-sm font-bold">{entry.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent deals and quick stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-card-foreground">Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {recentDeals.map(deal => (
              <Link key={deal.id} to={`/deals/${deal.id}`} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{deal.propertyAddress}</p>
                  <p className="text-xs text-muted-foreground">{deal.sellerName} · {getUserById(deal.acquisitionsRepId)?.name}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  {deal.assignmentFee && <span className="text-sm font-medium text-success">${deal.assignmentFee.toLocaleString()}</span>}
                  <StatusBadge status={deal.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <MetricCard title="Total Points" value={totalPoints} icon={Trophy} subtitle="All reps combined" variant="info" />
          <MetricCard title="Team Size" value={users.filter(u => u.active).length} icon={Users} subtitle={`${users.filter(u => !u.active).length} inactive`} />
          <MetricCard title="Weekly KPI Entries" value={kpiEntries.filter(k => k.weekStarting === '2026-03-03').length} icon={BarChart3} subtitle="This week" />
        </div>
      </div>
    </div>
  );
}
