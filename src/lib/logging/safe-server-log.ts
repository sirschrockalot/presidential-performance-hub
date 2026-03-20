/**
 * Safe server logging — reduce accidental PII / payload leaks in production logs.
 *
 * Rules:
 * - Never log full request bodies, dashboard/KPI/deal bundles, import payloads, or user directory dumps.
 * - Prefer: durations (ms), counts, approximate serialized size (structure only), opaque ids, error codes.
 * - Do not `JSON.stringify` large objects into `console.*` for debugging; use estimateJsonCharLength if size is needed.
 * - Dashboard perf: use `@/lib/perf/dashboard-perf` (uses estimateJsonCharLength from here).
 */

export const MAX_JSON_ESTIMATE_DEPTH = 24;

/**
 * Approximate UTF-16-ish character count if the value were JSON-serialized, without allocating the full string.
 * Suitable for metric logging only — not for security decisions.
 */
export function estimateJsonCharLength(value: unknown, depth = 0): number {
  if (depth > MAX_JSON_ESTIMATE_DEPTH) return 0;
  if (value === null || value === undefined) return 4;
  if (typeof value === "boolean") return value ? 4 : 5;
  if (typeof value === "number" && Number.isFinite(value)) return String(value).length;
  if (typeof value === "bigint") return String(value).length;
  if (typeof value === "string") return value.length + 2;
  if (Array.isArray(value)) {
    if (value.length === 0) return 2;
    return (
      2 +
      value.reduce((sum, item) => sum + estimateJsonCharLength(item, depth + 1), 0) +
      Math.max(0, value.length - 1)
    );
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const keys = Object.keys(o);
    if (keys.length === 0) return 2;
    let n = 2;
    for (const k of keys) {
      n += k.length + 2 + 1 + estimateJsonCharLength(o[k], depth + 1) + 1;
    }
    return n;
  }
  return 4;
}

/** Structured perf / diagnostic line: scalar fields only (no nested objects). */
export function logPerfMetric(
  label: string,
  metrics: Record<string, string | number | boolean | null | undefined>
): void {
  const safe: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(metrics)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "object") continue;
    safe[k] = v;
  }
  console.info(`[perf] ${label}`, safe);
}
