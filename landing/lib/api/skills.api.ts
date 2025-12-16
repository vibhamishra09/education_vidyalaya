// Stub API for static build
export const skillsApi = {
  getAllSkills: async () => ({
    skills: [],
    pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasMore: false },
  }),
  createSkill: async () => ({}),
};
