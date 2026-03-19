import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { deals, pointEvents, draws, kpiEntries, getUserById } from '@/data/mock-data';
import { FileText, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const fundedDeals = deals.filter(d => d.status === 'closed_funded');
const totalRevenue = fundedDeals.reduce((s, d) => s + (d.assignmentFee || 0), 0);
const avgFee = fundedDeals.length ? totalRevenue / fundedDeals.length : 0;

const revenueByRep = ['u5', 'u6'].map(id => {
  const user = getUserById(id)!;
  const rev = fundedDeals.filter(d => d.acquisitionsRepId === id).reduce((s, d) => s + (d.assignmentFee || 0), 0);
  return { name: user.name.split(' ')[0], revenue: rev };
});

const dealsByStatus = [
  { name: 'Active', value: deals.filter(d => !['closed_funded', 'canceled'].includes(d.status)).length },
  { name: 'Funded', value: fundedDeals.length },
  { name: 'Canceled', value: deals.filter(d => d.status === 'canceled').length },
];
const COLORS = ['hsl(210, 92%, 50%)', 'hsl(152, 58%, 40%)', 'hsl(0, 72%, 51%)'];

export default function ReportsPage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Reports" description="Financial and performance reports" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} variant="success" />
        <MetricCard title="Avg Fee" value={`$${Math.round(avgFee).toLocaleString()}`} icon={TrendingUp} />
        <MetricCard title="Funded Deals" value={fundedDeals.length} icon={FileText} variant="info" />
        <MetricCard title="Draw Exposure" value={`$${draws.filter(d => ['paid', 'approved'].includes(d.status)).reduce((s, d) => s + d.remainingBalance, 0).toLocaleString()}`} icon={BarChart3} variant="warning" />
      </div>

      <Tabs defaultValue="revenue">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="deals">Deal Summary</TabsTrigger>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Revenue by Acquisitions Rep</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revenueByRep} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Deal Distribution</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={dealsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {dealsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Property</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Contract</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Assignment</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Fee</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Margin</th>
              </tr></thead>
              <tbody>
                {fundedDeals.map(d => (
                  <tr key={d.id} className="border-b last:border-b-0">
                    <td className="py-3 px-4 font-medium">{d.propertyAddress}</td>
                    <td className="py-3 px-4 text-right">${d.contractPrice.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">${(d.assignmentPrice || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-medium text-success">${(d.assignmentFee || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right hidden md:table-cell">{d.assignmentFee && d.contractPrice ? `${((d.assignmentFee / d.contractPrice) * 100).toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="profitability" className="mt-4">
          <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium">Detailed profitability reports coming soon</p>
            <p className="text-sm mt-1">Connect to a database to unlock full P&L tracking</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
