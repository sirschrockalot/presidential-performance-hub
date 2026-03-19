export type UserRole = 'admin' | 'acquisitions_manager' | 'dispositions_manager' | 'transaction_coordinator' | 'rep';
export type Team = 'acquisitions' | 'dispositions' | 'operations';

export type DealStatus = 'lead' | 'under_contract' | 'marketed' | 'buyer_committed' | 'emd_received' | 'assigned' | 'closed_funded' | 'canceled';

export type DrawStatus = 'pending' | 'approved' | 'paid' | 'recouped' | 'denied';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team: Team;
  avatar?: string;
  active: boolean;
  joinedAt: string;
}

export interface Deal {
  id: string;
  propertyAddress: string;
  sellerName: string;
  buyerName: string | null;
  acquisitionsRepId: string;
  dispoRepId: string | null;
  transactionCoordinatorId: string | null;
  contractDate: string;
  assignedDate: string | null;
  closedFundedDate: string | null;
  contractPrice: number;
  assignmentPrice: number | null;
  assignmentFee: number | null;
  buyerEmdAmount: number | null;
  buyerEmdReceived: boolean;
  titleCompany: string;
  inspectionEndDate: string | null;
  status: DealStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface KpiEntry {
  id: string;
  userId: string;
  team: Team;
  weekStarting: string;
  dials: number;
  talkTimeMinutes: number;
  leadsWorked?: number;
  offersMade?: number;
  contractsSigned?: number;
  falloutCount: number;
  revenueFromFunded: number;
  buyerConversations?: number;
  propertiesMarketed?: number;
  emdsReceived?: number;
  assignmentsSecured?: number;
  avgAssignmentFee?: number;
}

export interface Draw {
  id: string;
  repId: string;
  dealId: string;
  amount: number;
  dateIssued: string;
  status: DrawStatus;
  approvedBy: string | null;
  notes: string;
  amountRecouped: number;
  remainingBalance: number;
  eligible: boolean;
}

export interface PointEvent {
  id: string;
  userId: string;
  dealId: string;
  points: number;
  reason: string;
  createdAt: string;
  isManualAdjustment: boolean;
  adjustedBy?: string;
}

export interface DealStatusHistory {
  id: string;
  dealId: string;
  fromStatus: DealStatus | null;
  toStatus: DealStatus;
  changedBy: string;
  changedAt: string;
  note?: string;
}

export const DEAL_STATUS_CONFIG: Record<DealStatus, { label: string; color: string }> = {
  lead: { label: 'Lead', color: 'bg-muted text-muted-foreground' },
  under_contract: { label: 'Under Contract', color: 'bg-info/15 text-info' },
  marketed: { label: 'Marketed', color: 'bg-info/15 text-info' },
  buyer_committed: { label: 'Buyer Committed', color: 'bg-warning/15 text-warning' },
  emd_received: { label: 'EMD Received', color: 'bg-warning/15 text-warning' },
  assigned: { label: 'Assigned', color: 'bg-emerald/15 text-emerald' },
  closed_funded: { label: 'Closed / Funded', color: 'bg-success/15 text-success' },
  canceled: { label: 'Canceled', color: 'bg-destructive/15 text-destructive' },
};

export const DRAW_STATUS_CONFIG: Record<DrawStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-warning/15 text-warning' },
  approved: { label: 'Approved', color: 'bg-info/15 text-info' },
  paid: { label: 'Paid', color: 'bg-success/15 text-success' },
  recouped: { label: 'Recouped', color: 'bg-muted text-muted-foreground' },
  denied: { label: 'Denied', color: 'bg-destructive/15 text-destructive' },
};

export function calculatePoints(assignmentFee: number): { base: number; bonus: number; total: number } {
  let base = 2;
  if (assignmentFee < 8000) base = 1;
  let bonus = 0;
  if (assignmentFee >= 20000) bonus = 3;
  else if (assignmentFee >= 15000) bonus = 2;
  else if (assignmentFee >= 10000) bonus = 1;
  return { base, bonus, total: base + bonus };
}

export function calculateTcPoints(): number {
  return 0.5;
}
