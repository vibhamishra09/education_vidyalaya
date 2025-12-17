import apiClient from '../api-client';
import { SkillsResponse, CreateSkillDto, Skill } from '@/types/api.types';
import { cleanQueryParams } from '../utils/api-utils';

export const skillsApi = {
  // Get all skills
  getAllSkills: async (
    search?: string, 
    page?: number, 
    limit?: number, 
    offset?: number
  ): Promise<SkillsResponse> => {
    const params = cleanQueryParams({
      search,
      page,
      limit,
      offset,
    });
    const response = await apiClient.get<SkillsResponse>('/api/skills', { params });
    return response.data;
  },

  // Create skill
  createSkill: async (data: CreateSkillDto): Promise<Skill> => {
    const response = await apiClient.post<Skill>('/api/skills', data);
    return response.data;
  },
};
