"use client";

import { useState, useMemo } from "react";
import { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/shared/MetricCard';
import { DataTable } from '@/components/shared/DataTable';
import { useDraws, useDrawMetrics } from '@/features/draws/hooks/use-draws';
import type { DrawWithDetailsDto } from '@/features/draws/server/draws.service';
import DrawRequestModal from '@/features/draws/components/DrawRequestModal';
import { Banknote, AlertTriangle, CheckCircle, Clock, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/LoadingState';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuthz } from "@/lib/auth/authz-context";
import { useRouter } from "next/navigation";

function DrawStatusBadge({ statusDisplay }: { statusDisplay: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-warning/15 text-warning border-l-2 border-l-warning" },
    approved: { label: "Approved", className: "bg-info/15 text-info border-l-2 border-l-info" },
    paid: { label: "Paid", className: "bg-success/15 text-success border-l-2 border-l-success" },
    partially_recouped: { label: "Partially recouped", className: "bg-success/15 text-success border-l-2 border-l-success" },
    recouped: { label: "Recouped", className: "bg-muted text-muted-foreground border-l-2 border-l-muted" },
    denied: { label: "Denied", className: "bg-destructive/15 text-destructive border-l-2 border-l-destructive" },
  };
  const c = config[statusDisplay] ?? { label: statusDisplay, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

export default function DrawsPage() {
  const { can } = useAuthz();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [requestOpen, setRequestOpen] = useState(false);
  const { data: drawsList, isLoading } = useDraws(statusFilter as any);
  const { data: metrics } = useDrawMetrics();

  const columns = useMemo<ColumnDef<DrawWithDetailsDto, any>[]>(
    () => [
      {
        accessorKey: 'repName',
        header: 'Rep',
        cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>,
      },
      {
        accessorKey: 'dealAddress',
        header: 'Deal',
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-xs">{(getValue() as string).slice(0, 35)}…</span>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        meta: { align: 'right' },
        cell: ({ getValue }) => (
          <span className="font-medium font-mono">${(getValue() as number).toLocaleString()}</span>
        ),
      },
      {
        accessorKey: 'statusDisplay',
        header: 'Status',
        cell: ({ getValue }) => <DrawStatusBadge statusDisplay={getValue() as string} />,
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
        cell: ({ getValue }) => (
          <span className="font-mono">${(getValue() as number).toLocaleString()}</span>
        ),
      },
      {
        accessorKey: 'eligible',
        header: 'Eligible',
        meta: { align: 'center' },
        cell: ({ getValue }) =>
          getValue() ? (
            <CheckCircle className="h-4 w-4 text-success inline" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-destructive inline" />
          ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <PageHeader title="Draw Tracking" description="Manage rep draws, approvals, and recoupment">
        {can("draw:new_request") && (
          <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5" type="button">
                <Plus className="h-4 w-4" /> New Draw Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Draw Request</DialogTitle>
                <DialogDescription>Submit a draw request for a rep on an eligible deal.</DialogDescription>
              </DialogHeader>
              <DrawRequestModal onClose={() => setRequestOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Outstanding"
          value={`$${(metrics?.outstanding ?? 0).toLocaleString()}`}
          icon={Banknote}
          variant="warning"
        />
        <MetricCard title="Pending Approval" value={metrics?.pendingCount ?? 0} icon={Clock} variant="info" />
        <MetricCard
          title="Total Recouped"
          value={`$${(metrics?.totalRecouped ?? 0).toLocaleString()}`}
          icon={CheckCircle}
          variant="success"
        />
        <MetricCard title="Ineligible" value={metrics?.ineligibleCount ?? 0} icon={AlertTriangle} />
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partially_recouped">Partially recouped</SelectItem>
            <SelectItem value="recouped">Recouped</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingState variant="table" />
      ) : (
        <DataTable
          columns={columns}
          data={drawsList ?? []}
          emptyMessage="No draws found"
          onRowClick={(row) => router.push(`/draws/${row.id}`)}
        />
      )}
    </div>
  );
}

