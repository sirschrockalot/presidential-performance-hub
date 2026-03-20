import { performance } from "node:perf_hooks";

import { estimateJsonCharLength } from "@/lib/logging/safe-server-log";

/**
 * Opt-in server timing + payload logging for dashboard reads.
 * Enable with `DASHBOARD_PERF_LOG=1` in `.env` (never on in production unless intentional).
 */
export function isDashboardPerfEnabled(): boolean {
  const v = process.env.DASHBOARD_PERF_LOG;
  return v === "1" || v === "true";
}

export async function withDashboardPerf<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!isDashboardPerfEnabled()) {
    return fn();
  }
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    const ms = performance.now() - t0;
    console.info(`[dashboard-perf] ${label}: ${ms.toFixed(1)}ms`);
  }
}

/** Approximate JSON size per bundle slice (only when perf logging is on). */
export function logDashboardPayloadParts(parts: Record<string, unknown>): void {
  if (!isDashboardPerfEnabled()) return;
  try {
    let total = 0;
    for (const [key, value] of Object.entries(parts)) {
      const chars = estimateJsonCharLength(value);
      total += chars;
      console.info(`[dashboard-perf] payload.${key}: ${(chars / 1024).toFixed(2)} KiB (~${chars} chars est.)`);
    }
    console.info(`[dashboard-perf] payload.TOTAL: ${(total / 1024).toFixed(2)} KiB (~${total} chars est.)`);
  } catch (e) {
    console.warn("[dashboard-perf] payload logging failed", e);
  }
}
