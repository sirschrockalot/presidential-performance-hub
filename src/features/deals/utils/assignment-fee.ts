/**
 * Straightforward fee math:
 * - Assignment price − Contract price = Assignment fee
 * - If additional expense is entered: Assignment price − Contract price − Additional expense = Assignment fee
 * When additional expense is empty (null/undefined), it is not applied (same as subtracting 0).
 * Requires both prices; otherwise returns null. Result may be negative if assignment is below contract.
 */
export function computeAssignmentFee(
  contractPrice: number | null | undefined,
  assignmentPrice: number | null | undefined,
  additionalExpense: number | null | undefined
): number | null {
  if (contractPrice == null || !Number.isFinite(Number(contractPrice))) return null;
  if (assignmentPrice == null || !Number.isFinite(Number(assignmentPrice))) return null;
  const c = Number(contractPrice);
  const ap = Number(assignmentPrice);
  const exp =
    additionalExpense != null && Number.isFinite(Number(additionalExpense))
      ? Number(additionalExpense)
      : 0;
  const raw = ap - c - exp;
  return Math.round(raw * 100) / 100;
}

/**
 * Recover additional expense from a stored triple when
 * assignmentFee = assignmentPrice − contractPrice − additionalExpense.
 */
export function impliedAdditionalExpense(
  contractPrice: number,
  assignmentPrice: number | null,
  assignmentFee: number | null
): number {
  if (assignmentPrice == null || assignmentFee == null) return 0;
  const raw = assignmentPrice - contractPrice - assignmentFee;
  return Math.max(0, Math.round(raw * 100) / 100);
}

/** Prefer DB fee; if missing, derive from prices + optional expense (e.g. 0 when unknown). */
export function resolvedAssignmentFeeOrCompute(
  contractPrice: number,
  assignmentPrice: number | null,
  assignmentFeeDb: number | null,
  additionalExpense: number | null = 0
): number | null {
  if (assignmentFeeDb != null) return assignmentFeeDb;
  return computeAssignmentFee(contractPrice, assignmentPrice, additionalExpense ?? 0);
}
