import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchDrawFormDeals,
  fetchDrawFormReps,
  fetchDrawDetail,
  getDrawMetrics,
  fetchDraws,
  fetchRepDrawHistoryApi,
  createDrawRequestApi,
  updateDrawStatusApi,
} from "@/features/draws/services/draws.service";

import type { CreateDrawInput, DrawDetailDto, DrawRequestDealOptionDto, DrawRequestRepOptionDto, DrawWithDetailsDto } from "@/features/draws/server/draws.service";
import type { DrawStatus } from "@/types";
import { useAuthz } from "@/lib/auth/authz-context";

export function useDraws(statusFilter?: DrawStatus | "all" | "partially_recouped") {
  const { status } = useAuthz();
  return useQuery({
    queryKey: ["draws", statusFilter],
    queryFn: () => fetchDraws(statusFilter),
    enabled: status === "authenticated",
  });
}

export function useDrawMetrics() {
  const { status } = useAuthz();
  return useQuery({
    queryKey: ["draw-metrics"],
    queryFn: () => getDrawMetrics(),
    enabled: status === "authenticated",
  });
}

export function useDrawDetail(id: string) {
  const { status } = useAuthz();
  return useQuery({
    queryKey: ["draw", id],
    queryFn: () => fetchDrawDetail(id),
    enabled: status === "authenticated" && !!id,
  });
}

export function useDrawFormReps(team?: "acquisitions" | "dispositions") {
  const { status } = useAuthz();
  return useQuery({
    queryKey: ["draw-form-reps", team],
    queryFn: () => fetchDrawFormReps(team),
    enabled: status === "authenticated",
  });
}

export function useDrawFormDeals(repId?: string) {
  const { status } = useAuthz();
  return useQuery({
    queryKey: ["draw-form-deals", repId],
    queryFn: () => (repId ? fetchDrawFormDeals(repId) : Promise.resolve([] as DrawRequestDealOptionDto[])),
    enabled: status === "authenticated" && !!repId,
  });
}

export function useRepDrawHistory(repId?: string) {
  const { status } = useAuthz();
  return useQuery({
    queryKey: ["draw-rep-history", repId],
    queryFn: () => fetchRepDrawHistoryApi(repId),
    enabled: status === "authenticated",
  });
}

export function useCreateDrawRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDrawInput) => createDrawRequestApi(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["draws"] });
      qc.invalidateQueries({ queryKey: ["draw-metrics"] });
    },
  });
}

export function useUpdateDrawStatus(drawId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof updateDrawStatusApi>[1]) => updateDrawStatusApi(drawId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["draw", drawId] });
      qc.invalidateQueries({ queryKey: ["draws"] });
      qc.invalidateQueries({ queryKey: ["draw-metrics"] });
    },
  });
}

export type { DrawWithDetailsDto, DrawDetailDto, DrawRequestDealOptionDto, DrawRequestRepOptionDto };
