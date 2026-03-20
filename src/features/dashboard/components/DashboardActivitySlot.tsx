"use client";

import { ActivityFeed } from "@/components/shared/ActivityFeed";
import type { DashboardOverviewDto } from "@/features/dashboard/api/dashboard-client";

type Props = {
  recentActivity: DashboardOverviewDto["recentActivity"];
};

/** Recent activity list — deferred load. */
export function DashboardActivitySlot({ recentActivity }: Props) {
  return (
    <div className="rounded-lg border bg-card p-5 h-full min-h-[200px]">
      <h2 className="text-sm font-semibold text-card-foreground mb-3">Recent Activity</h2>
      <ActivityFeed items={recentActivity} maxItems={6} />
    </div>
  );
}
