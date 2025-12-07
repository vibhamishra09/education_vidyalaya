import apiClient from '../api-client';
import { DashboardData, DashboardQuery } from '@/types/api.types';
import { cleanQueryParams } from '../utils/api-utils';

export interface SessionActivityDataPoint {
  date: string;
  learned: number;
  taught: number;
  studyRooms: number;
}

export interface WalletActivityDataPoint {
  month: string;
  earned: number;
  spent: number;
  net: number;
}

export const dashboardApi = {
  // Get dashboard data
  getDashboardData: async (query?: DashboardQuery): Promise<DashboardData> => {
    const response = await apiClient.get<DashboardData>('/api/dashboard', {
      params: query ? cleanQueryParams(query) : {},
    });
    return response.data;
  },

  // Get session activity data for charts
  getSessionActivity: async (days: number = 30): Promise<SessionActivityDataPoint[]> => {
    const response = await apiClient.get<SessionActivityDataPoint[]>(
      '/api/dashboard/session-activity',
      { params: { days } }
    );
    return response.data;
  },

  // Get wallet activity data for charts
  getWalletActivity: async (months: number = 6): Promise<WalletActivityDataPoint[]> => {
    const response = await apiClient.get<WalletActivityDataPoint[]>(
      '/api/dashboard/wallet-activity',
      { params: { months } }
    );
    return response.data;
  },
};
