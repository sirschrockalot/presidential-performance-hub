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

/** Flat bonuses when cumulative funded (or assigned) revenue crosses each threshold — all earned tiers stack. */
export const COMMISSION_FUNDING_MILESTONE_BONUSES: ReadonlyArray<{
  fundedThreshold: number;
  bonus: number;
}> = [
  { fundedThreshold: 50_000, bonus: 500 },
  { fundedThreshold: 100_000, bonus: 1_000 },
  { fundedThreshold: 125_000, bonus: 2_500 },
  { fundedThreshold: 150_000, bonus: 5_000 },
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
  /** Commission from tier % only (before milestone bonuses) */
  tierCommission: number;
  /** Sum of flat bonuses for thresholds crossed */
  milestoneBonus: number;
  /** tierCommission + milestoneBonus */
  commissionEarned: number;
  deals: WindowDeal[];
}

export interface WindowDeal {
  dealId: string;
  propertyAddress: string;
  closedFundedDate: string;
  assignmentFee: number;
}

/** A rep's potential commissions from assigned (not funded) deals */
export interface PotentialRepSummary {
  repId: string;
  repName: string;
  team: "acquisitions" | "dispositions";
  assignedDeals: number;
  assignedRevenue: number;
  potentialCommissionRate: number;
  /** Tier % portion on assigned revenue (before milestone bonuses) */
  tierPotentialCommission: number;
  /** Bonuses that would apply if assigned revenue were funded at these totals */
  milestoneBonus: number;
  /** tierPotentialCommission + milestoneBonus */
  potentialCommission: number;
  deals: WindowDeal[];
}

export function getCommissionRate(totalRevenue: number): number {
  if (totalRevenue > 100_000) return 0.12;
  if (totalRevenue > 50_000) return 0.10;
  return 0.08;
}

/** Tier percentage commission only (excludes funding milestone flat bonuses). */
export function getCommissionEarned(totalRevenue: number): number {
  const rate = getCommissionRate(totalRevenue);
  return totalRevenue * rate;
}

/** Cumulative flat bonuses for each funding threshold the rep has reached. */
export function getFundingMilestoneBonuses(fundedRevenue: number): number {
  return COMMISSION_FUNDING_MILESTONE_BONUSES.reduce(
    (sum, row) => (fundedRevenue >= row.fundedThreshold ? sum + row.bonus : sum),
    0
  );
}

/** Tier % commission plus funding milestone bonuses. */
export function getTotalCommissionWithMilestones(fundedRevenue: number): number {
  return getCommissionEarned(fundedRevenue) + getFundingMilestoneBonuses(fundedRevenue);
}
