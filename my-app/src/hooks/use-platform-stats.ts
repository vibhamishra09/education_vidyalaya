import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/lib/api';

export const platformStatsKeys = {
  all: ['platformStats'] as const,
};

export function usePlatformStats() {
  return useQuery({
    queryKey: platformStatsKeys.all,
    queryFn: () => statsApi.getPlatformStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes - stats don't change frequently
    refetchOnWindowFocus: false,
  });
}

