import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { skillsApi } from '@/lib/api';
import { CreateSkillDto } from '@/types/api.types';

// Query Keys
export const skillKeys = {
  all: ['skills'] as const,
  lists: () => [...skillKeys.all, 'list'] as const,
  list: (search?: string, page?: number, limit?: number, offset?: number) =>
    [...skillKeys.lists(), { search, page, limit, offset }] as const,
};

// Get all skills
export function useSkills(
  search?: string,
  page?: number,
  limit?: number,
  offset?: number
) {
  return useQuery({
    queryKey: skillKeys.list(search, page, limit, offset),
    queryFn: () => skillsApi.getAllSkills(search, page, limit, offset),
    staleTime: 10 * 60 * 1000, // 10 minutes (skills don't change often)
  });
}

// Create skill
export function useCreateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSkillDto) => skillsApi.createSkill(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.lists() });
    },
  });
}
