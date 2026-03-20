import type { PrismaClient } from "@prisma/client";
import type { TeamCode } from "@prisma/client";

import type { DealActor } from "@/features/deals/server/deal-scope";
import { dealWhereForScope } from "@/features/deals/server/deal-scope";
import { resolvedAssignmentFeeOrCompute } from "@/features/deals/utils/assignment-fee";
import { generate2026Windows } from "@/features/commissions/utils/windows";
import {
  getCommissionEarned,
  getCommissionRate,
  getFundingMilestoneBonuses,
} from "@/features/commissions/types";
import type {
  CommissionWindow,
  PotentialRepSummary,
  RepWindowSummary,
  WindowDeal,
} from "@/features/commissions/types";

function parseDateOnlyUtc(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

function dateOnlyUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mapTeamCode(code: TeamCode): "acquisitions" | "dispositions" {
  return code === "DISPOSITIONS" ? "dispositions" : "acquisitions";
}

export function listCommissionWindows(): CommissionWindow[] {
  return generate2026Windows();
}

export async function listRepWindowSummaries(
  prisma: PrismaClient,
  actor: DealActor,
  windowId: string
): Promise<RepWindowSummary[]> {
  const window = generate2026Windows().find((w) => w.id === windowId);
  if (!window) return [];

  const start = parseDateOnlyUtc(window.startDate);
  const endInclusive = parseDateOnlyUtc(window.endDate);
  const endExclusive = new Date(endInclusive.getTime() + 24 * 60 * 60 * 1000);

  const fundedDeals = await prisma.deal.findMany({
    where: {
      ...dealWhereForScope(actor),
      status: "CLOSED_FUNDED",
      closedFundedDate: { gte: start, lt: endExclusive },
    },
    select: {
      id: true,
      propertyAddress: true,
      closedFundedDate: true,
      contractPrice: true,
      assignmentPrice: true,
      assignmentFee: true,
      acquisitionsRep: { select: { id: true, name: true, team: { select: { code: true } } } },
      dispoRep: { select: { id: true, name: true, team: { select: { code: true } } } },
    },
  });

  type RepAgg = {
    repName: string;
    team: "acquisitions" | "dispositions";
    deals: WindowDeal[];
    revenue: number;
    dealIds: Set<string>;
  };

  const repMap = new Map<string, RepAgg>();

  function addDealForRep(
    repId: string,
    repName: string,
    teamCode: TeamCode,
    wd: WindowDeal,
    fee: number
  ) {
    const entry =
      repMap.get(repId) ??
      ({
        repName,
        team: mapTeamCode(teamCode),
        deals: [],
        revenue: 0,
        dealIds: new Set<string>(),
      } satisfies RepAgg);

    // Same user can be both acq + dispo on one deal — count revenue & list row once per rep.
    if (!entry.dealIds.has(wd.dealId)) {
      entry.dealIds.add(wd.dealId);
      entry.deals.push(wd);
      entry.revenue += fee;
    }
    repMap.set(repId, entry);
  }

  for (const deal of fundedDeals) {
    const fee =
      resolvedAssignmentFeeOrCompute(
        Number(deal.contractPrice),
        deal.assignmentPrice != null ? Number(deal.assignmentPrice) : null,
        deal.assignmentFee != null ? Number(deal.assignmentFee) : null,
        0
      ) ?? 0;
    const closedDate = deal.closedFundedDate ? dateOnlyUtc(deal.closedFundedDate) : window.endDate;
    const wd: WindowDeal = {
      dealId: deal.id,
      propertyAddress: deal.propertyAddress,
      closedFundedDate: closedDate,
      assignmentFee: fee,
    };

    addDealForRep(
      deal.acquisitionsRep.id,
      deal.acquisitionsRep.name,
      deal.acquisitionsRep.team.code,
      wd,
      fee
    );

    if (deal.dispoRep) {
      addDealForRep(deal.dispoRep.id, deal.dispoRep.name, deal.dispoRep.team.code, wd, fee);
    }
  }

  const summaries: RepWindowSummary[] = Array.from(repMap.entries()).map(([repId, agg]) => {
    const tierCommission = getCommissionEarned(agg.revenue);
    const milestoneBonus = getFundingMilestoneBonuses(agg.revenue);
    return {
      repId,
      repName: agg.repName,
      team: agg.team,
      windowId,
      fundedDeals: agg.deals.length,
      fundedRevenue: agg.revenue,
      commissionRate: getCommissionRate(agg.revenue),
      tierCommission,
      milestoneBonus,
      commissionEarned: tierCommission + milestoneBonus,
      deals: agg.deals,
    };
  });

  return summaries.sort((a, b) => b.fundedRevenue - a.fundedRevenue);
}

export async function listPotentialRepSummaries(
  prisma: PrismaClient,
  actor: DealActor
): Promise<PotentialRepSummary[]> {
  const assignedDeals = await prisma.deal.findMany({
    where: {
      ...dealWhereForScope(actor),
      status: "ASSIGNED",
    },
    include: {
      acquisitionsRep: { select: { id: true, name: true, team: { select: { code: true } } } },
      dispoRep: { select: { id: true, name: true, team: { select: { code: true } } } },
    },
  });

  type RepAgg = {
    repName: string;
    team: "acquisitions" | "dispositions";
    deals: WindowDeal[];
    revenue: number;
    dealIds: Set<string>;
  };

  const repMap = new Map<string, RepAgg>();

  function addDealForRep(
    repId: string,
    repName: string,
    teamCode: TeamCode,
    wd: WindowDeal,
    fee: number
  ) {
    const entry =
      repMap.get(repId) ??
      ({
        repName,
        team: mapTeamCode(teamCode),
        deals: [],
        revenue: 0,
        dealIds: new Set<string>(),
      } satisfies RepAgg);

    if (!entry.dealIds.has(wd.dealId)) {
      entry.dealIds.add(wd.dealId);
      entry.deals.push(wd);
      entry.revenue += fee;
    }
    repMap.set(repId, entry);
  }

  for (const deal of assignedDeals) {
    const fee =
      resolvedAssignmentFeeOrCompute(
        Number(deal.contractPrice),
        deal.assignmentPrice != null ? Number(deal.assignmentPrice) : null,
        deal.assignmentFee != null ? Number(deal.assignmentFee) : null,
        0
      ) ?? 0;
    const wd: WindowDeal = {
      dealId: deal.id,
      propertyAddress: deal.propertyAddress,
      closedFundedDate: deal.closedFundedDate ? dateOnlyUtc(deal.closedFundedDate) : "TBD",
      assignmentFee: fee,
    };

    addDealForRep(
      deal.acquisitionsRep.id,
      deal.acquisitionsRep.name,
      deal.acquisitionsRep.team.code,
      wd,
      fee
    );
    if (deal.dispoRep) {
      addDealForRep(deal.dispoRep.id, deal.dispoRep.name, deal.dispoRep.team.code, wd, fee);
    }
  }

  const summaries: PotentialRepSummary[] = Array.from(repMap.entries()).map(([repId, agg]) => {
    const tierPotentialCommission = getCommissionEarned(agg.revenue);
    const milestoneBonus = getFundingMilestoneBonuses(agg.revenue);
    return {
      repId,
      repName: agg.repName,
      team: agg.team,
      assignedDeals: agg.deals.length,
      assignedRevenue: agg.revenue,
      potentialCommissionRate: getCommissionRate(agg.revenue),
      tierPotentialCommission,
      milestoneBonus,
      potentialCommission: tierPotentialCommission + milestoneBonus,
      deals: agg.deals,
    };
  });

  return summaries.sort((a, b) => b.assignedRevenue - a.assignedRevenue);
}
