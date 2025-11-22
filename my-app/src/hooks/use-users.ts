import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { usersApi } from '@/lib/api';
import { setAuthToken } from '@/lib/api-client';
import { UpdateUserDto } from '@/types/api.types';
import { isAuthError } from '@/lib/utils/error-handling';

// Query Keys
export const userKeys = {
  all: ['users'] as const,
  current: () => [...userKeys.all, 'current'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
  skills: (id: string, type?: 'HAS' | 'WANTS') =>
    [...userKeys.all, 'skills', id, type] as const,
};

// Get current user
export function useCurrentUser() {
  const { getToken, isLoaded } = useAuth();

  return useQuery({
    queryKey: userKeys.current(),
    queryFn: async () => {
      // Ensure token is set before making the request
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return usersApi.getCurrentUser();
    },
    enabled: isLoaded, // Wait for Clerk to be loaded
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (isAuthError(error)) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    // Don't refetch on window focus if there's an auth error
    refetchOnWindowFocus: (query) => {
      if (query.state.error && isAuthError(query.state.error)) {
        return false;
      }
      return true;
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
      queryClient.invalidateQueries({ queryKey: userKeys.current() });
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
