"use client";

import { DollarSign, Star, TrendingUp, Trophy } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";
import type { DashboardOverviewDto } from "@/features/dashboard/api/dashboard-client";

type Props = {
  overview: DashboardOverviewDto;
};

/** Pipeline & potential profit table — deferred so headline metrics paint first. */
export function DashboardPipelineSlot({ overview }: Props) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-card-foreground">Potential Pipeline Value</h2>
        <span className="text-xs text-muted-foreground">
          Open deals: {overview.potentialPipeline.openPipelineDeals} · With fee data:{" "}
          {overview.potentialPipeline.dealsWithPotentialProfit}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <MetricCard
          title="Potential Assignment Profit"
          value={`$${overview.potentialPipeline.totalPotentialAssignmentProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          subtitle="From open pipeline deals"
          variant="success"
        />
        <MetricCard
          title="Avg Assignment Fee — Open Pipeline"
          value={`$${Math.round(overview.potentialPipeline.avgAssignmentFeePotential ?? 0).toLocaleString()}`}
          icon={TrendingUp}
          subtitle={`${overview.potentialPipeline.dealsWithPotentialProfit} deals with fee/spread data`}
          variant="info"
        />
        <MetricCard
          title="Users With Potential Points"
          value={overview.potentialPipeline.usersWithPotentialPointsCount}
          icon={Trophy}
          subtitle="Rep + TC projected points"
          variant="info"
        />
        <MetricCard
          title="Top Potential Points"
          value={
            overview.potentialPipeline.potentialPointsByUser[0]
              ? `${overview.potentialPipeline.potentialPointsByUser[0].potentialPoints.toFixed(1)} pts`
              : "0 pts"
          }
          icon={Star}
          subtitle={overview.potentialPipeline.potentialPointsByUser[0]?.userName ?? "No projected recipients"}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">User</th>
              <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Potential Points
              </th>
              <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Open Deals</th>
            </tr>
          </thead>
          <tbody>
            {overview.potentialPipeline.potentialPointsByUser.map((row) => (
              <tr key={row.userId} className="border-b last:border-b-0">
                <td className="py-2.5 px-3">{row.userName}</td>
                <td className="py-2.5 px-3 text-right font-medium">{row.potentialPoints.toFixed(1)}</td>
                <td className="py-2.5 px-3 text-right text-muted-foreground">{row.dealCount}</td>
              </tr>
            ))}
            {overview.potentialPipeline.potentialPointsByUser.length === 0 && (
              <tr>
                <td colSpan={3} className="py-3 px-3 text-sm text-muted-foreground">
                  No projected points yet. Add assignment fee or assignment/contract prices on open deals.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
