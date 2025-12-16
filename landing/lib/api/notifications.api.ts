// Stub API for static build
export const notificationsApi = {
  getNotifications: async () => ({
    notifications: [],
    unreadCount: 0,
    pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasMore: false },
  }),
  markNotificationAsRead: async () => ({}),
  markAllNotificationsAsRead: async () => ({ success: true, count: 0 }),
  markNotificationsAsRead: async () => ({ success: true, count: 0 }),
};
