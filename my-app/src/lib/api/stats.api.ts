import apiClient from '../api-client';

export interface PlatformStats {
  usersOnboarded: number;
  studyRoomsHosted: number;
  sessionsCompleted: number;
  learningHours: number;
  reviewsGiven: number;
  averageRating?: number;
}

export const statsApi = {
  getPlatformStats: async (): Promise<PlatformStats> => {
    const response = await apiClient.get<PlatformStats>('/api/stats/platform');
    return response.data;
  },
};

