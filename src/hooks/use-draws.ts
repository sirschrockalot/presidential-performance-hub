import { useQuery } from '@tanstack/react-query';
import { fetchDraws, getDrawMetrics, DrawWithDetails } from '@/services/draws.service';
import { DrawStatus } from '@/types';

export function useDraws(statusFilter?: DrawStatus | 'all') {
  return useQuery({
    queryKey: ['draws', statusFilter],
    queryFn: () => fetchDraws(statusFilter),
  });
}

export function useDrawMetrics() {
  return useQuery({
    queryKey: ['draw-metrics'],
    queryFn: () => getDrawMetrics(),
  });
}
