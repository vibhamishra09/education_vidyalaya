// Stub API for static build
export const usersApi = {
  getCurrentUser: async () => ({ user: {}, isNewUser: false }),
  updateUserProfile: async () => ({ user: {}, isNewUser: false }),
  getPublicUserProfile: async () => ({}),
  getUserSkills: async () => ({}),
  checkUsernameAvailability: async () => ({ available: true }),
};
