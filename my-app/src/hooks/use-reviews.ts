import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { reviewsApi } from '@/lib/api';
import { setAuthToken } from '@/lib/api-client';
import { CreateReviewDto, ReviewFilters, ReviewsResponse } from '@/types/api.types';
import type { UseQueryOptions } from '@tanstack/react-query';

// Query Keys
export const reviewKeys = {
  all: ['reviews'] as const,
  lists: () => [...reviewKeys.all, 'list'] as const,
  list: (filters?: ReviewFilters) => [...reviewKeys.lists(), filters] as const,
  sessions: () => [...reviewKeys.all, 'session'] as const,
  session: (sessionId: string, page?: number, limit?: number) =>
    [...reviewKeys.sessions(), sessionId, { page, limit }] as const,
};

// Get reviews
export function useReviews(
  filters?: ReviewFilters,
  options?: Omit<UseQueryOptions<ReviewsResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: reviewKeys.list(filters),
    queryFn: () => reviewsApi.getReviews(filters),
    ...options,
  });
}

// Create review
export function useCreateReview() {
  const queryClient = useQueryClient();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateReviewDto) => {
      // Wait for auth to be loaded
      if (!isLoaded) {
        throw new Error('Authentication is still loading');
      }

      // Check if user is signed in
      if (!isSignedIn) {
        throw new Error('User is not signed in');
      }

      // Get fresh token for this request
      const token = await getToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }

      // Set token for this request
      setAuthToken(token);
      
      // Make the API call
      return reviewsApi.createReview(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.sessions() });
    },
  });
}

// Get session reviews
export function useSessionReviews(sessionId: string, page?: number, limit?: number) {
  return useQuery({
    queryKey: reviewKeys.session(sessionId, page, limit),
    queryFn: () => reviewsApi.getSessionReviews(sessionId, page, limit),
    enabled: !!sessionId,
  });
}
