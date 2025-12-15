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
      console.log('[useAchievements] Fetching achievements...');
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      const data = await achievementsApi.getAchievements();
      console.log('[useAchievements] Received data:', {
        totalUnlocked: data.totalUnlocked,
        unlockedCount: data.unlocked.length,
        inProgressCount: data.inProgress.length,
        lockedCount: data.locked.length,
        sampleUnlocked: data.unlocked[0] ? {
          id: data.unlocked[0].id,
          title: data.unlocked[0].title,
          unlockedAt: data.unlocked[0].unlockedAt,
          unlocked: data.unlocked[0].unlocked,
        } : 'none',
      });
      return data;
    },
    enabled: isLoaded,
    staleTime: 30 * 1000, // 30 seconds - refresh more often to show updated progress
    refetchOnWindowFocus: true,
    refetchOnMount: true,
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
