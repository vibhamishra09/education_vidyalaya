// Stub API for static build
export interface PlatformStats {
  usersOnboarded: number;
  studyRoomsHosted: number;
  sessionsCompleted: number;
  learningHours: number;
  reviewsGiven: number;
}

export const statsApi = {
  getPlatformStats: async (): Promise<PlatformStats> => ({
    usersOnboarded: 168,
    studyRoomsHosted: 122,
    sessionsCompleted: 253,
    learningHours: 665,
    reviewsGiven: 189,
  }),
};
