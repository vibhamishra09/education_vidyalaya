import apiClient from '../api-client';
import { BrowseResponse, BrowseFilters } from '@/types/api.types';
import { cleanQueryParams } from '../utils/api-utils';

export const browseApi = {
  // Get browse data
  getBrowseData: async (filters: BrowseFilters): Promise<BrowseResponse> => {
    const cleanedParams = cleanQueryParams(filters);
    const response = await apiClient.get<BrowseResponse>('/api/browse', {
      params: cleanedParams,
    });
    return response.data;
  },
};
