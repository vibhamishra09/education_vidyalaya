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
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return streaksApi.getCurrentStreak();
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
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return streaksApi.getStreakHistory(days);
    },
    enabled: isLoaded,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
