import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { deals, users, pointEvents, draws, kpiEntries, getUserById, getUserPoints } from '@/data/mock-data';
import { DollarSign, Handshake, TrendingUp, Banknote, Trophy, Users, BarChart3, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const fundedDeals = deals.filter(d => d.status === 'closed_funded');
const activeDeals = deals.filter(d => !['closed_funded', 'canceled'].includes(d.status));
const totalRevenue = fundedDeals.reduce((s, d) => s + (d.assignmentFee || 0), 0);
const avgFee = fundedDeals.length ? totalRevenue / fundedDeals.length : 0;
const totalDrawsOutstanding = draws.filter(d => ['paid', 'approved'].includes(d.status)).reduce((s, d) => s + d.remainingBalance, 0);
const totalPoints = pointEvents.reduce((s, pe) => s + pe.points, 0);

const repIds = ['u5', 'u6', 'u7', 'u8'];
const leaderboard = repIds.map(id => ({
  user: getUserById(id)!,
  points: getUserPoints(id),
})).sort((a, b) => b.points - a.points);

const statusCounts = [
  { name: 'Lead', count: deals.filter(d => d.status === 'lead').length },
  { name: 'Contract', count: deals.filter(d => d.status === 'under_contract').length },
  { name: 'Marketed', count: deals.filter(d => d.status === 'marketed').length },
  { name: 'Committed', count: deals.filter(d => d.status === 'buyer_committed').length },
  { name: 'EMD In', count: deals.filter(d => d.status === 'emd_received').length },
  { name: 'Assigned', count: deals.filter(d => d.status === 'assigned').length },
  { name: 'Funded', count: deals.filter(d => d.status === 'closed_funded').length },
];

const recentDeals = [...deals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

export default function Dashboard() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Dashboard" description="Executive overview of deals, performance, and financials" />

      {/* Metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Active Deals" value={activeDeals.length} icon={Handshake} subtitle="In pipeline" variant="info" />
        <MetricCard title="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} trend={{ value: 12, label: 'vs last month' }} variant="success" />
        <MetricCard title="Avg Assignment Fee" value={`$${Math.round(avgFee).toLocaleString()}`} icon={TrendingUp} subtitle={`${fundedDeals.length} funded deals`} />
        <MetricCard title="Outstanding Draws" value={`$${totalDrawsOutstanding.toLocaleString()}`} icon={Banknote} variant="warning" />
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
            <BarChart data={statusCounts} barSize={32}>
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
            {leaderboard.map((entry, i) => (
              <div key={entry.user.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {entry.user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.user.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{entry.user.team}</p>
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
