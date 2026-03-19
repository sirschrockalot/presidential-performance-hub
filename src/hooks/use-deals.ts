import { useQuery } from '@tanstack/react-query';
import { fetchDeals, fetchDealById, getDealMetrics, DealFilters } from '@/services/deals.service';

export function useDeals(filters?: DealFilters) {
  return useQuery({
    queryKey: ['deals', filters],
    queryFn: () => fetchDeals(filters),
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ['deal', id],
    queryFn: () => fetchDealById(id),
    enabled: !!id,
  });
}

export function useDealMetrics() {
  return useQuery({
    queryKey: ['deal-metrics'],
    queryFn: () => getDealMetrics(),
  });
}
