import apiClient from '../api-client';
import {
  ReviewsResponse,
  Review,
  CreateReviewDto,
  SessionReviewsResponse,
  ReviewFilters,
} from '@/types/api.types';
import { cleanQueryParams } from '../utils/api-utils';

export const reviewsApi = {
  // Get reviews
  getReviews: async (filters?: ReviewFilters): Promise<ReviewsResponse> => {
    const response = await apiClient.get<ReviewsResponse>('/api/reviews', {
      params: filters ? cleanQueryParams(filters) : {},
    });
    return response.data;
  },

  // Create review
  createReview: async (data: CreateReviewDto): Promise<Review> => {
    const response = await apiClient.post<Review>('/api/reviews', data);
    return response.data;
  },

  // Get session reviews
  getSessionReviews: async (
    sessionId: string,
    page?: number,
    limit?: number
  ): Promise<SessionReviewsResponse> => {
    const response = await apiClient.get<SessionReviewsResponse>(
      `/api/reviews/sessions/${sessionId}/reviews`,
      {
        params: cleanQueryParams({ page, limit }),
      }
    );
    return response.data;
  },
};
