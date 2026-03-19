import { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable } from '@/components/shared/DataTable';
import { useDraws, useDrawMetrics } from '@/hooks/use-draws';
import { DrawWithDetails } from '@/services/draws.service';
import { Banknote, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export default function DrawsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: drawsList, isLoading } = useDraws(statusFilter as any);
  const { data: metrics } = useDrawMetrics();

  const columns = useMemo<ColumnDef<DrawWithDetails, any>[]>(
    () => [
      {
        accessorKey: 'repName',
        header: 'Rep',
        cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>,
      },
      {
        accessorKey: 'dealAddress',
        header: 'Deal',
        cell: ({ getValue }) => <span className="text-muted-foreground text-xs">{(getValue() as string).slice(0, 35)}…</span>,
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        meta: { align: 'right' },
        cell: ({ getValue }) => <span className="font-medium">${(getValue() as number).toLocaleString()}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue() as any} type="draw" />,
      },
      {
        accessorKey: 'dateIssued',
        header: 'Date',
        cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() as string}</span>,
      },
      {
        accessorKey: 'remainingBalance',
        header: 'Balance',
        meta: { align: 'right' },
        cell: ({ getValue }) => `$${(getValue() as number).toLocaleString()}`,
      },
      {
        accessorKey: 'eligible',
        header: 'Eligible',
        meta: { align: 'center' },
        cell: ({ getValue }) =>
          getValue() ? <CheckCircle className="h-4 w-4 text-success inline" /> : <AlertTriangle className="h-4 w-4 text-destructive inline" />,
      },
    ],
    []
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Draw Tracking" description="Manage rep draws, approvals, and recoupment" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Outstanding" value={`$${(metrics?.outstanding ?? 0).toLocaleString()}`} icon={Banknote} variant="warning" />
        <MetricCard title="Pending Approval" value={metrics?.pendingCount ?? 0} icon={Clock} variant="info" />
        <MetricCard title="Total Recouped" value={`$${(metrics?.totalRecouped ?? 0).toLocaleString()}`} icon={CheckCircle} variant="success" />
        <MetricCard title="Ineligible Requests" value={metrics?.ineligibleCount ?? 0} icon={AlertTriangle} />
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

      {isLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : (
        <DataTable columns={columns} data={drawsList ?? []} emptyMessage="No draws found" />
      )}
    </div>
  );
}
