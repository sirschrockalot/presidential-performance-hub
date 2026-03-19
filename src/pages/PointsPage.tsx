import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { pointEvents, getUserById, getUserPoints, deals } from '@/data/mock-data';
import { Trophy, Star, TrendingUp, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const repIds = ['u5', 'u6', 'u7', 'u8', 'u4'];
const leaderboard = repIds.map(id => ({
  user: getUserById(id)!,
  points: getUserPoints(id),
  dealCount: pointEvents.filter(pe => pe.userId === id && !pe.isManualAdjustment).length,
})).sort((a, b) => b.points - a.points);

const totalPoints = pointEvents.reduce((s, pe) => s + pe.points, 0);
const chartData = leaderboard.map(l => ({ name: l.user.name.split(' ')[0], points: l.points }));

export default function PointsPage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Points & Profit Sharing" description="Track million-dollar profit sharing points across the team" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Company Points" value={totalPoints} icon={Trophy} variant="info" />
        <MetricCard title="Top Performer" value={leaderboard[0]?.user.name.split(' ')[0]} icon={Award} subtitle={`${leaderboard[0]?.points} points`} variant="success" />
        <MetricCard title="Funded Deals" value={deals.filter(d => d.status === 'closed_funded').length} icon={Star} />
        <MetricCard title="Manual Adjustments" value={pointEvents.filter(pe => pe.isManualAdjustment).length} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
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

        {/* Leaderboard */}
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Trophy className="h-4 w-4 text-gold" /> Leaderboard</h3>
          <div className="space-y-4">
            {leaderboard.map((entry, i) => (
              <div key={entry.user.id} className="flex items-center gap-3">
                <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold ${i === 0 ? 'bg-gold text-gold-foreground' : i === 1 ? 'bg-muted text-muted-foreground' : 'bg-muted/50 text-muted-foreground'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.user.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{entry.user.team} · {entry.user.role.replace('_', ' ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{entry.points} pts</p>
                  <p className="text-xs text-muted-foreground">{entry.dealCount} events</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Point events table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="p-4 border-b"><h3 className="text-sm font-semibold">Point Events</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Rep</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Reason</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Points</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Type</th>
              </tr>
            </thead>
            <tbody>
              {[...pointEvents].reverse().map(pe => (
                <tr key={pe.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-medium">{getUserById(pe.userId)?.name}</td>
                  <td className="py-3 px-4 text-muted-foreground">{pe.reason}</td>
                  <td className="py-3 px-4 text-right font-bold text-success">+{pe.points}</td>
                  <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{pe.createdAt}</td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    {pe.isManualAdjustment ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-warning/15 text-warning">Manual</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-success/15 text-success">Auto</span>
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
