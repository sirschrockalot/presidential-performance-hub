import { useQuery } from '@tanstack/react-query';
import { fetchPointEvents, getLeaderboard, getPointsMetrics } from '@/services/points.service';

export function usePointEvents() {
  return useQuery({
    queryKey: ['point-events'],
    queryFn: () => fetchPointEvents(),
  });
}

export function useLeaderboard(userIds: string[]) {
  return useQuery({
    queryKey: ['leaderboard', userIds],
    queryFn: () => getLeaderboard(userIds),
    enabled: userIds.length > 0,
  });
}

export function usePointsMetrics() {
  return useQuery({
    queryKey: ['points-metrics'],
    queryFn: () => getPointsMetrics(),
  });
}
