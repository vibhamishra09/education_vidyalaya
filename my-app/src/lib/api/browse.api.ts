import apiClient from '../api-client';
import { BrowseResponse, BrowseFilters } from '@/types/api.types';
import { cleanQueryParams } from '../utils/api-utils';

export interface RecommendationsResponse {
  peers: Array<{
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
    skills: string[];
    matchingSkills: string[];
    rating: number | null;
    reviewCount: number;
    totalSessions: number;
    socialLinks?: unknown[];
  }>;
  studyRooms: Array<{
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    sessionStatus: string;
    date: string;
    duration: number;
    maxParticipants: number;
    joiningFee: number;
    participantCount: number;
    createdBy: {
      id: string;
      name: string;
      avatar?: string;
    };
    skills: string[];
    matchingSkills: string[];
    seriesId?: string | null;
    timezone?: string | null;
    hostAvgRating: number | null;
    hostReviewCount: number;
    hostTotalSessions: number;
  }>;
  basedOnSkills: string[];
}

export const browseApi = {
  // Get browse data
  getBrowseData: async (filters: BrowseFilters): Promise<BrowseResponse> => {
    const cleanedParams = cleanQueryParams(filters);
    const response = await apiClient.get<BrowseResponse>('/api/browse', {
      params: cleanedParams,
    });
    return response.data;
  },

  // Get personalized recommendations based on user's "want to learn" skills
  getRecommendations: async (limit?: number): Promise<RecommendationsResponse> => {
    const response = await apiClient.get<RecommendationsResponse>('/api/browse/recommendations', {
      params: limit ? { limit } : undefined,
    });
    return response.data;
  },

  // Get ranked peer matches based on Skills, Availability, and Ratings
  getPeerMatches: async (page?: number, limit?: number): Promise<{
    matches: Array<{
      id: string;
      name: string;
      avatar?: string;
      bio?: string;
      skills: string[];
      matchedSkills: string[];
      rating: number | null;
      reviewCount: number;
      totalSessions: number;
      matchScore: number;
      skillScore: number;
      availabilityScore: number;
      ratingScore: number;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> => {
    const response = await apiClient.get('/api/browse/peer-matches', {
      params: { page, limit },
    });
    return response.data;
  },
};
