"use client";

import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { DataTable } from "@/components/shared/DataTable";
import { MetricCard } from "@/components/shared/MetricCard";

import { useAuthz } from "@/lib/auth/authz-context";
import type { Team } from "@/types";
import { useDrawFormReps, useRepDrawHistory } from "@/features/draws/hooks/use-draws";
import type { DrawWithDetailsDto } from "@/features/draws/server/draws.service";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import { ShieldCheck, ShieldX, AlertTriangle } from "lucide-react";
import { CheckCircle } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

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

export default function DrawRepHistoryPage() {
  const { user, roleCode, can } = useAuthz();

  const { data: reps, isLoading: repsLoading } = useDrawFormReps();

  const [repId, setRepId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (roleCode !== "REP" && reps && reps.length && !repId) setRepId(reps[0].id);
    if (roleCode === "REP" && user?.id) setRepId(undefined);
  }, [roleCode, reps, repId, user?.id]);

  const { data: history, isLoading } = useRepDrawHistory(repId);

  const columns = useMemo<ColumnDef<DrawWithDetailsDto, any>[]>(
    () => [
      { accessorKey: "dealAddress", header: "Deal" },
      {
        accessorKey: "amount",
        header: "Amount",
        meta: { align: "right" },
        cell: ({ getValue }) => <span className="font-mono font-medium">${(getValue() as number).toLocaleString()}</span>,
      },
      {
        accessorKey: "statusDisplay",
        header: "Status",
        cell: ({ getValue }) => <DrawStatusBadge statusDisplay={String(getValue())} />,
      },
      { accessorKey: "dateIssued", header: "Issued" },
      {
        accessorKey: "remainingBalance",
        header: "Balance",
        meta: { align: "right" },
        cell: ({ getValue }) => <span className="font-mono">${(getValue() as number).toLocaleString()}</span>,
      },
      {
        accessorKey: "eligible",
        header: "Eligible",
        meta: { align: "center" },
        cell: ({ getValue }) =>
          getValue ? <CheckCircle className="h-4 w-4 text-success inline" /> : <AlertTriangle className="h-4 w-4 text-destructive inline" />,
      },
    ],
    []
  );

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <PageHeader title="Rep Draw History" description="Weekly draw activity and status flows">
        {roleCode !== "REP" && (
          <Select value={repId} onValueChange={(v) => setRepId(v)}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select rep" />
            </SelectTrigger>
            <SelectContent>
              {(reps ?? []).map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} ({r.team})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </PageHeader>

      {isLoading ? (
        <LoadingState variant="table" />
      ) : (
        <DataTable columns={columns} data={history ?? []} emptyMessage="No draw history found" pageSize={15} />
      )}
    </div>
  );
}

