import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchDealsList,
  fetchDealDetail,
  fetchDealMetrics,
  fetchDealFormUsers,
  createDealApi,
  updateDealApi,
  updateDealStatusApi,
  addDealNoteApi,
  bulkImportDealsApi,
  type DealListFilters,
} from "@/features/deals/services/deals.service";
import { useAuthz } from "@/lib/auth/authz-context";
import type { CreateDealInput, UpdateDealInput, UpdateDealStatusInput } from "@/features/deals/schemas/deal.schemas";
import type { DealBulkImportInput } from "@/features/deals/schemas/deal-bulk-import.schemas";

export function useDeals(filters?: DealListFilters) {
  const { dataScope, status } = useAuthz();
  return useQuery({
    queryKey: ["deals", filters, dataScope],
    queryFn: () => fetchDealsList(filters),
    enabled: status === "authenticated",
  });
}

export function useDeal(id: string) {
  const { dataScope, status } = useAuthz();
  return useQuery({
    queryKey: ["deal", id, dataScope],
    queryFn: () => fetchDealDetail(id),
    enabled: !!id && status === "authenticated",
  });
}

export function useDealMetrics() {
  const { dataScope, status } = useAuthz();
  return useQuery({
    queryKey: ["deal-metrics", dataScope],
    queryFn: () => fetchDealMetrics(),
    enabled: status === "authenticated",
  });
}

export function useDealFormUsers() {
  const { dataScope, status } = useAuthz();
  return useQuery({
    queryKey: ["deal-form-users", dataScope],
    queryFn: () => fetchDealFormUsers(),
    enabled: status === "authenticated",
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDealInput) => createDealApi(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["deal-metrics"] });
    },
  });
}

export function useUpdateDeal(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDealInput) => updateDealApi(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal", id] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["deal-metrics"] });
    },
  });
}

export function useUpdateDealStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDealStatusInput) => updateDealStatusApi(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal", id] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["deal-metrics"] });
    },
  });
}

export function useAddDealNote(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => addDealNoteApi(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal", id] });
    },
  });
}

export function useBulkImportDeals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: DealBulkImportInput) => bulkImportDealsApi(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"], exact: false });
      qc.invalidateQueries({ queryKey: ["deal"], exact: false });
      qc.invalidateQueries({ queryKey: ["deal-metrics"], exact: false });
    },
  });
}
