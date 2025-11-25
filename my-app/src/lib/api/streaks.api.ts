import apiClient from '../api-client';
import { StreakData, StreakHistoryResponse } from '@/types/api.types';

export const streaksApi = {
  // Get current streak
  getCurrentStreak: async (): Promise<StreakData> => {
    const response = await apiClient.get<StreakData>('/api/streaks/current');
    return response.data;
  },

  // Get streak history for calendar view
  getStreakHistory: async (days: number = 14): Promise<StreakHistoryResponse> => {
    const response = await apiClient.get<StreakHistoryResponse>(
      `/api/streaks/history/${days}`
    );
    return response.data;
  },
};
