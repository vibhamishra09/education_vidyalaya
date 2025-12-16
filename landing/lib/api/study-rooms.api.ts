// Stub API for static build
export const studyRoomsApi = {
  getStudyRooms: async () => ({ studyRooms: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasMore: false } }),
  getStudyRoomDetails: async () => ({}),
  createStudyRoom: async () => ({}),
  updateStudyRoom: async () => ({}),
  joinStudyRoom: async () => ({ success: true, message: '' }),
};
