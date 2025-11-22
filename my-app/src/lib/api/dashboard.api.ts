import apiClient from '../api-client';
import { DashboardData, DashboardQuery } from '@/types/api.types';
import { cleanQueryParams } from '../utils/api-utils';

export const dashboardApi = {
  // Get dashboard data
  getDashboardData: async (query?: DashboardQuery): Promise<DashboardData> => {
    const response = await apiClient.get<DashboardData>('/api/dashboard', {
      params: query ? cleanQueryParams(query) : {},
    });
    return response.data;
  },
};
