/** 45-day rolling commission window */
export interface CommissionWindow {
  id: string;
  /** Window number within the year (1, 2, 3, …) */
  windowNumber: number;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  /** Is the current date inside this window? */
  isCurrent: boolean;
}

export interface CommissionTier {
  label: string;
  minRevenue: number;
  maxRevenue: number | null; // null = uncapped
  rate: number; // e.g. 0.08
}

export const COMMISSION_TIERS: CommissionTier[] = [
  { label: "Tier 1", minRevenue: 0, maxRevenue: 50_000, rate: 0.08 },
  { label: "Tier 2", minRevenue: 50_001, maxRevenue: 100_000, rate: 0.10 },
  { label: "Tier 3", minRevenue: 100_001, maxRevenue: null, rate: 0.12 },
];

/** A rep's performance within one 45-day window */
export interface RepWindowSummary {
  repId: string;
  repName: string;
  team: "acquisitions" | "dispositions";
  windowId: string;
  fundedDeals: number;
  fundedRevenue: number;
  /** Which tier they qualified for (flat rate) */
  commissionRate: number;
  commissionEarned: number;
  deals: WindowDeal[];
}

export interface WindowDeal {
  dealId: string;
  propertyAddress: string;
  closedFundedDate: string;
  assignmentFee: number;
}

export function getCommissionRate(totalRevenue: number): number {
  if (totalRevenue > 100_000) return 0.12;
  if (totalRevenue > 50_000) return 0.10;
  return 0.08;
}

export function getCommissionEarned(totalRevenue: number): number {
  const rate = getCommissionRate(totalRevenue);
  return totalRevenue * rate;
}
