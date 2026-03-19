import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { draws, getUserById, getDealById, getRepDrawBalance } from '@/data/mock-data';
import { Banknote, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DrawsPage() {
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = statusFilter === 'all' ? draws : draws.filter(d => d.status === statusFilter);
  const totalOutstanding = draws.filter(d => ['paid', 'approved'].includes(d.status)).reduce((s, d) => s + d.remainingBalance, 0);
  const pendingCount = draws.filter(d => d.status === 'pending').length;
  const totalRecouped = draws.reduce((s, d) => s + d.amountRecouped, 0);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Draw Tracking" description="Manage rep draws, approvals, and recoupment" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Outstanding" value={`$${totalOutstanding.toLocaleString()}`} icon={Banknote} variant="warning" />
        <MetricCard title="Pending Approval" value={pendingCount} icon={Clock} variant="info" />
        <MetricCard title="Total Recouped" value={`$${totalRecouped.toLocaleString()}`} icon={CheckCircle} variant="success" />
        <MetricCard title="Ineligible Requests" value={draws.filter(d => !d.eligible).length} icon={AlertTriangle} />
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="recouped">Recouped</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Rep</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Deal</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Balance</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Eligible</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(draw => {
                const deal = getDealById(draw.dealId);
                return (
                  <tr key={draw.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium">{getUserById(draw.repId)?.name}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{deal?.propertyAddress.slice(0, 30)}…</td>
                    <td className="py-3 px-4 text-right font-medium">${draw.amount.toLocaleString()}</td>
                    <td className="py-3 px-4"><StatusBadge status={draw.status} type="draw" /></td>
                    <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{draw.dateIssued}</td>
                    <td className="py-3 px-4 text-right hidden lg:table-cell">${draw.remainingBalance.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center hidden lg:table-cell">
                      {draw.eligible ? <CheckCircle className="h-4 w-4 text-success inline" /> : <AlertTriangle className="h-4 w-4 text-destructive inline" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
