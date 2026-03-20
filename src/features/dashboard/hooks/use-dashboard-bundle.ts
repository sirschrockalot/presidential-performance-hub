import { useQuery } from "@tanstack/react-query";

import { fetchDashboardBundle, type DashboardBundleDto } from "@/features/dashboard/api/dashboard-client";
import { useAuthz } from "@/lib/auth/authz-context";

/** Invalidate with `{ queryKey: [DASHBOARD_BUNDLE_QUERY_KEY_ROOT], exact: false }` after dashboard-related writes. */
export const DASHBOARD_BUNDLE_QUERY_KEY_ROOT = "dashboard-bundle" as const;

export function useDashboardBundle(): {
  data: DashboardBundleDto | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const { dataScope, status } = useAuthz();
  return useQuery({
    queryKey: [DASHBOARD_BUNDLE_QUERY_KEY_ROOT, dataScope],
    queryFn: fetchDashboardBundle,
    enabled: status === "authenticated",
  });
}
