import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { streaksApi } from '@/lib/api/streaks.api';
import { setAuthToken } from '@/lib/api-client';

// Query Keys
export const streakKeys = {
  all: ['streaks'] as const,
  current: () => [...streakKeys.all, 'current'] as const,
  history: (days: number) => [...streakKeys.all, 'history', days] as const,
};

// Get current streak
export function useCurrentStreak() {
  const { getToken, isLoaded } = useAuth();

  return useQuery({
    queryKey: streakKeys.current(),
    queryFn: async () => {
      console.log('🔥 [useCurrentStreak] Fetching streak data...');
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      const result = await streaksApi.getCurrentStreak();
      console.log('✅ [useCurrentStreak] Received:', result);
      return result;
    },
    enabled: isLoaded,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get streak history for calendar
export function useStreakHistory(days: number = 14) {
  const { getToken, isLoaded } = useAuth();

  return useQuery({
    queryKey: streakKeys.history(days),
    queryFn: async () => {
      console.log('📅 [useStreakHistory] Fetching history for', days, 'days...');
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      const result = await streaksApi.getStreakHistory(days);
      console.log('✅ [useStreakHistory] Received:', result);
      return result;
    },
    enabled: isLoaded,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
