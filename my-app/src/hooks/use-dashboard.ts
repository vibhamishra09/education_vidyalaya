import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { dashboardApi } from '@/lib/api';
import { setAuthToken } from '@/lib/api-client';
import { DashboardQuery } from '@/types/api.types';

// Query Keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  data: (query?: DashboardQuery) => [...dashboardKeys.all, query] as const,
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
