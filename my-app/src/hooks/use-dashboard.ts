import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { dashboardApi } from '@/lib/api';
import { setAuthToken } from '@/lib/api-client';
import { ActivityFeedQuery, FeedMode, DashboardQuery } from '@/types/api.types';

// Query Keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  data: (query?: DashboardQuery) => [...dashboardKeys.all, query] as const,
  feed: (mode: FeedMode, limit: number) =>
    [...dashboardKeys.all, 'feed', mode, limit] as const,
};

// Get dashboard data
export function useDashboard(query?: DashboardQuery) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return useQuery({
    queryKey: dashboardKeys.data(query),
    queryFn: async () => {
      // Ensure token is set before making the request
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return dashboardApi.getDashboardData(query);
    },
    enabled: isLoaded && isSignedIn, // Wait for Clerk to be loaded and user signed in
    staleTime: 30 * 1000, // 30 seconds - shorter to show updates faster
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Always refetch on mount
  });
}

export function useDashboardFeed(
  mode: FeedMode = 'for_you',
  limit: number = 8,
) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return useInfiniteQuery({
    queryKey: dashboardKeys.feed(mode, limit),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }

      const query: ActivityFeedQuery = {
        mode,
        page: pageParam as number,
        limit,
      };

      return dashboardApi.getActivityFeed(query);
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore
        ? lastPage.pagination.page + 1
        : undefined,
    enabled: isLoaded && (!isSignedIn ? mode === 'for_you' : true),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}
