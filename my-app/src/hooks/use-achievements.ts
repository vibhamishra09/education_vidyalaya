import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { achievementsApi } from '@/lib/api/achievements.api';
import { setAuthToken } from '@/lib/api-client';

// Query Keys
export const achievementKeys = {
  all: ['achievements'] as const,
  list: () => [...achievementKeys.all, 'list'] as const,
  unlocked: () => [...achievementKeys.all, 'unlocked'] as const,
  inProgress: () => [...achievementKeys.all, 'inProgress'] as const,
  monthlyTop: () => [...achievementKeys.all, 'monthlyTop'] as const,
};

// Get all achievements
export function useAchievements() {
  const { getToken, isLoaded } = useAuth();

  return useQuery({
    queryKey: achievementKeys.list(),
    queryFn: async () => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return achievementsApi.getAchievements();
    },
    enabled: isLoaded,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get unlocked achievements
export function useUnlockedAchievements() {
  const { getToken, isLoaded } = useAuth();

  return useQuery({
    queryKey: achievementKeys.unlocked(),
    queryFn: async () => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return achievementsApi.getUnlockedAchievements();
    },
    enabled: isLoaded,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get in-progress achievements
export function useInProgressAchievements() {
  const { getToken, isLoaded } = useAuth();

  return useQuery({
    queryKey: achievementKeys.inProgress(),
    queryFn: async () => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return achievementsApi.getInProgressAchievements();
    },
    enabled: isLoaded,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get monthly top users
export function useMonthlyTopUsers() {
  const { getToken, isLoaded } = useAuth();

  return useQuery({
    queryKey: achievementKeys.monthlyTop(),
    queryFn: async () => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return achievementsApi.getMonthlyTopUsers();
    },
    enabled: isLoaded,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
