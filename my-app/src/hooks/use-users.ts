import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, useUser } from '@clerk/nextjs';
import { usersApi } from '@/lib/api';
import { setAuthToken } from '@/lib/api-client';
import { UpdateUserDto } from '@/types/api.types';
import { isAuthError } from '@/lib/utils/error-handling';

// Note: useCurrentUser no longer calls getToken() directly.
// AuthTokenSync (in layout.tsx) sets the token in axios defaults as soon as
// Clerk loads, so the axios interceptor picks it up without a serial await.

// Query Keys
export const userKeys = {
  all: ['users'] as const,
  current: (clerkUserId?: string | null) =>
    [...userKeys.all, 'current', clerkUserId ?? 'anonymous'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
  skills: (id: string, type?: 'HAS' | 'WANTS') =>
    [...userKeys.all, 'skills', id, type] as const,
};

function invalidateSocialQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: userKeys.all });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}

// Get current user
export function useCurrentUser() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const clerkUserId = user?.id ?? null;

  return useQuery({
    queryKey: userKeys.current(clerkUserId),
    // Token is set by AuthTokenSync before this fires; interceptor handles the rest
    queryFn: () => usersApi.getCurrentUser(),
    enabled: isLoaded && !!isSignedIn && !!clerkUserId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      if (isAuthError(error)) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// Update user profile
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdateUserDto) => {
      // Ensure token is set before making the request
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return usersApi.updateUserProfile(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

// Get public user profile
export function usePublicUserProfile(userId: string) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => usersApi.getPublicUserProfile(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Get user skills
export function useUserSkills(userId: string, type?: 'HAS' | 'WANTS') {
  return useQuery({
    queryKey: userKeys.skills(userId, type),
    queryFn: () => usersApi.getUserSkills(userId, type),
    enabled: !!userId,
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return usersApi.followUser(userId);
    },
    onSuccess: () => {
      invalidateSocialQueries(queryClient);
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return usersApi.unfollowUser(userId);
    },
    onSuccess: () => {
      invalidateSocialQueries(queryClient);
    },
  });
}
