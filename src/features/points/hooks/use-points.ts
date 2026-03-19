import { useMutation, useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

import {
  createManualPointAdjustment,
  fetchPointEventsApi,
  fetchPointRecipientsApi,
  getLeaderboardApi,
  getPointsMetricsApi,
  fetchRepPointsDetailApi,
} from "@/features/points/services/points.service";
import { useAuthz } from "@/lib/auth/authz-context";

export function usePointEvents(options?: { repId?: string; year?: number; month?: number }) {
  const { status } = useAuthz();
  return useQuery({
    queryKey: ["point-events", options],
    queryFn: () => fetchPointEventsApi(options),
    enabled: status === "authenticated",
  });
}

export function useLeaderboard(_userIds?: string[]) {
  const { status } = useAuthz();
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => getLeaderboardApi(),
    enabled: status === "authenticated",
  });
}

export function usePointsMetrics() {
  const { status } = useAuthz();
  return useQuery({
    queryKey: ["points-metrics"],
    queryFn: () => getPointsMetricsApi(),
    enabled: status === "authenticated",
  });
}

export function usePointRecipients() {
  const { can, status } = useAuthz();
  return useQuery({
    queryKey: ["points-recipients"],
    queryFn: () => fetchPointRecipientsApi(),
    enabled: status === "authenticated" && can("points:manual_adjust"),
  });
}

export function useCreateManualPointAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createManualPointAdjustment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
      qc.invalidateQueries({ queryKey: ["points-metrics"] });
      qc.invalidateQueries({ queryKey: ["point-events"] });
    },
  });
}

export function useRepPointsDetail(repId: string, options?: { year?: number; month?: number }) {
  const { status } = useAuthz();
  return useQuery({
    queryKey: ["rep-points-detail", repId, options],
    queryFn: () => fetchRepPointsDetailApi(repId, options),
    enabled: status === "authenticated" && !!repId,
  });
}
