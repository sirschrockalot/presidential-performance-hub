/**
 * Map service / validation errors to HTTP status for Team API routes.
 */
export function teamMutationHttpStatus(message: string): number {
  const t = message.toLowerCase();
  if (t.includes("forbidden")) return 403;
  if (t.includes("not found")) return 404;
  if (t.includes("email already")) return 409;
  return 400;
}
