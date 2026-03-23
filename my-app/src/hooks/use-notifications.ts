import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { notificationsApi } from '@/lib/api';
import { setAuthToken } from '@/lib/api-client';

// Query Keys
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (page?: number, limit?: number, type?: string, viewed?: boolean) => 
    [...notificationKeys.lists(), { page, limit, type, viewed }] as const,
};

// Get notifications
export function useNotifications(
  page?: number,
  limit?: number,
  type?: string,
  viewed?: boolean
) {
  const { isLoaded, isSignedIn } = useAuth();

  return useQuery({
    queryKey: notificationKeys.list(page, limit, type, viewed),
    // Token is set by AuthTokenSync; interceptor handles auth header
    queryFn: () => notificationsApi.getNotifications(page, limit, type, viewed),
    enabled: isLoaded && !!isSignedIn,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // 2 minutes
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

// Get unread notifications count
export function useUnreadNotificationsCount() {
  const { data } = useNotifications(undefined, undefined, undefined, false);
  return data?.unreadCount || 0;
}

// Mark notification as read
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      // Ensure token is set before making the request
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return notificationsApi.markNotificationAsRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });
}

// Mark all notifications as read
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async () => {
      // Ensure token is set before making the request
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return notificationsApi.markAllNotificationsAsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });
}
