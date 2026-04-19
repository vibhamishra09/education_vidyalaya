import apiClient from '../api-client';

export interface ChatChannelMember {
  id: string;
  channelId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface ChatChannelMessage {
  id: string;
  content: string;
  createdAt: string;
  senderId: string | null;
  sender: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
}

export interface ChatChannel {
  id: string;
  name: string;
  isDirect: boolean;
  createdAt: string;
  externalType: string | null;
  externalId: string | null;
  members: ChatChannelMember[];
  messages?: ChatChannelMessage[];
  unreadCount?: number;
}

export const chatApi = {
  /** List all channels for the current user (basic) */
  listChannels: async (): Promise<ChatChannel[]> => {
    const response = await apiClient.get<ChatChannel[]>('/api/chat/channels');
    return response.data;
  },

  /** List channels with last message preview (for conversation list) */
  listChannelsWithMessages: async (): Promise<ChatChannel[]> => {
    const response = await apiClient.get<ChatChannel[]>('/api/chat/channels/with-messages');
    return response.data;
  },

  /** Get a single channel with members */
  getChannel: async (channelId: string): Promise<ChatChannel> => {
    const response = await apiClient.get<ChatChannel>(`/api/chat/channels/${channelId}`);
    return response.data;
  },

  /** Get or create a DM channel with a target user */
  getOrCreateDM: async (targetUserId: string): Promise<ChatChannel> => {
    const response = await apiClient.post<ChatChannel>('/api/chat/dm', { targetUserId });
    return response.data;
  },

  /** Create a channel (generic) */
  createChannel: async (name: string, userIds: string[], isDirect = false): Promise<ChatChannel> => {
    const response = await apiClient.post<ChatChannel>('/api/chat/channels', {
      name,
      userIds,
      isDirect,
    });
    return response.data;
  },

  /** Mark a channel as read */
  markChannelAsRead: async (channelId: string): Promise<void> => {
    await apiClient.post(`/api/chat/channels/${channelId}/read`);
  },

  /** Get total unread message count across all DM channels */
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<{ unreadCount: number }>('/api/chat/unread-count');
    return response.data.unreadCount;
  },
};
