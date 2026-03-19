import { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable } from '@/components/shared/DataTable';
import { LoadingState } from '@/components/shared/LoadingState';
import { useDraws, useDrawMetrics } from '@/hooks/use-draws';
import { DrawWithDetails } from '@/services/draws.service';
import { Banknote, AlertTriangle, CheckCircle, Clock, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

function DrawRequestModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Rep</Label>
        <Select>
          <SelectTrigger><SelectValue placeholder="Select rep" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="u5">Andre Davis</SelectItem>
            <SelectItem value="u6">Tanya Mitchell</SelectItem>
            <SelectItem value="u7">Brandon Lewis</SelectItem>
            <SelectItem value="u8">Nicole Foster</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Deal</Label>
        <Select>
          <SelectTrigger><SelectValue placeholder="Select deal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="d6">445 Riverside Dr (Assigned)</SelectItem>
            <SelectItem value="d7">7890 Sunset Blvd (EMD Received)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Amount</Label>
        <Input type="number" placeholder="0.00" />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea placeholder="Reason for draw request…" rows={3} />
      </div>
      <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Eligibility:</strong> Draws are only available for deals that have reached "Assigned" status with buyer EMD received.
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { toast.success('Draw request submitted'); onClose(); }}>Submit Request</Button>
      </DialogFooter>
    </div>
  );
}

export default function DrawsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [requestOpen, setRequestOpen] = useState(false);
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
        cell: ({ getValue }) => <span className="font-medium font-mono">${(getValue() as number).toLocaleString()}</span>,
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
        cell: ({ getValue }) => <span className="font-mono">${(getValue() as number).toLocaleString()}</span>,
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
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <PageHeader title="Draw Tracking" description="Manage rep draws, approvals, and recoupment">
        <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New Draw Request</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Draw Request</DialogTitle>
              <DialogDescription>Submit a draw request for a rep on an eligible deal.</DialogDescription>
            </DialogHeader>
            <DrawRequestModal onClose={() => setRequestOpen(false)} />
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Outstanding" value={`$${(metrics?.outstanding ?? 0).toLocaleString()}`} icon={Banknote} variant="warning" />
        <MetricCard title="Pending Approval" value={metrics?.pendingCount ?? 0} icon={Clock} variant="info" />
        <MetricCard title="Total Recouped" value={`$${(metrics?.totalRecouped ?? 0).toLocaleString()}`} icon={CheckCircle} variant="success" />
        <MetricCard title="Ineligible" value={metrics?.ineligibleCount ?? 0} icon={AlertTriangle} />
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
        <LoadingState variant="table" />
      ) : (
        <DataTable columns={columns} data={drawsList ?? []} emptyMessage="No draws found" />
      )}
    </div>
  );
}
