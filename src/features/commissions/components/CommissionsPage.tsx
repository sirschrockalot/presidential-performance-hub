"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { DataTable } from "@/components/shared/DataTable";
import { useCommissionWindows, useRepWindowSummaries } from "../hooks/use-commissions";
import { formatWindowLabel } from "../utils/windows";
import { COMMISSION_TIERS } from "../types";
import type { RepWindowSummary } from "../types";
import { ColumnDef } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  TrendingUp,
  CalendarDays,
  Users,
  Info,
  Percent,
  Handshake,
} from "lucide-react";

const fmt$ = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtPct = (n: number) => `${(n * 100).toFixed(0)}%`;

function tierBadgeColor(rate: number): string {
  if (rate >= 0.12) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
  if (rate >= 0.10) return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25";
  return "bg-muted text-muted-foreground border-border";
}

export default function CommissionsPage() {
  const windows = useCommissionWindows();
  const currentWindow = windows.find((w) => w.isCurrent) ?? windows[0];
  const [selectedWindowId, setSelectedWindowId] = useState(currentWindow?.id ?? "w1");

  const summaries = useRepWindowSummaries(selectedWindowId);
  const selectedWindow = windows.find((w) => w.id === selectedWindowId);

  // Aggregate metrics for the selected window
  const totals = useMemo(() => {
    const totalRevenue = summaries.reduce((s, r) => s + r.fundedRevenue, 0);
    const totalCommission = summaries.reduce((s, r) => s + r.commissionEarned, 0);
    const totalDeals = new Set(summaries.flatMap((r) => r.deals.map((d) => d.dealId))).size;
    return { totalRevenue, totalCommission, totalDeals, repCount: summaries.length };
  }, [summaries]);

  const columns: ColumnDef<RepWindowSummary>[] = useMemo(
    () => [
      {
        accessorKey: "repName",
        header: "Rep",
        cell: ({ row }) => (
          <div>
            <span className="font-medium text-foreground">{row.original.repName}</span>
            <span className="ml-2 text-xs text-muted-foreground capitalize">{row.original.team}</span>
          </div>
        ),
      },
      {
        accessorKey: "fundedDeals",
        header: "Deals Funded",
        cell: ({ getValue }) => <span className="font-mono tabular-nums">{getValue<number>()}</span>,
      },
      {
        accessorKey: "fundedRevenue",
        header: "Funded Revenue",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums font-medium">{fmt$(getValue<number>())}</span>
        ),
      },
      {
        accessorKey: "commissionRate",
        header: "Rate",
        cell: ({ getValue }) => {
          const rate = getValue<number>();
          return (
            <Badge variant="outline" className={tierBadgeColor(rate)}>
              {fmtPct(rate)}
            </Badge>
          );
        },
      },
      {
        accessorKey: "commissionEarned",
        header: "Commission",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums font-semibold text-primary">
            {fmt$(getValue<number>())}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <PageHeader
          title="Commissions"
          description="45-day rolling commission windows — 2026"
        />
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedWindowId} onValueChange={setSelectedWindowId}>
            <SelectTrigger className="w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {windows.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  <span className="flex items-center gap-2">
                    Window {w.windowNumber}: {formatWindowLabel(w)}
                    {w.isCurrent && (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                        Current
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tier reference card */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Info className="h-4 w-4" />
            Commission Tier Structure (flat rate on total funded revenue per 45-day window)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            {COMMISSION_TIERS.map((tier) => (
              <div key={tier.label} className="flex items-center gap-3">
                <Badge variant="outline" className={tierBadgeColor(tier.rate)}>
                  {fmtPct(tier.rate)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {tier.maxRevenue
                    ? `${fmt$(tier.minRevenue)} – ${fmt$(tier.maxRevenue)}`
                    : `${fmt$(tier.minRevenue)}+`}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Funded Revenue"
          value={fmt$(totals.totalRevenue)}
          icon={DollarSign}
        />
        <MetricCard
          title="Total Commission"
          value={fmt$(totals.totalCommission)}
          icon={TrendingUp}
        />
        <MetricCard
          title="Deals Funded"
          value={String(totals.totalDeals)}
          icon={Handshake}
        />
        <MetricCard
          title="Active Reps"
          value={String(totals.repCount)}
          icon={Users}
        />
      </div>

      {/* Per-rep progress toward next tier */}
      {summaries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {summaries.map((rep) => {
            const nextTierThreshold =
              rep.fundedRevenue <= 50_000
                ? 50_000
                : rep.fundedRevenue <= 100_000
                  ? 100_000
                  : null;
            const progress = nextTierThreshold
              ? Math.min(100, (rep.fundedRevenue / nextTierThreshold) * 100)
              : 100;

            return (
              <Card key={rep.repId} className="relative overflow-hidden">
                <CardContent className="pt-5 pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{rep.repName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{rep.team}</p>
                    </div>
                    <Badge variant="outline" className={tierBadgeColor(rep.commissionRate)}>
                      {fmtPct(rep.commissionRate)}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{fmt$(rep.fundedRevenue)} funded</span>
                      {nextTierThreshold && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1 cursor-help">
                              {fmt$(nextTierThreshold - rep.fundedRevenue)} to next tier
                              <Percent className="h-3 w-3" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Reach {fmt$(nextTierThreshold)} to unlock{" "}
                            {nextTierThreshold === 50_000 ? "10%" : "12%"} rate
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">
                      {rep.fundedDeals} deal{rep.fundedDeals !== 1 ? "s" : ""}
                    </span>
                    <span className="font-mono tabular-nums text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {fmt$(rep.commissionEarned)}
                    </span>
                  </div>

                  {/* Deal list */}
                  {rep.deals.length > 0 && (
                    <div className="border-t pt-2 mt-1 space-y-1">
                      {rep.deals.map((d) => (
                        <div
                          key={d.dealId}
                          className="flex items-center justify-between text-xs text-muted-foreground"
                        >
                          <span className="truncate max-w-[200px]">{d.propertyAddress}</span>
                          <span className="font-mono tabular-nums">{fmt$(d.assignmentFee)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Rep Commission Breakdown
            {selectedWindow && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                — {formatWindowLabel(selectedWindow)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summaries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No funded deals in this window yet.
            </div>
          ) : (
            <DataTable columns={columns} data={summaries} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
