import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { deals, getUserById } from '@/data/mock-data';
import { DealStatus, DEAL_STATUS_CONFIG } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DealsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = deals.filter(d => {
    const matchSearch = d.propertyAddress.toLowerCase().includes(search.toLowerCase()) ||
      d.sellerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Deals" description={`${deals.length} total deals in pipeline`}>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> New Deal
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search deals…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-9">
            <Filter className="h-3.5 w-3.5 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(DEAL_STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Property</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Seller</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Acq Rep</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">Contract</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Fee</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(deal => (
                <tr key={deal.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <Link to={`/deals/${deal.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                      {deal.propertyAddress}
                    </Link>
                    <p className="text-xs text-muted-foreground md:hidden mt-0.5">{deal.sellerName}</p>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{deal.sellerName}</td>
                  <td className="py-3 px-4 hidden lg:table-cell">{getUserById(deal.acquisitionsRepId)?.name}</td>
                  <td className="py-3 px-4"><StatusBadge status={deal.status} /></td>
                  <td className="py-3 px-4 text-right hidden sm:table-cell">${deal.contractPrice.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-medium">
                    {deal.assignmentFee ? <span className="text-success">${deal.assignmentFee.toLocaleString()}</span> : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No deals found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
