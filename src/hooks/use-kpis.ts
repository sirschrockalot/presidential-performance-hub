import { useQuery } from '@tanstack/react-query';
import { fetchKpiEntries, getAvailableWeeks, getKpiTrend, getWeekSummary } from '@/services/kpis.service';
import { Team } from '@/types';

export function useKpiEntries(team: Team, weekStarting?: string) {
  return useQuery({
    queryKey: ['kpi-entries', team, weekStarting],
    queryFn: () => fetchKpiEntries(team, weekStarting),
  });
}

export function useKpiWeeks(team: Team) {
  return useQuery({
    queryKey: ['kpi-weeks', team],
    queryFn: () => getAvailableWeeks(team),
  });
}

export function useKpiTrend(team: Team) {
  return useQuery({
    queryKey: ['kpi-trend', team],
    queryFn: () => getKpiTrend(team),
  });
}

export function useKpiWeekSummary(team: Team, weekStarting: string) {
  return useQuery({
    queryKey: ['kpi-summary', team, weekStarting],
    queryFn: () => getWeekSummary(team, weekStarting),
  });
}
