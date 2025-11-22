import apiClient from '../api-client';
import { NotificationsResponse, Notification } from '@/types/api.types';
import { cleanQueryParams } from '../utils/api-utils';

export const notificationsApi = {
  // Get notifications
  getNotifications: async (
    page?: number,
    limit?: number,
    type?: string,
    viewed?: boolean
  ): Promise<NotificationsResponse> => {
    const params = cleanQueryParams({
      page,
      limit,
      type,
      viewed,
    });
    const response = await apiClient.get<NotificationsResponse>('/api/notifications', {
      params,
    });
    return response.data;
  },

  // Mark notification as read
  markNotificationAsRead: async (notificationId: string): Promise<Notification> => {
    const response = await apiClient.patch<Notification>(
      `/api/notifications/${notificationId}/read`
    );
    return response.data;
  },

  // Mark all notifications as read
  markAllNotificationsAsRead: async (): Promise<{ success: boolean; count: number }> => {
    const response = await apiClient.patch('/api/notifications/read-all');
    return response.data;
  },

  // Get VAPID public key for push notifications
  getVapidPublicKey: async (): Promise<{ publicKey: string }> => {
    const response = await apiClient.get<{ publicKey: string }>(
      '/api/notifications/vapid-public-key'
    );
    return response.data;
  },

  // Subscribe to push notifications
  subscribeToPush: async (subscription: PushSubscriptionJSON): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(
      '/api/notifications/push/subscribe',
      subscription
    );
    return response.data;
  },

  // Unsubscribe from push notifications
  unsubscribeFromPush: async (endpoint: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(
      '/api/notifications/push/unsubscribe',
      { data: { endpoint } }
    );
    return response.data;
  },
};
