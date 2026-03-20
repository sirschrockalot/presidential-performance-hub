import { revalidateTag } from "next/cache";

/**
 * Cache tags and invalidation helpers used by read-heavy API routes.
 *
 * Strategy:
 * - Route handlers cache per-user/per-query via unstable_cache keys.
 * - Tags below group related read models for safe on-demand invalidation.
 * - Mutations call helpers to keep data fresh after writes/imports.
 */
export const CACHE_TAGS = {
  dashboard: "dashboard",
  deals: "deals",
  dealMetrics: "deal-metrics",
  dealDetail: "deal-detail",
  dealFormUsers: "deal-form-users",
  kpis: "kpis",
  kpiHistory: "kpi-history",
  kpiTrend: "kpi-trend",
  kpiSummary: "kpi-summary",
  kpiTargets: "kpi-targets",
  kpiFormUsers: "kpi-form-users",
  kpiWeeks: "kpi-weeks",
} as const;

export function revalidateDealReads() {
  revalidateTag(CACHE_TAGS.deals);
  revalidateTag(CACHE_TAGS.dealMetrics);
  revalidateTag(CACHE_TAGS.dealDetail);
  revalidateTag(CACHE_TAGS.dashboard);
}

export function revalidateKpiReads() {
  revalidateTag(CACHE_TAGS.kpis);
  revalidateTag(CACHE_TAGS.kpiHistory);
  revalidateTag(CACHE_TAGS.kpiTrend);
  revalidateTag(CACHE_TAGS.kpiSummary);
  revalidateTag(CACHE_TAGS.kpiWeeks);
  revalidateTag(CACHE_TAGS.dashboard);
}

export function revalidateKpiTargetsAndUsers() {
  revalidateTag(CACHE_TAGS.kpiTargets);
  revalidateTag(CACHE_TAGS.kpiFormUsers);
}
