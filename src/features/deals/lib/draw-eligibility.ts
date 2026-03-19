import type { DealStatus } from "@/types";

const STATUS_ORDER: DealStatus[] = [
  "lead",
  "under_contract",
  "marketed",
  "buyer_committed",
  "emd_received",
  "assigned",
  "closed_funded",
];

/**
 * Draws are only eligible when deal is at least Assigned and buyer EMD is received.
 */
export function checkDrawEligibilityFromDeal(deal: {
  status: DealStatus;
  buyerEmdReceived: boolean;
}): { eligible: boolean; reason?: string } {
  const assignedIdx = STATUS_ORDER.indexOf("assigned");
  const dealIdx = STATUS_ORDER.indexOf(deal.status);

  if (deal.status === "canceled") {
    return { eligible: false, reason: "Deal is canceled" };
  }

  if (dealIdx < 0 || dealIdx < assignedIdx) {
    return { eligible: false, reason: 'Deal must be at least "Assigned" status' };
  }
  if (!deal.buyerEmdReceived) {
    return { eligible: false, reason: "Buyer EMD must be received" };
  }
  return { eligible: true };
}
