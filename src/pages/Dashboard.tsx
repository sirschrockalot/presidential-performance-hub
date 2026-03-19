import { useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ActivityFeed } from '@/components/shared/ActivityFeed';
import { useDealMetrics } from '@/hooks/use-deals';
import { useLeaderboard } from '@/hooks/use-points';
import { useDrawMetrics } from '@/hooks/use-draws';
import { activityFeed } from '@/data/activity-feed';
import { deals, getUserById, kpiEntries, users } from '@/data/mock-data';
import { DollarSign, Handshake, TrendingUp, Banknote, Trophy, Users, BarChart3, ArrowRight, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import { LoadingState } from '@/components/shared/LoadingState';

const recentDeals = [...deals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

// Monthly revenue trend mock
const revenueTrend = [
  { month: 'Oct', revenue: 28000 },
  { month: 'Nov', revenue: 10000 },
  { month: 'Dec', revenue: 35000 },
  { month: 'Jan', revenue: 47500 },
  { month: 'Feb', revenue: 40500 },
  { month: 'Mar', revenue: 35000 },
];

export default function Dashboard() {
  const { data: metrics } = useDealMetrics();
  const { data: drawMetrics } = useDrawMetrics();
  const { data: leaderboard } = useLeaderboard(['u5', 'u6', 'u7', 'u8']);
  const totalPoints = useMemo(() => leaderboard?.reduce((s, e) => s + e.points, 0) ?? 0, [leaderboard]);

  if (!metrics) return <LoadingState variant="page" />;

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <PageHeader title="Dashboard" description="Executive overview of operations, deals, and team performance" />

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Active Deals" value={metrics.activeCount} icon={Handshake} subtitle="In pipeline" variant="info" />
        <MetricCard title="Total Revenue" value={`$${metrics.totalRevenue.toLocaleString()}`} icon={DollarSign} trend={{ value: 12, label: 'vs last month' }} variant="success" />
        <MetricCard title="Avg Assignment Fee" value={`$${metrics.avgFee.toLocaleString()}`} icon={TrendingUp} subtitle={`${metrics.fundedCount} funded deals`} />
        <MetricCard title="Outstanding Draws" value={`$${(drawMetrics?.outstanding ?? 0).toLocaleString()}`} icon={Banknote} variant="warning" />
      </div>

      {/* Row 2: Pipeline + Revenue trend */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-card-foreground">Deal Pipeline</h2>
            <Link to="/deals" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metrics.pipelineByStatus} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 rounded-lg border bg-card p-5">
          <h2 className="text-sm font-semibold text-card-foreground mb-4">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Leaderboard + Activity + Quick stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-3 rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-gold" /> Leaderboard
            </h2>
            <Link to="/points" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {leaderboard?.map((entry, i) => (
              <div key={entry.userId} className="flex items-center gap-3">
                <div className={`flex items-center justify-center h-7 w-7 rounded-full text-[11px] font-bold ${
                  i === 0 ? 'bg-gold/20 text-gold' : 'bg-muted text-muted-foreground'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{entry.team}</p>
                </div>
                <span className="text-sm font-bold font-mono">{entry.points}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="lg:col-span-5 rounded-lg border bg-card p-5">
          <h2 className="text-sm font-semibold text-card-foreground mb-3">Recent Activity</h2>
          <ActivityFeed items={activityFeed} maxItems={6} />
        </div>

        {/* Quick stats column */}
        <div className="lg:col-span-4 space-y-4">
          <MetricCard title="Total Points" value={totalPoints} icon={Trophy} subtitle="Company-wide profit sharing" variant="info" />
          <MetricCard title="Team Size" value={users.filter(u => u.active).length} icon={Users} subtitle={`${users.filter(u => !u.active).length} inactive`} />
          <MetricCard title="KPI Entries" value={kpiEntries.filter(k => k.weekStarting === '2026-03-03').length} icon={BarChart3} subtitle="Submitted this week" />
          <MetricCard title="Conversion" value="8.2%" icon={Target} subtitle="Offers → Contracts" />
        </div>
      </div>

      {/* Row 4: Recent deals table */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-card-foreground">Recent Deals</h2>
          <Link to="/deals" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            View all deals <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Property</th>
                <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Rep</th>
                <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Fee</th>
              </tr>
            </thead>
            <tbody>
              {recentDeals.map(deal => (
                <tr key={deal.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3">
                    <Link to={`/deals/${deal.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                      {deal.propertyAddress}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground hidden md:table-cell">
                    {getUserById(deal.acquisitionsRepId)?.name}
                  </td>
                  <td className="py-2.5 px-3"><StatusBadge status={deal.status} /></td>
                  <td className="py-2.5 px-3 text-right">
                    {deal.assignmentFee ? (
                      <span className="font-medium text-success">${deal.assignmentFee.toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
