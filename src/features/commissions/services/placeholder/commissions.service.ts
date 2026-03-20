/**
 * PLACEHOLDER — returns mock commission data.
 * SWAP POINT: Replace with Prisma queries joining Deal (closedFundedDate within window)
 * grouped by acquisitionsRepId / dispoRepId.
 */

import { deals, users } from "@/data/mock-data";
import { generate2026Windows } from "../../utils/windows";
import { getCommissionRate, getCommissionEarned } from "../../types";
import type { RepWindowSummary, WindowDeal, CommissionWindow } from "../../types";

export function getCommissionWindows(): CommissionWindow[] {
  return generate2026Windows();
}

export function getRepWindowSummaries(windowId: string): RepWindowSummary[] {
  const windows = generate2026Windows();
  const window = windows.find((w) => w.id === windowId);
  if (!window) return [];

  const fundedDeals = deals.filter(
    (d) =>
      d.status === "closed_funded" &&
      d.closedFundedDate &&
      d.closedFundedDate >= window.startDate &&
      d.closedFundedDate <= window.endDate
  );

  // Build per-rep summaries (both acq and dispo reps get commission)
  const repMap = new Map<string, { deals: WindowDeal[]; revenue: number }>();

  for (const deal of fundedDeals) {
    const fee = deal.assignmentFee ?? 0;
    const wd: WindowDeal = {
      dealId: deal.id,
      propertyAddress: deal.propertyAddress,
      closedFundedDate: deal.closedFundedDate!,
      assignmentFee: fee,
    };

    // Acq rep
    if (deal.acquisitionsRepId) {
      const entry = repMap.get(deal.acquisitionsRepId) ?? { deals: [], revenue: 0 };
      entry.deals.push(wd);
      entry.revenue += fee;
      repMap.set(deal.acquisitionsRepId, entry);
    }

    // Dispo rep
    if (deal.dispoRepId) {
      const entry = repMap.get(deal.dispoRepId) ?? { deals: [], revenue: 0 };
      entry.deals.push(wd);
      entry.revenue += fee;
      repMap.set(deal.dispoRepId, entry);
    }
  }

  const summaries: RepWindowSummary[] = [];
  for (const [repId, data] of repMap) {
    const user = users.find((u) => u.id === repId);
    if (!user) continue;
    summaries.push({
      repId,
      repName: user.name,
      team: user.team as "acquisitions" | "dispositions",
      windowId,
      fundedDeals: data.deals.length,
      fundedRevenue: data.revenue,
      commissionRate: getCommissionRate(data.revenue),
      commissionEarned: getCommissionEarned(data.revenue),
      deals: data.deals,
    });
  }

  return summaries.sort((a, b) => b.fundedRevenue - a.fundedRevenue);
}
