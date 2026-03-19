export function clampRemainingBalance(amount: number, amountRecouped: number): number {
  const rem = amount - amountRecouped;
  if (!Number.isFinite(rem)) return 0;
  return Math.max(0, rem);
}

export function validateRecoupmentDelta(delta: number, currentAmountRecouped: number, dealAmount: number) {
  const next = currentAmountRecouped + delta;
  if (delta < 0) return { ok: false, reason: "Recoupment delta must be non-negative" as const };
  if (next > dealAmount) return { ok: false, reason: "Recouped amount cannot exceed draw amount" as const };
  return { ok: true as const, nextAmountRecouped: next };
}

