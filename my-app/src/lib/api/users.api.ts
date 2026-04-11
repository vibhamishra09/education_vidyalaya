import apiClient from '../api-client';
import {
  User,
  CurrentUserResponse,
  FollowMutationResponse,
  UpdateUserDto,
} from '@/types/api.types';
import { cleanQueryParams } from '../utils/api-utils';

export const usersApi = {
  // Get current user
  getCurrentUser: async (): Promise<CurrentUserResponse> => {
    const response = await apiClient.get<CurrentUserResponse>('/api/users/me');
    return response.data;
  },

  // Update user profile
  updateUserProfile: async (data: UpdateUserDto): Promise<CurrentUserResponse> => {
    const response = await apiClient.patch<CurrentUserResponse>('/api/users/me', data);
    return response.data;
  },

  // Get public user profile
  getPublicUserProfile: async (userId: string): Promise<User> => {
    const response = await apiClient.get<User>(`/api/users/${userId}`);
    return response.data;
  },

  // Get user skills
  getUserSkills: async (userId: string, type?: 'HAS' | 'WANTS') => {
    const params = cleanQueryParams({ type });
    const response = await apiClient.get(`/api/users/${userId}/skills`, { params });
    return response.data;
  },

  // Check username availability
  checkUsernameAvailability: async (username: string): Promise<{ available: boolean }> => {
    const params = cleanQueryParams({ username });
    const response = await apiClient.get<{ available: boolean }>('/api/users/check-username', { params });
    return response.data;
  },

  followUser: async (userId: string): Promise<FollowMutationResponse> => {
    const response = await apiClient.post<FollowMutationResponse>(
      `/api/users/${userId}/follow`,
    );
    return response.data;
  },

  unfollowUser: async (userId: string): Promise<FollowMutationResponse> => {
    const response = await apiClient.delete<FollowMutationResponse>(
      `/api/users/${userId}/follow`,
    );
    return response.data;
  },
};
