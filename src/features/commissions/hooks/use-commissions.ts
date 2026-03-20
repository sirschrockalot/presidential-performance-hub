import { useQuery } from "@tanstack/react-query";

import { fetchCommissionsData } from "@/features/commissions/services/commissions.service";
import { useAuthz } from "@/lib/auth/authz-context";

export function useCommissionsData(windowId?: string) {
  const { status } = useAuthz();
  return useQuery({
    queryKey: ["commissions", windowId ?? "default"],
    queryFn: () => fetchCommissionsData(windowId),
    enabled: status === "authenticated",
  });
}
