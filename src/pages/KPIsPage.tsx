import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { useKpiEntries, useKpiWeeks, useKpiTrend, useKpiWeekSummary } from '@/hooks/use-kpis';
import { Team } from '@/types';
import { Phone, Clock, FileText, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export default function KPIsPage() {
  const [team, setTeam] = useState<Team>('acquisitions');
  const [week, setWeek] = useState('2026-03-03');

  const { data: weeks } = useKpiWeeks(team);
  const { data: entries, isLoading } = useKpiEntries(team, week);
  const { data: summary } = useKpiWeekSummary(team, week);
  const { data: trendData } = useKpiTrend(team);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="KPI Tracking" description="Weekly performance metrics by team">
        <Select value={week} onValueChange={setWeek}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>{weeks?.map(w => <SelectItem key={w} value={w}>Week of {w}</SelectItem>)}</SelectContent>
        </Select>
      </PageHeader>

      <Tabs value={team} onValueChange={v => setTeam(v as Team)}>
        <TabsList>
          <TabsTrigger value="acquisitions">Acquisitions</TabsTrigger>
          <TabsTrigger value="dispositions">Dispositions</TabsTrigger>
        </TabsList>

        <TabsContent value={team} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Dials" value={summary?.totalDials ?? 0} icon={Phone} />
            <MetricCard
              title="Talk Time"
              value={summary ? `${Math.round(summary.totalTalkTime / 60)}h ${summary.totalTalkTime % 60}m` : '—'}
              icon={Clock}
            />
            <MetricCard title="Entries" value={summary?.repCount ?? 0} icon={FileText} subtitle="Reps reporting" />
            <MetricCard title="Revenue" value={`$${(summary?.totalRevenue ?? 0).toLocaleString()}`} icon={TrendingUp} variant="success" />
          </div>

          {/* Individual rep cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map(i => <Skeleton key={i} className="h-48 rounded-lg" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {entries?.map(entry => (
                <div key={entry.id} className="rounded-lg border bg-card p-5 animate-fade-in">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {entry.repName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{entry.repName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{team}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Dials</span><p className="font-semibold">{entry.dials}</p></div>
                    <div><span className="text-muted-foreground">Talk Time</span><p className="font-semibold">{Math.round(entry.talkTimeMinutes / 60)}h {entry.talkTimeMinutes % 60}m</p></div>
                    {team === 'acquisitions' ? (
                      <>
                        <div><span className="text-muted-foreground">Leads Worked</span><p className="font-semibold">{entry.leadsWorked}</p></div>
                        <div><span className="text-muted-foreground">Offers Made</span><p className="font-semibold">{entry.offersMade}</p></div>
                        <div><span className="text-muted-foreground">Contracts</span><p className="font-semibold">{entry.contractsSigned}</p></div>
                        <div><span className="text-muted-foreground">Fallouts</span><p className="font-semibold">{entry.falloutCount}</p></div>
                      </>
                    ) : (
                      <>
                        <div><span className="text-muted-foreground">Buyer Convos</span><p className="font-semibold">{entry.buyerConversations}</p></div>
                        <div><span className="text-muted-foreground">Marketed</span><p className="font-semibold">{entry.propertiesMarketed}</p></div>
                        <div><span className="text-muted-foreground">EMDs In</span><p className="font-semibold">{entry.emdsReceived}</p></div>
                        <div><span className="text-muted-foreground">Assignments</span><p className="font-semibold">{entry.assignmentsSecured}</p></div>
                      </>
                    )}
                    <div className="col-span-2"><span className="text-muted-foreground">Revenue</span><p className="font-semibold text-success">${entry.revenueFromFunded.toLocaleString()}</p></div>
                  </div>
                </div>
              ))}
              {entries?.length === 0 && (
                <div className="col-span-2 rounded-lg border bg-card p-12 text-center text-muted-foreground">No KPI entries for this week</div>
              )}
            </div>
          )}

          {/* Trend chart */}
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Performance Trend</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="dials" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
