/**
 * Assignment fee = contract price − assignment price − additional expense.
 * Missing numeric inputs are treated as 0. Result is never negative (clamped at 0).
 */
export function computeAssignmentFee(
  contractPrice: number | null | undefined,
  assignmentPrice: number | null | undefined,
  additionalExpense: number | null | undefined
): number {
  const c = contractPrice ?? 0;
  const ap = assignmentPrice ?? 0;
  const exp = additionalExpense ?? 0;
  const raw = c - ap - exp;
  return Math.max(0, Math.round(raw * 100) / 100);
}
