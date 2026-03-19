"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { useDeals } from "@/features/deals/hooks/use-deals";
import type { DealWithReps } from "@/features/deals/services/deals.service";
import { DEAL_STATUS_CONFIG, type DealStatus } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Filter, ArrowUpDown, AlertTriangle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthz } from "@/lib/auth/authz-context";
import { DealCreateDialog } from "@/features/deals/components/DealCreateDialog";

export default function DealsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"propertyAddress" | "contractDate" | "status" | "contractPrice" | "updatedAt">(
    "updatedAt"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();
  const { can } = useAuthz();

  const debouncedSearch = search;

  const { data: deals, isLoading, isFetching, isError, error, refetch } = useDeals({
    search: debouncedSearch || undefined,
    status: statusFilter as DealStatus | "all",
    sortBy,
    sortOrder,
  });

  const columns = useMemo<ColumnDef<DealWithReps, unknown>[]>(
    () => [
      {
        accessorKey: "propertyAddress",
        header: "Property",
        cell: ({ row }) => (
          <div>
            <Link
              href={`/deals/${row.original.id}`}
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              {row.original.propertyAddress}
            </Link>
            <p className="text-xs text-muted-foreground md:hidden mt-0.5">{row.original.sellerName}</p>
          </div>
        ),
      },
      {
        accessorKey: "sellerName",
        header: "Seller",
        meta: { className: "hidden md:table-cell" },
        cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() as string}</span>,
      },
      {
        accessorKey: "acquisitionsRepName",
        header: "Acq Rep",
        meta: { className: "hidden lg:table-cell" },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => <StatusBadge status={getValue() as DealStatus} />,
        enableSorting: false,
      },
      {
        accessorKey: "contractPrice",
        header: "Contract",
        meta: { align: "right", className: "hidden sm:table-cell" },
        cell: ({ getValue }) => `$${(getValue() as number).toLocaleString()}`,
        enableSorting: false,
      },
      {
        accessorKey: "assignmentFee",
        header: "Fee",
        meta: { align: "right" },
        cell: ({ getValue }) => {
          const fee = getValue() as number | null;
          return fee ? (
            <span className="font-medium text-success">${fee.toLocaleString()}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        enableSorting: false,
      },
    ],
    []
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Deals"
        description={
          isFetching
            ? `${deals?.length ?? "…"} deals · refreshing…`
            : `${deals?.length ?? 0} deals in pipeline`
        }
      >
        {can("deal:create") && (
          <Button size="sm" className="gap-2" type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Deal
          </Button>
        )}
      </PageHeader>

      {can("deal:create") && <DealCreateDialog open={createOpen} onOpenChange={setCreateOpen} />}

      <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 h-9">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(DEAL_STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  {cfg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-44 h-9">
              <ArrowUpDown className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt">Last updated</SelectItem>
              <SelectItem value="contractDate">Contract date</SelectItem>
              <SelectItem value="propertyAddress">Property</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="contractPrice">Contract price</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
            <SelectTrigger className="w-28 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Desc</SelectItem>
              <SelectItem value="asc">Asc</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load deals"
          description={error instanceof Error ? error.message : "An unexpected error occurred while loading deals."}
          actionLabel="Try Again"
          onAction={() => void refetch()}
        />
      ) : (
        <DataTable
          columns={columns}
          data={deals ?? []}
          emptyMessage="No deals found"
          onRowClick={(row) => router.push(`/deals/${row.id}`)}
        />
      )}
    </div>
  );
}
