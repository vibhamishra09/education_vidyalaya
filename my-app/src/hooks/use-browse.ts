import { useQuery } from '@tanstack/react-query';
import { browseApi } from '@/lib/api';
import { BrowseFilters } from '@/types/api.types';

// Query Keys
export const browseKeys = {
  all: ['browse'] as const,
  list: (filters: BrowseFilters) => [...browseKeys.all, filters] as const,
};

// Get browse data
export function useBrowse(filters: BrowseFilters) {
  return useQuery({
    queryKey: browseKeys.list(filters),
    queryFn: () => browseApi.getBrowseData(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}
