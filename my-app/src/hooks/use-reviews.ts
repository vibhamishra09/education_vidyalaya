import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { reviewsApi } from '@/lib/api';
import { setAuthToken } from '@/lib/api-client';
import { CreateReviewDto, ReviewFilters } from '@/types/api.types';

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
export function useReviews(filters?: ReviewFilters) {
  return useQuery({
    queryKey: reviewKeys.list(filters),
    queryFn: () => reviewsApi.getReviews(filters),
  });
}

// Create review
export function useCreateReview() {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateReviewDto) => {
      // Ensure token is set before making the request
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
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
