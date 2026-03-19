import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { useKpiEntries, useKpiWeeks, useKpiTrend, useKpiWeekSummary } from '@/hooks/use-kpis';
import { Team } from '@/types';
import { Phone, Clock, FileText, TrendingUp, Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';

const acqKpiSchema = z.object({
  dials: z.coerce.number().min(0),
  talkTimeMinutes: z.coerce.number().min(0),
  leadsWorked: z.coerce.number().min(0),
  offersMade: z.coerce.number().min(0),
  contractsSigned: z.coerce.number().min(0),
  falloutCount: z.coerce.number().min(0),
  revenueFromFunded: z.coerce.number().min(0),
});

const dispoKpiSchema = z.object({
  dials: z.coerce.number().min(0),
  talkTimeMinutes: z.coerce.number().min(0),
  buyerConversations: z.coerce.number().min(0),
  propertiesMarketed: z.coerce.number().min(0),
  emdsReceived: z.coerce.number().min(0),
  assignmentsSecured: z.coerce.number().min(0),
  avgAssignmentFee: z.coerce.number().min(0),
  falloutCount: z.coerce.number().min(0),
  revenueFromFunded: z.coerce.number().min(0),
});

function KpiEntryForm({ team, onClose }: { team: Team; onClose: () => void }) {
  const schema = team === 'acquisitions' ? acqKpiSchema : dispoKpiSchema;
  const form = useForm({ resolver: zodResolver(schema), defaultValues: {} as any });

  const onSubmit = (data: any) => {
    console.log('KPI submission:', { team, ...data });
    toast.success('KPI entry submitted successfully');
    onClose();
  };

  const acqFields = [
    { name: 'dials', label: 'Dials' },
    { name: 'talkTimeMinutes', label: 'Talk Time (min)' },
    { name: 'leadsWorked', label: 'Leads Worked' },
    { name: 'offersMade', label: 'Offers Made' },
    { name: 'contractsSigned', label: 'Contracts Signed' },
    { name: 'falloutCount', label: 'Fallout Count' },
    { name: 'revenueFromFunded', label: 'Revenue from Funded ($)' },
  ];

  const dispoFields = [
    { name: 'dials', label: 'Dials' },
    { name: 'talkTimeMinutes', label: 'Talk Time (min)' },
    { name: 'buyerConversations', label: 'Buyer Conversations' },
    { name: 'propertiesMarketed', label: 'Properties Marketed' },
    { name: 'emdsReceived', label: 'EMDs Received' },
    { name: 'assignmentsSecured', label: 'Assignments Secured' },
    { name: 'avgAssignmentFee', label: 'Avg Assignment Fee ($)' },
    { name: 'falloutCount', label: 'Fallout Count' },
    { name: 'revenueFromFunded', label: 'Revenue from Funded ($)' },
  ];

  const fields = team === 'acquisitions' ? acqFields : dispoFields;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {fields.map(f => (
            <FormField
              key={f.name}
              control={form.control}
              name={f.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{f.label}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} className="h-9" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm">Submit Entry</Button>
        </div>
      </form>
    </Form>
  );
}

export default function KPIsPage() {
  const [team, setTeam] = useState<Team>('acquisitions');
  const [week, setWeek] = useState('2026-03-03');
  const [entryOpen, setEntryOpen] = useState(false);

  const { data: weeks } = useKpiWeeks(team);
  const { data: entries, isLoading } = useKpiEntries(team, week);
  const { data: summary } = useKpiWeekSummary(team, week);
  const { data: trendData } = useKpiTrend(team);

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <PageHeader title="KPI Tracking" description="Weekly performance metrics by team">
        <div className="flex items-center gap-2">
          <Select value={week} onValueChange={setWeek}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{weeks?.map(w => <SelectItem key={w} value={w}>Week of {w}</SelectItem>)}</SelectContent>
          </Select>
          <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New Entry</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Submit Weekly KPI</DialogTitle>
                <DialogDescription>Enter your KPI metrics for the current week. All fields are required.</DialogDescription>
              </DialogHeader>
              <KpiEntryForm team={team} onClose={() => setEntryOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
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

          {/* Rep scorecards */}
          {isLoading ? (
            <LoadingState variant="cards" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {entries?.map(entry => (
                <div key={entry.id} className="rounded-lg border bg-card p-5 hover:border-primary/20 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {entry.repName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{entry.repName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{team}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm">
                    <div><span className="text-xs text-muted-foreground">Dials</span><p className="font-semibold font-mono">{entry.dials}</p></div>
                    <div><span className="text-xs text-muted-foreground">Talk Time</span><p className="font-semibold">{Math.round(entry.talkTimeMinutes / 60)}h {entry.talkTimeMinutes % 60}m</p></div>
                    {team === 'acquisitions' ? (
                      <>
                        <div><span className="text-xs text-muted-foreground">Leads Worked</span><p className="font-semibold font-mono">{entry.leadsWorked}</p></div>
                        <div><span className="text-xs text-muted-foreground">Offers Made</span><p className="font-semibold font-mono">{entry.offersMade}</p></div>
                        <div><span className="text-xs text-muted-foreground">Contracts</span><p className="font-semibold font-mono">{entry.contractsSigned}</p></div>
                        <div><span className="text-xs text-muted-foreground">Fallouts</span><p className="font-semibold font-mono text-destructive">{entry.falloutCount}</p></div>
                      </>
                    ) : (
                      <>
                        <div><span className="text-xs text-muted-foreground">Buyer Convos</span><p className="font-semibold font-mono">{entry.buyerConversations}</p></div>
                        <div><span className="text-xs text-muted-foreground">Marketed</span><p className="font-semibold font-mono">{entry.propertiesMarketed}</p></div>
                        <div><span className="text-xs text-muted-foreground">EMDs In</span><p className="font-semibold font-mono">{entry.emdsReceived}</p></div>
                        <div><span className="text-xs text-muted-foreground">Assignments</span><p className="font-semibold font-mono">{entry.assignmentsSecured}</p></div>
                      </>
                    )}
                    <div className="col-span-2 pt-1 border-t">
                      <span className="text-xs text-muted-foreground">Revenue</span>
                      <p className="font-semibold text-success font-mono">${entry.revenueFromFunded.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
              {entries?.length === 0 && (
                <div className="col-span-2 rounded-lg border border-dashed bg-card p-12 text-center text-muted-foreground">
                  <p className="font-medium">No KPI entries for this week</p>
                  <p className="text-sm mt-1">Click "New Entry" to submit weekly metrics</p>
                </div>
              )}
            </div>
          )}

          {/* Trend chart */}
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Performance Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line name="Dials" type="monotone" dataKey="dials" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                <Line name="Revenue ($)" type="monotone" dataKey="revenue" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
