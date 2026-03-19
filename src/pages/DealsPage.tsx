import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable } from '@/components/shared/DataTable';
import { useDeals } from '@/hooks/use-deals';
import { DealWithReps } from '@/services/deals.service';
import { DEAL_STATUS_CONFIG } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DealsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();

  const { data: deals, isLoading } = useDeals({
    search: search || undefined,
    status: statusFilter as any,
  });

  const columns = useMemo<ColumnDef<DealWithReps, any>[]>(
    () => [
      {
        accessorKey: 'propertyAddress',
        header: 'Property',
        cell: ({ row }) => (
          <div>
            <Link to={`/deals/${row.original.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
              {row.original.propertyAddress}
            </Link>
            <p className="text-xs text-muted-foreground md:hidden mt-0.5">{row.original.sellerName}</p>
          </div>
        ),
      },
      {
        accessorKey: 'sellerName',
        header: 'Seller',
        meta: { className: 'hidden md:table-cell' },
        cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() as string}</span>,
      },
      {
        accessorKey: 'acquisitionsRepName',
        header: 'Acq Rep',
        meta: { className: 'hidden lg:table-cell' },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue() as any} />,
        enableSorting: true,
      },
      {
        accessorKey: 'contractPrice',
        header: 'Contract',
        meta: { align: 'right', className: 'hidden sm:table-cell' },
        cell: ({ getValue }) => `$${(getValue() as number).toLocaleString()}`,
      },
      {
        accessorKey: 'assignmentFee',
        header: 'Fee',
        meta: { align: 'right' },
        cell: ({ getValue }) => {
          const fee = getValue() as number | null;
          return fee ? (
            <span className="font-medium text-success">${fee.toLocaleString()}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Deals" description={`${deals?.length ?? 0} deals in pipeline`}>
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

      {isLoading ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : (
        <DataTable
          columns={columns}
          data={deals ?? []}
          emptyMessage="No deals found"
          onRowClick={row => navigate(`/deals/${row.id}`)}
        />
      )}
    </div>
  );
}
