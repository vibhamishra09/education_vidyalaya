import apiClient from '../api-client';
import {
  AchievementsResponse,
  Achievement,
  MonthlyTopUsersResponse,
} from '@/types/api.types';

export const achievementsApi = {
  // Get all achievements with user progress
  getAchievements: async (): Promise<AchievementsResponse> => {
    const response = await apiClient.get<AchievementsResponse>('/api/achievements');
    return response.data;
  },

  // Get only unlocked achievements
  getUnlockedAchievements: async (): Promise<{
    achievements: Achievement[];
    total: number;
  }> => {
    const response = await apiClient.get<{
      achievements: Achievement[];
      total: number;
    }>('/api/achievements/unlocked');
    return response.data;
  },

  // Get achievements in progress
  getInProgressAchievements: async (): Promise<{
    achievements: Achievement[];
    total: number;
  }> => {
    const response = await apiClient.get<{
      achievements: Achievement[];
      total: number;
    }>('/api/achievements/progress');
    return response.data;
  },

  // Get monthly top users
  getMonthlyTopUsers: async (): Promise<MonthlyTopUsersResponse> => {
    const response = await apiClient.get<MonthlyTopUsersResponse>(
      '/api/achievements/monthly-top'
    );
    return response.data;
  },
};
