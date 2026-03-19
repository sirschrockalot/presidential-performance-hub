import { useQuery } from "@tanstack/react-query";

import { fetchDashboardOverview, type DashboardOverviewDto } from "@/features/dashboard/api/dashboard-client";

import { useAuthz } from "@/lib/auth/authz-context";

export function useDashboardOverview(): {
  data: DashboardOverviewDto | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const { status } = useAuthz();
  return useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: fetchDashboardOverview,
    enabled: status === "authenticated",
  });
}

