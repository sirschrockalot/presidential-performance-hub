/**
 * Draws Service — SWAP POINT
 * Replace mock imports below with Prisma queries or API fetch calls.
 * Business rule: draws only eligible when deal is Assigned + EMD received.
 */
import { Draw, DrawStatus } from '@/types';
import { draws as mockDraws, getUserById, getDealById } from '@/data/mock-data';

export interface DrawWithDetails extends Draw {
  repName: string;
  dealAddress: string;
}

function enrichDraw(draw: Draw): DrawWithDetails {
  const deal = getDealById(draw.dealId);
  return {
    ...draw,
    repName: getUserById(draw.repId)?.name ?? 'Unknown',
    dealAddress: deal?.propertyAddress ?? 'Unknown',
  };
}

export async function fetchDraws(statusFilter?: DrawStatus | 'all'): Promise<DrawWithDetails[]> {
  let result = [...mockDraws];
  if (statusFilter && statusFilter !== 'all') {
    result = result.filter(d => d.status === statusFilter);
  }
  return result.map(enrichDraw);
}

export function getDrawMetrics() {
  const outstanding = mockDraws
    .filter(d => ['paid', 'approved'].includes(d.status))
    .reduce((s, d) => s + d.remainingBalance, 0);

  return {
    outstanding,
    pendingCount: mockDraws.filter(d => d.status === 'pending').length,
    totalRecouped: mockDraws.reduce((s, d) => s + d.amountRecouped, 0),
    ineligibleCount: mockDraws.filter(d => !d.eligible).length,
  };
}

/**
 * Business rule: draw is only eligible if the deal is assigned AND buyer EMD received.
 */
export function checkDrawEligibility(dealId: string): { eligible: boolean; reason?: string } {
  const deal = getDealById(dealId);
  if (!deal) return { eligible: false, reason: 'Deal not found' };

  const statusOrder = ['lead', 'under_contract', 'marketed', 'buyer_committed', 'emd_received', 'assigned', 'closed_funded'];
  const dealStatusIdx = statusOrder.indexOf(deal.status);
  const assignedIdx = statusOrder.indexOf('assigned');

  if (dealStatusIdx < assignedIdx) {
    return { eligible: false, reason: 'Deal must be at least Assigned status' };
  }
  if (!deal.buyerEmdReceived) {
    return { eligible: false, reason: 'Buyer EMD must be received' };
  }
  return { eligible: true };
}
