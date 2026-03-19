export type PointsBreakdown = {
  base: number;
  bonus: number;
  total: number;
};

export function calculateAssignmentFeePoints(assignmentFee: number): PointsBreakdown {
  // Base = 2, penalty: if assignment fee < 8,000 => base reduces by 1.
  let base = 2;
  if (assignmentFee < 8000) base = 1;

  // Tiered bonus, not cumulative.
  let bonus = 0;
  if (assignmentFee >= 20000) bonus = 3;
  else if (assignmentFee >= 15000) bonus = 2;
  else if (assignmentFee >= 10000) bonus = 1;

  return { base, bonus, total: base + bonus };
}

export function calculateTcPoints(): number {
  // TC always earns a fixed 0.5 points per funded deal.
  return 0.5;
}

