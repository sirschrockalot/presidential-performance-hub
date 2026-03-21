/** Map password service errors to HTTP status codes. */
export function passwordMutationHttpStatus(message: string): number {
  const t = message.toLowerCase();
  if (t.includes("forbidden")) return 403;
  if (t.includes("not found")) return 404;
  if (t.includes("incorrect")) return 401;
  return 400;
}
