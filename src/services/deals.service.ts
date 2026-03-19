import { Deal, DealStatus } from '@/types';
import { deals as mockDeals, getUserById } from '@/data/mock-data';

export interface DealFilters {
  search?: string;
  status?: DealStatus | 'all';
  acquisitionsRepId?: string;
  dispoRepId?: string;
}

export interface DealWithReps extends Deal {
  acquisitionsRepName: string;
  dispoRepName: string | null;
  tcName: string | null;
}

function enrichDeal(deal: Deal): DealWithReps {
  return {
    ...deal,
    acquisitionsRepName: getUserById(deal.acquisitionsRepId)?.name ?? 'Unknown',
    dispoRepName: deal.dispoRepId ? getUserById(deal.dispoRepId)?.name ?? null : null,
    tcName: deal.transactionCoordinatorId ? getUserById(deal.transactionCoordinatorId)?.name ?? null : null,
  };
}

/** Simulates async DB fetch — swap implementation for Prisma/API later */
export async function fetchDeals(filters?: DealFilters): Promise<DealWithReps[]> {
  let result = [...mockDeals];

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      d =>
        d.propertyAddress.toLowerCase().includes(q) ||
        d.sellerName.toLowerCase().includes(q) ||
        (d.buyerName?.toLowerCase().includes(q) ?? false)
    );
  }

  if (filters?.status && filters.status !== 'all') {
    result = result.filter(d => d.status === filters.status);
  }

  if (filters?.acquisitionsRepId) {
    result = result.filter(d => d.acquisitionsRepId === filters.acquisitionsRepId);
  }

  if (filters?.dispoRepId) {
    result = result.filter(d => d.dispoRepId === filters.dispoRepId);
  }

  return result.map(enrichDeal);
}

export async function fetchDealById(id: string): Promise<DealWithReps | null> {
  const deal = mockDeals.find(d => d.id === id);
  return deal ? enrichDeal(deal) : null;
}

export function getDealMetrics() {
  const funded = mockDeals.filter(d => d.status === 'closed_funded');
  const active = mockDeals.filter(d => !['closed_funded', 'canceled'].includes(d.status));
  const totalRevenue = funded.reduce((s, d) => s + (d.assignmentFee || 0), 0);

  return {
    totalDeals: mockDeals.length,
    activeCount: active.length,
    fundedCount: funded.length,
    canceledCount: mockDeals.filter(d => d.status === 'canceled').length,
    totalRevenue,
    avgFee: funded.length ? Math.round(totalRevenue / funded.length) : 0,
    pipelineByStatus: [
      { name: 'Lead', count: mockDeals.filter(d => d.status === 'lead').length },
      { name: 'Contract', count: mockDeals.filter(d => d.status === 'under_contract').length },
      { name: 'Marketed', count: mockDeals.filter(d => d.status === 'marketed').length },
      { name: 'Committed', count: mockDeals.filter(d => d.status === 'buyer_committed').length },
      { name: 'EMD In', count: mockDeals.filter(d => d.status === 'emd_received').length },
      { name: 'Assigned', count: mockDeals.filter(d => d.status === 'assigned').length },
      { name: 'Funded', count: mockDeals.filter(d => d.status === 'closed_funded').length },
    ],
  };
}
