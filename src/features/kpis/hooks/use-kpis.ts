import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchKpiEntries,
  fetchKpiFormUsers,
  fetchKpiHistory,
  fetchKpiTargets,
  getAvailableWeeks,
  getKpiTrend,
  getWeekSummary,
  upsertKpiEntryApi,
  bulkImportKpisApi,
} from "@/features/kpis/services/placeholder/kpis.service";
import { fetchKpiPageBundle } from "@/features/kpis/api/kpis-client";
import { Team } from "@/types";
import { useAuthz } from "@/lib/auth/authz-context";
import { DASHBOARD_BUNDLE_QUERY_KEY_ROOT } from "@/features/dashboard/hooks/use-dashboard-bundle";

export const KPI_PAGE_BUNDLE_QUERY_KEY_ROOT = "kpi-page-bundle";
import type { UpsertKpiEntryInput } from "@/features/kpis/server/kpis.service";
import type { KpiBulkImportInput } from "@/features/kpis/schemas/kpi-bulk-import.schemas";

export function useKpiEntries(team: Team, weekStarting?: string) {
  const { status } = useAuthz();
  return useQuery({
    queryKey: ["kpi-entries", team, weekStarting],
    queryFn: () => fetchKpiEntries(team, weekStarting),
    enabled: status === "authenticated",
    placeholderData: keepPreviousData,
  });
}

export function useKpiWeeks(team: Team) {
  const { status } = useAuthz();
  return useQuery({
    queryKey: ["kpi-weeks", team],
    queryFn: () => getAvailableWeeks(team),
    enabled: status === "authenticated",
  });
}

export function useKpiTrend(team: Team) {
  const { status } = useAuthz();
  return useQuery({
    queryKey: ["kpi-trend", team],
    queryFn: () => getKpiTrend(team),
    enabled: status === "authenticated",
    placeholderData: keepPreviousData,
  });
}

export function useKpiWeekSummary(team: Team, weekStarting: string) {
  const { status } = useAuthz();
  return useQuery({
    queryKey: ["kpi-summary", team, weekStarting],
    queryFn: () => getWeekSummary(team, weekStarting),
    enabled: status === "authenticated",
    placeholderData: keepPreviousData,
  });
}

export function useKpiTargets(team: Team) {
  const { status } = useAuthz();
  return useQuery({
    queryKey: ["kpi-targets", team],
    queryFn: () => fetchKpiTargets(team),
    enabled: status === "authenticated",
  });
}

export function useKpiHistory(team: Team) {
  const { status } = useAuthz();
  return useQuery({
    queryKey: ["kpi-history", team],
    queryFn: () => fetchKpiHistory(team),
    enabled: status === "authenticated",
  });
}

export function useKpiFormUsers(team: Team) {
  const { status } = useAuthz();
  return useQuery({
    queryKey: ["kpi-form-users", team],
    queryFn: () => fetchKpiFormUsers(team),
    enabled: status === "authenticated",
  });
}

/** Single request for KPI tracking page initial + team/week changes (replaces fan-out of reads). */
export function useKpiPageBundle(team: Team, weekStarting: string) {
  const { status } = useAuthz();
  return useQuery({
    queryKey: [KPI_PAGE_BUNDLE_QUERY_KEY_ROOT, team, weekStarting],
    queryFn: () => fetchKpiPageBundle(team, weekStarting),
    enabled: status === "authenticated" && !!weekStarting,
    placeholderData: keepPreviousData,
  });
}

export function useUpsertKpiEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertKpiEntryInput) => upsertKpiEntryApi(input),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["kpi-entries"], exact: false });
      qc.invalidateQueries({ queryKey: ["kpi-weeks"], exact: false });
      qc.invalidateQueries({ queryKey: ["kpi-summary"], exact: false });
      qc.invalidateQueries({ queryKey: ["kpi-trend"], exact: false });
      qc.invalidateQueries({ queryKey: ["kpi-targets"], exact: false });
      qc.invalidateQueries({ queryKey: ["kpi-history"], exact: false });
      qc.invalidateQueries({ queryKey: [KPI_PAGE_BUNDLE_QUERY_KEY_ROOT], exact: false });
      qc.invalidateQueries({ queryKey: [DASHBOARD_BUNDLE_QUERY_KEY_ROOT], exact: false });
    },
  });
}

export function useBulkImportKpis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: KpiBulkImportInput) => bulkImportKpisApi(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi-entries"], exact: false });
      qc.invalidateQueries({ queryKey: ["kpi-weeks"], exact: false });
      qc.invalidateQueries({ queryKey: ["kpi-summary"], exact: false });
      qc.invalidateQueries({ queryKey: ["kpi-trend"], exact: false });
      qc.invalidateQueries({ queryKey: ["kpi-targets"], exact: false });
      qc.invalidateQueries({ queryKey: ["kpi-history"], exact: false });
      qc.invalidateQueries({ queryKey: [KPI_PAGE_BUNDLE_QUERY_KEY_ROOT], exact: false });
      qc.invalidateQueries({ queryKey: [DASHBOARD_BUNDLE_QUERY_KEY_ROOT], exact: false });
    },
  });
}
