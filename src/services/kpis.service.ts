import { KpiEntry, Team } from '@/types';
import { kpiEntries as mockKpiEntries, getUserById } from '@/data/mock-data';

export interface KpiWithRep extends KpiEntry {
  repName: string;
}

export async function fetchKpiEntries(team: Team, weekStarting?: string): Promise<KpiWithRep[]> {
  let result = mockKpiEntries.filter(k => k.team === team);
  if (weekStarting) {
    result = result.filter(k => k.weekStarting === weekStarting);
  }
  return result.map(k => ({
    ...k,
    repName: getUserById(k.userId)?.name ?? 'Unknown',
  }));
}

export function getAvailableWeeks(team: Team): string[] {
  return [...new Set(mockKpiEntries.filter(k => k.team === team).map(k => k.weekStarting))].sort().reverse();
}

export function getKpiTrend(team: Team) {
  const weeks = getAvailableWeeks(team);
  return weeks
    .map(w => {
      const entries = mockKpiEntries.filter(k => k.team === team && k.weekStarting === w);
      return {
        week: w.slice(5), // MM-DD
        weekFull: w,
        dials: entries.reduce((s, k) => s + k.dials, 0),
        talkTime: entries.reduce((s, k) => s + k.talkTimeMinutes, 0),
        revenue: entries.reduce((s, k) => s + k.revenueFromFunded, 0),
        entryCount: entries.length,
      };
    })
    .reverse();
}

export function getWeekSummary(team: Team, weekStarting: string) {
  const entries = mockKpiEntries.filter(k => k.team === team && k.weekStarting === weekStarting);
  return {
    totalDials: entries.reduce((s, k) => s + k.dials, 0),
    totalTalkTime: entries.reduce((s, k) => s + k.talkTimeMinutes, 0),
    totalRevenue: entries.reduce((s, k) => s + k.revenueFromFunded, 0),
    repCount: entries.length,
  };
}
