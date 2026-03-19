"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthz } from "@/lib/auth/authz-context";
import { MetricCard } from '@/components/shared/MetricCard';
import { deals, draws, kpiEntries, getUserById, getUserPoints } from '@/mock/mock-data';
import { weeklyRevenue } from '@/mock/reports';
import { FileText, DollarSign, TrendingUp, BarChart3, Download, Users, Banknote, Trophy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';

const fundedDeals = deals.filter((d) => d.status === 'closed_funded');
const totalRevenue = fundedDeals.reduce((s, d) => s + (d.assignmentFee || 0), 0);
const avgFee = fundedDeals.length ? totalRevenue / fundedDeals.length : 0;

const revenueByRep = ['u5', 'u6'].map((id) => {
  const user = getUserById(id)!;
  return {
    name: user.name,
    revenue: fundedDeals
      .filter((d) => d.acquisitionsRepId === id)
      .reduce((s, d) => s + (d.assignmentFee || 0), 0),
    deals: fundedDeals.filter((d) => d.acquisitionsRepId === id).length,
  };
});

const dealsByStatus = [
  { name: 'Active', value: deals.filter((d) => !['closed_funded', 'canceled'].includes(d.status)).length },
  { name: 'Funded', value: fundedDeals.length },
  { name: 'Canceled', value: deals.filter((d) => d.status === 'canceled').length },
];

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-5))'];

export default function ReportsPage() {
  const { can } = useAuthz();

  if (!can("nav:reports")) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto">
        <PageHeader title="Reports" description="Financial, performance, and operational reports" />
        <EmptyState
          title="No access"
          description="Company-level reports are available to managers, admins, and transaction coordinators."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <PageHeader title="Reports" description="Financial, performance, and operational reports">
        <div className="flex items-center gap-2">
          <Select defaultValue="this-month">
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} variant="success" />
        <MetricCard title="Avg Fee" value={`$${Math.round(avgFee).toLocaleString()}`} icon={TrendingUp} />
        <MetricCard title="Funded Deals" value={fundedDeals.length} icon={FileText} variant="info" />
        <MetricCard
          title="Draw Exposure"
          value={`$${draws
            .filter((d) => ['paid', 'approved'].includes(d.status))
            .reduce((s, d) => s + d.remainingBalance, 0)
            .toLocaleString()}`}
          icon={Banknote}
          variant="warning"
        />
      </div>

      <Tabs defaultValue="revenue">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="deals">Deal Summary</TabsTrigger>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
          <TabsTrigger value="draws">Draw Exposure</TabsTrigger>
          <TabsTrigger value="points">Points Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Weekly Revenue</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={weeklyRevenue}>
                  <defs>
                    <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#revGrad2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="lg:col-span-2 rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Deal Distribution</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={dealsByStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={55}
                    paddingAngle={2}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {dealsByStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Property</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Rep</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Contract</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Assignment</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Fee</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Margin</th>
                </tr>
              </thead>
              <tbody>
                {fundedDeals.map((d) => (
                  <tr key={d.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium">{d.propertyAddress}</td>
                    <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{getUserById(d.acquisitionsRepId)?.name}</td>
                    <td className="py-3 px-4 text-right font-mono">${d.contractPrice.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono">${(d.assignmentPrice || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-success">${(d.assignmentFee || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right hidden md:table-cell font-mono">
                      {d.assignmentFee && d.contractPrice ? `${((d.assignmentFee / d.contractPrice) * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-4 space-y-6">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Revenue by Acquisitions Rep</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueByRep} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => `$${v.toLocaleString()}`}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="draws" className="mt-4">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Draw Exposure by Rep</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['u5', 'u6', 'u7', 'u8'].map((id) => {
                const user = getUserById(id)!;
                const repDraws = draws.filter((d) => d.repId === id);
                const outstanding = repDraws
                  .filter((d) => ['paid', 'approved'].includes(d.status))
                  .reduce((s, d) => s + d.remainingBalance, 0);
                return (
                  <div key={id} className="rounded-md border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold">{user.name}</p>
                      <span className={`text-sm font-bold font-mono ${outstanding > 0 ? 'text-warning' : 'text-success'}`}>${outstanding.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {repDraws.length} total draws · {repDraws.filter((d) => d.status === 'recouped').length} recouped
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="points" className="mt-4">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Points Summary by Rep</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {['u5', 'u6', 'u7', 'u8', 'u4'].map((id) => {
                const user = getUserById(id)!;
                const pts = getUserPoints(id);
                return (
                  <div key={id} className="rounded-md border p-4 flex items-center gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {user.team} · {user.role.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <p className="text-lg font-bold font-mono">{pts}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

