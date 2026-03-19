import { User, Deal, KpiEntry, Draw, PointEvent } from '@/types';

export const users: User[] = [
  { id: 'u1', name: 'Marcus Johnson', email: 'marcus@presidentialdigs.com', role: 'admin', team: 'operations', active: true, joinedAt: '2023-01-15' },
  { id: 'u2', name: 'Keisha Williams', email: 'keisha@presidentialdigs.com', role: 'acquisitions_manager', team: 'acquisitions', active: true, joinedAt: '2023-03-01' },
  { id: 'u3', name: 'Derek Thompson', email: 'derek@presidentialdigs.com', role: 'dispositions_manager', team: 'dispositions', active: true, joinedAt: '2023-04-10' },
  { id: 'u4', name: 'Jasmine Carter', email: 'jasmine@presidentialdigs.com', role: 'transaction_coordinator', team: 'operations', active: true, joinedAt: '2023-06-01' },
  { id: 'u5', name: 'Andre Davis', email: 'andre@presidentialdigs.com', role: 'rep', team: 'acquisitions', active: true, joinedAt: '2023-07-15' },
  { id: 'u6', name: 'Tanya Mitchell', email: 'tanya@presidentialdigs.com', role: 'rep', team: 'acquisitions', active: true, joinedAt: '2023-08-01' },
  { id: 'u7', name: 'Brandon Lewis', email: 'brandon@presidentialdigs.com', role: 'rep', team: 'dispositions', active: true, joinedAt: '2023-09-01' },
  { id: 'u8', name: 'Nicole Foster', email: 'nicole@presidentialdigs.com', role: 'rep', team: 'dispositions', active: true, joinedAt: '2023-10-15' },
  { id: 'u9', name: 'Chris Banks', email: 'chris@presidentialdigs.com', role: 'rep', team: 'acquisitions', active: false, joinedAt: '2023-05-01' },
];

export const deals: Deal[] = [
  { id: 'd1', propertyAddress: '1423 Oak Ridge Dr, Dallas TX 75228', sellerName: 'Robert Green', buyerName: 'Apex Homes LLC', acquisitionsRepId: 'u5', dispoRepId: 'u7', transactionCoordinatorId: 'u4', contractDate: '2025-12-01', assignedDate: '2025-12-18', closedFundedDate: '2026-01-10', contractPrice: 165000, assignmentPrice: 185000, assignmentFee: 20000, buyerEmdAmount: 5000, buyerEmdReceived: true, titleCompany: 'Republic Title', inspectionEndDate: '2025-12-15', status: 'closed_funded', notes: 'Clean deal, fast close.', createdAt: '2025-12-01', updatedAt: '2026-01-10' },
  { id: 'd2', propertyAddress: '892 Elm St, Fort Worth TX 76104', sellerName: 'Maria Santos', buyerName: 'FlipCo Investments', acquisitionsRepId: 'u6', dispoRepId: 'u8', transactionCoordinatorId: 'u4', contractDate: '2025-12-10', assignedDate: '2026-01-05', closedFundedDate: '2026-02-01', contractPrice: 120000, assignmentPrice: 135000, assignmentFee: 15000, buyerEmdAmount: 3000, buyerEmdReceived: true, titleCompany: 'Fidelity National', inspectionEndDate: '2025-12-24', status: 'closed_funded', notes: '', createdAt: '2025-12-10', updatedAt: '2026-02-01' },
  { id: 'd3', propertyAddress: '3301 Magnolia Ave, Arlington TX 76015', sellerName: 'James Wilson', buyerName: 'TurnKey Capital', acquisitionsRepId: 'u5', dispoRepId: 'u7', transactionCoordinatorId: 'u4', contractDate: '2026-01-08', assignedDate: '2026-01-25', closedFundedDate: '2026-02-15', contractPrice: 195000, assignmentPrice: 207000, assignmentFee: 12000, buyerEmdAmount: 5000, buyerEmdReceived: true, titleCompany: 'Chicago Title', inspectionEndDate: '2026-01-22', status: 'closed_funded', notes: 'Buyer negotiated down slightly.', createdAt: '2026-01-08', updatedAt: '2026-02-15' },
  { id: 'd4', propertyAddress: '567 Pine Valley Rd, Plano TX 75023', sellerName: 'Sarah Thompson', buyerName: 'LoneStarBuyers', acquisitionsRepId: 'u6', dispoRepId: 'u8', transactionCoordinatorId: 'u4', contractDate: '2026-01-20', assignedDate: '2026-02-10', closedFundedDate: '2026-03-01', contractPrice: 140000, assignmentPrice: 147500, assignmentFee: 7500, buyerEmdAmount: 2500, buyerEmdReceived: true, titleCompany: 'Stewart Title', inspectionEndDate: '2026-02-03', status: 'closed_funded', notes: 'Tight margins but closed.', createdAt: '2026-01-20', updatedAt: '2026-03-01' },
  { id: 'd5', propertyAddress: '2100 Cedar Creek Blvd, Irving TX 75061', sellerName: 'Michael Brown', buyerName: 'EquityFirst', acquisitionsRepId: 'u5', dispoRepId: 'u7', transactionCoordinatorId: 'u4', contractDate: '2026-02-01', assignedDate: '2026-02-20', closedFundedDate: '2026-03-10', contractPrice: 210000, assignmentPrice: 235000, assignmentFee: 25000, buyerEmdAmount: 7500, buyerEmdReceived: true, titleCompany: 'Republic Title', inspectionEndDate: '2026-02-15', status: 'closed_funded', notes: 'Big spread deal!', createdAt: '2026-02-01', updatedAt: '2026-03-10' },
  { id: 'd6', propertyAddress: '445 Riverside Dr, Garland TX 75040', sellerName: 'Linda Martinez', buyerName: 'TexasCashOffers', acquisitionsRepId: 'u6', dispoRepId: 'u8', transactionCoordinatorId: 'u4', contractDate: '2026-02-14', assignedDate: '2026-03-01', closedFundedDate: null, contractPrice: 155000, assignmentPrice: 165000, assignmentFee: 10000, buyerEmdAmount: 3500, buyerEmdReceived: true, titleCompany: 'Old Republic Title', inspectionEndDate: '2026-02-28', status: 'assigned', notes: 'Awaiting closing date.', createdAt: '2026-02-14', updatedAt: '2026-03-01' },
  { id: 'd7', propertyAddress: '7890 Sunset Blvd, McKinney TX 75070', sellerName: 'David Kim', buyerName: 'RenovatePro', acquisitionsRepId: 'u5', dispoRepId: 'u7', transactionCoordinatorId: 'u4', contractDate: '2026-02-20', assignedDate: null, closedFundedDate: null, contractPrice: 180000, assignmentPrice: null, assignmentFee: null, buyerEmdAmount: null, buyerEmdReceived: false, titleCompany: 'First American', inspectionEndDate: '2026-03-06', status: 'emd_received', notes: 'Buyer EMD in, finalizing assignment.', createdAt: '2026-02-20', updatedAt: '2026-03-05' },
  { id: 'd8', propertyAddress: '1200 Heritage Dr, Mesquite TX 75150', sellerName: 'Patricia Jones', buyerName: null, acquisitionsRepId: 'u6', dispoRepId: null, transactionCoordinatorId: null, contractDate: '2026-03-01', assignedDate: null, closedFundedDate: null, contractPrice: 135000, assignmentPrice: null, assignmentFee: null, buyerEmdAmount: null, buyerEmdReceived: false, titleCompany: 'Republic Title', inspectionEndDate: '2026-03-15', status: 'marketed', notes: 'Active marketing.', createdAt: '2026-03-01', updatedAt: '2026-03-05' },
  { id: 'd9', propertyAddress: '3456 Liberty Ln, Richardson TX 75080', sellerName: 'Thomas White', buyerName: null, acquisitionsRepId: 'u5', dispoRepId: null, transactionCoordinatorId: null, contractDate: '2026-03-05', assignedDate: null, closedFundedDate: null, contractPrice: 225000, assignmentPrice: null, assignmentFee: null, buyerEmdAmount: null, buyerEmdReceived: false, titleCompany: 'Fidelity National', inspectionEndDate: '2026-03-19', status: 'under_contract', notes: 'Inspection period active.', createdAt: '2026-03-05', updatedAt: '2026-03-05' },
  { id: 'd10', propertyAddress: '678 Pecan Grove, Denton TX 76201', sellerName: 'Angela Harris', buyerName: null, acquisitionsRepId: 'u6', dispoRepId: null, transactionCoordinatorId: null, contractDate: '2026-03-10', assignedDate: null, closedFundedDate: null, contractPrice: 98000, assignmentPrice: null, assignmentFee: null, buyerEmdAmount: null, buyerEmdReceived: false, titleCompany: 'Chicago Title', inspectionEndDate: '2026-03-24', status: 'lead', notes: 'Seller motivated, low price point.', createdAt: '2026-03-10', updatedAt: '2026-03-10' },
  { id: 'd11', propertyAddress: '1100 Eagle Pass Rd, Carrollton TX 75006', sellerName: 'Frank Robinson', buyerName: 'DFW Rentals Inc', acquisitionsRepId: 'u5', dispoRepId: 'u8', transactionCoordinatorId: 'u4', contractDate: '2026-01-15', assignedDate: '2026-02-01', closedFundedDate: '2026-02-20', contractPrice: 175000, assignmentPrice: 183000, assignmentFee: 8000, buyerEmdAmount: 3000, buyerEmdReceived: true, titleCompany: 'Stewart Title', inspectionEndDate: '2026-01-29', status: 'closed_funded', notes: '', createdAt: '2026-01-15', updatedAt: '2026-02-20' },
  { id: 'd12', propertyAddress: '2345 Willowbrook Dr, Lewisville TX 75067', sellerName: 'Helen Clark', buyerName: null, acquisitionsRepId: 'u6', dispoRepId: 'u7', transactionCoordinatorId: null, contractDate: '2026-02-25', assignedDate: null, closedFundedDate: null, contractPrice: 160000, assignmentPrice: null, assignmentFee: null, buyerEmdAmount: null, buyerEmdReceived: false, titleCompany: 'Republic Title', inspectionEndDate: '2026-03-11', status: 'buyer_committed', notes: 'Buyer verbal commit, waiting on EMD.', createdAt: '2026-02-25', updatedAt: '2026-03-08' },
  { id: 'd13', propertyAddress: '890 Lakeside Ct, Frisco TX 75034', sellerName: 'Steven Adams', buyerName: 'Apex Homes LLC', acquisitionsRepId: 'u5', dispoRepId: 'u7', transactionCoordinatorId: 'u4', contractDate: '2025-11-15', assignedDate: '2025-12-01', closedFundedDate: null, contractPrice: 200000, assignmentPrice: 210000, assignmentFee: 10000, buyerEmdAmount: 5000, buyerEmdReceived: true, titleCompany: 'Old Republic Title', inspectionEndDate: '2025-11-29', status: 'canceled', notes: 'Buyer backed out, deal fell through.', createdAt: '2025-11-15', updatedAt: '2025-12-10' },
];

export const kpiEntries: KpiEntry[] = [
  // Andre - Acquisitions
  { id: 'k1', userId: 'u5', team: 'acquisitions', weekStarting: '2026-03-03', dials: 245, talkTimeMinutes: 480, leadsWorked: 42, offersMade: 12, contractsSigned: 2, falloutCount: 1, revenueFromFunded: 0 },
  { id: 'k2', userId: 'u5', team: 'acquisitions', weekStarting: '2026-02-24', dials: 280, talkTimeMinutes: 520, leadsWorked: 50, offersMade: 15, contractsSigned: 3, falloutCount: 0, revenueFromFunded: 25000 },
  { id: 'k3', userId: 'u5', team: 'acquisitions', weekStarting: '2026-02-17', dials: 210, talkTimeMinutes: 410, leadsWorked: 35, offersMade: 10, contractsSigned: 1, falloutCount: 1, revenueFromFunded: 0 },
  { id: 'k4', userId: 'u5', team: 'acquisitions', weekStarting: '2026-02-10', dials: 260, talkTimeMinutes: 500, leadsWorked: 45, offersMade: 14, contractsSigned: 2, falloutCount: 0, revenueFromFunded: 20000 },
  // Tanya - Acquisitions
  { id: 'k5', userId: 'u6', team: 'acquisitions', weekStarting: '2026-03-03', dials: 230, talkTimeMinutes: 460, leadsWorked: 38, offersMade: 11, contractsSigned: 1, falloutCount: 0, revenueFromFunded: 0 },
  { id: 'k6', userId: 'u6', team: 'acquisitions', weekStarting: '2026-02-24', dials: 255, talkTimeMinutes: 490, leadsWorked: 44, offersMade: 13, contractsSigned: 2, falloutCount: 1, revenueFromFunded: 7500 },
  { id: 'k7', userId: 'u6', team: 'acquisitions', weekStarting: '2026-02-17', dials: 270, talkTimeMinutes: 530, leadsWorked: 48, offersMade: 16, contractsSigned: 3, falloutCount: 0, revenueFromFunded: 15000 },
  { id: 'k8', userId: 'u6', team: 'acquisitions', weekStarting: '2026-02-10', dials: 220, talkTimeMinutes: 440, leadsWorked: 36, offersMade: 9, contractsSigned: 1, falloutCount: 1, revenueFromFunded: 0 },
  // Brandon - Dispositions
  { id: 'k9', userId: 'u7', team: 'dispositions', weekStarting: '2026-03-03', dials: 180, talkTimeMinutes: 350, buyerConversations: 28, propertiesMarketed: 5, emdsReceived: 1, assignmentsSecured: 1, avgAssignmentFee: 10000, falloutCount: 0, revenueFromFunded: 25000 },
  { id: 'k10', userId: 'u7', team: 'dispositions', weekStarting: '2026-02-24', dials: 195, talkTimeMinutes: 380, buyerConversations: 32, propertiesMarketed: 6, emdsReceived: 2, assignmentsSecured: 2, avgAssignmentFee: 16000, falloutCount: 1, revenueFromFunded: 32000 },
  // Nicole - Dispositions
  { id: 'k11', userId: 'u8', team: 'dispositions', weekStarting: '2026-03-03', dials: 165, talkTimeMinutes: 320, buyerConversations: 25, propertiesMarketed: 4, emdsReceived: 1, assignmentsSecured: 0, avgAssignmentFee: 0, falloutCount: 0, revenueFromFunded: 0 },
  { id: 'k12', userId: 'u8', team: 'dispositions', weekStarting: '2026-02-24', dials: 190, talkTimeMinutes: 370, buyerConversations: 30, propertiesMarketed: 5, emdsReceived: 2, assignmentsSecured: 1, avgAssignmentFee: 7500, falloutCount: 1, revenueFromFunded: 7500 },
];

export const draws: Draw[] = [
  { id: 'dr1', repId: 'u5', dealId: 'd1', amount: 3000, dateIssued: '2025-12-20', status: 'recouped', approvedBy: 'u1', notes: 'Advance on d1', amountRecouped: 3000, remainingBalance: 0, eligible: true },
  { id: 'dr2', repId: 'u7', dealId: 'd1', amount: 2500, dateIssued: '2025-12-22', status: 'recouped', approvedBy: 'u1', notes: 'Dispo draw on d1', amountRecouped: 2500, remainingBalance: 0, eligible: true },
  { id: 'dr3', repId: 'u5', dealId: 'd5', amount: 5000, dateIssued: '2026-02-22', status: 'paid', approvedBy: 'u1', notes: 'Draw on big deal', amountRecouped: 0, remainingBalance: 5000, eligible: true },
  { id: 'dr4', repId: 'u6', dealId: 'd6', amount: 2000, dateIssued: '2026-03-05', status: 'approved', approvedBy: 'u1', notes: 'Approved, pending payment', amountRecouped: 0, remainingBalance: 2000, eligible: true },
  { id: 'dr5', repId: 'u8', dealId: 'd6', amount: 1500, dateIssued: '2026-03-08', status: 'pending', approvedBy: null, notes: 'Awaiting admin review', amountRecouped: 0, remainingBalance: 1500, eligible: true },
  { id: 'dr6', repId: 'u5', dealId: 'd9', amount: 3000, dateIssued: '2026-03-12', status: 'denied', approvedBy: 'u1', notes: 'Deal not yet assigned, ineligible', amountRecouped: 0, remainingBalance: 0, eligible: false },
];

export const pointEvents: PointEvent[] = [
  { id: 'pe1', userId: 'u5', dealId: 'd1', points: 5, reason: 'Funded deal – $20,000 fee (2 base + 3 bonus)', createdAt: '2026-01-10', isManualAdjustment: false },
  { id: 'pe2', userId: 'u7', dealId: 'd1', points: 5, reason: 'Funded deal – $20,000 fee (2 base + 3 bonus)', createdAt: '2026-01-10', isManualAdjustment: false },
  { id: 'pe3', userId: 'u4', dealId: 'd1', points: 0.5, reason: 'TC – funded deal', createdAt: '2026-01-10', isManualAdjustment: false },
  { id: 'pe4', userId: 'u6', dealId: 'd2', points: 4, reason: 'Funded deal – $15,000 fee (2 base + 2 bonus)', createdAt: '2026-02-01', isManualAdjustment: false },
  { id: 'pe5', userId: 'u8', dealId: 'd2', points: 4, reason: 'Funded deal – $15,000 fee (2 base + 2 bonus)', createdAt: '2026-02-01', isManualAdjustment: false },
  { id: 'pe6', userId: 'u4', dealId: 'd2', points: 0.5, reason: 'TC – funded deal', createdAt: '2026-02-01', isManualAdjustment: false },
  { id: 'pe7', userId: 'u5', dealId: 'd3', points: 3, reason: 'Funded deal – $12,000 fee (2 base + 1 bonus)', createdAt: '2026-02-15', isManualAdjustment: false },
  { id: 'pe8', userId: 'u7', dealId: 'd3', points: 3, reason: 'Funded deal – $12,000 fee (2 base + 1 bonus)', createdAt: '2026-02-15', isManualAdjustment: false },
  { id: 'pe9', userId: 'u4', dealId: 'd3', points: 0.5, reason: 'TC – funded deal', createdAt: '2026-02-15', isManualAdjustment: false },
  { id: 'pe10', userId: 'u6', dealId: 'd4', points: 1, reason: 'Funded deal – $7,500 fee (1 base, under $8k penalty)', createdAt: '2026-03-01', isManualAdjustment: false },
  { id: 'pe11', userId: 'u8', dealId: 'd4', points: 1, reason: 'Funded deal – $7,500 fee (1 base, under $8k penalty)', createdAt: '2026-03-01', isManualAdjustment: false },
  { id: 'pe12', userId: 'u4', dealId: 'd4', points: 0.5, reason: 'TC – funded deal', createdAt: '2026-03-01', isManualAdjustment: false },
  { id: 'pe13', userId: 'u5', dealId: 'd5', points: 5, reason: 'Funded deal – $25,000 fee (2 base + 3 bonus)', createdAt: '2026-03-10', isManualAdjustment: false },
  { id: 'pe14', userId: 'u7', dealId: 'd5', points: 5, reason: 'Funded deal – $25,000 fee (2 base + 3 bonus)', createdAt: '2026-03-10', isManualAdjustment: false },
  { id: 'pe15', userId: 'u4', dealId: 'd5', points: 0.5, reason: 'TC – funded deal', createdAt: '2026-03-10', isManualAdjustment: false },
  { id: 'pe16', userId: 'u5', dealId: 'd11', points: 2, reason: 'Funded deal – $8,000 fee (2 base)', createdAt: '2026-02-20', isManualAdjustment: false },
  { id: 'pe17', userId: 'u8', dealId: 'd11', points: 2, reason: 'Funded deal – $8,000 fee (2 base)', createdAt: '2026-02-20', isManualAdjustment: false },
  { id: 'pe18', userId: 'u4', dealId: 'd11', points: 0.5, reason: 'TC – funded deal', createdAt: '2026-02-20', isManualAdjustment: false },
  { id: 'pe19', userId: 'u5', dealId: 'd5', points: 1, reason: 'Admin bonus – exceptional performance', createdAt: '2026-03-12', isManualAdjustment: true, adjustedBy: 'u1' },
];

export function getUserById(id: string): User | undefined {
  return users.find(u => u.id === id);
}

export function getDealById(id: string): Deal | undefined {
  return deals.find(d => d.id === id);
}

export function getUserPoints(userId: string): number {
  return pointEvents.filter(pe => pe.userId === userId).reduce((sum, pe) => sum + pe.points, 0);
}

export function getRepDrawBalance(repId: string): number {
  return draws.filter(d => d.repId === repId && (d.status === 'paid' || d.status === 'approved')).reduce((sum, d) => sum + d.remainingBalance, 0);
}
