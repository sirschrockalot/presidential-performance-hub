import { useQuery } from "@tanstack/react-query";

import { useAuthz } from "@/lib/auth/authz-context";
import type { ReportsFiltersUi } from "@/features/reports/api/reports-client";
import { fetchReports } from "@/features/reports/api/reports-client";

export function useReports(filters: ReportsFiltersUi, options?: { enabled?: boolean }) {
  const { status } = useAuthz();
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: ["reports", filters],
    queryFn: () => fetchReports(filters),
    enabled: status === "authenticated" && enabled,
  });
}

