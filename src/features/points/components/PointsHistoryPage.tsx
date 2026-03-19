"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { usePointEvents } from "@/features/points/hooks/use-points";
import type { PointEventRowDto } from "@/features/points/api/points-client";
import { Input } from "@/components/ui/input";

export default function PointsHistoryPage() {
  const [year, setYear] = useState<number | undefined>(undefined);
  const [month, setMonth] = useState<number | undefined>(undefined);

  const { data: events } = usePointEvents({ year, month });

  const pointColumns = useMemo<ColumnDef<PointEventRowDto, any>[]>(
    () => [
      {
        accessorKey: "userName",
        header: "Rep",
        cell: ({ row }) => <span className="font-medium">{row.original.userName}</span>,
      },
      {
        accessorKey: "dealId",
        header: "Deal",
        cell: ({ row }) => {
          const dealId = row.original.dealId;
          if (!dealId) return <span className="text-muted-foreground">—</span>;
          return (
            <Link href={`/deals/${dealId}`} className="text-sm hover:underline">
              {row.original.dealAddress ?? dealId}
            </Link>
          );
        },
      },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ getValue }) => <span className="text-muted-foreground text-xs">{getValue() as string}</span>,
      },
      {
        accessorKey: "points",
        header: "Points",
        meta: { align: "right" },
        cell: ({ getValue }) => {
          const pts = getValue() as number;
          const label = pts >= 0 ? `+${pts}` : `${pts}`;
          return <span className="font-bold text-success font-mono">{label}</span>;
        },
      },
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() as string}</span>,
      },
      {
        accessorKey: "isManualAdjustment",
        header: "Type",
        cell: ({ getValue }) =>
          getValue() ? (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-warning/15 text-warning">Manual</span>
          ) : (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-success/15 text-success">Auto</span>
          ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <PageHeader title="Points History" description="Profit-sharing point ledger (auto + manual adjustments)">
        <div className="flex items-end gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Year</div>
            <Input
              type="number"
              value={year ?? ""}
              placeholder="e.g. 2026"
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
              className="w-28"
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Month</div>
            <Input
              type="number"
              value={month ?? ""}
              placeholder="1-12"
              onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : undefined)}
              className="w-24"
            />
          </div>
        </div>
      </PageHeader>

      <DataTable columns={pointColumns} data={events ?? []} emptyMessage="No point events" />
    </div>
  );
}

