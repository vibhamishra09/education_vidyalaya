import apiClient from '../api-client';
import {
  DebateRoom,
  DebateRoomsResponse,
  CreateDebateRoomDto,
  UpdateDebateRoomDto,
  JoinDebateRoomDto,
  DebateRoomFilters,
  DebateResults,
  DebateLivekitTokenResponse,
} from '@/types/debate.types';
import { cleanQueryParams } from '../utils/api-utils';

export const debateRoomsApi = {
  // Get debate rooms list
  getDebateRooms: async (filters?: DebateRoomFilters): Promise<DebateRoomsResponse> => {
    const response = await apiClient.get<DebateRoomsResponse>('/api/debate-rooms', {
      params: filters ? cleanQueryParams(filters as unknown as Record<string, unknown>) : {},
    });
    return response.data;
  },

  // Get debate room details
  getDebateRoomDetails: async (roomId: string): Promise<DebateRoom> => {
    const response = await apiClient.get<DebateRoom>(`/api/debate-rooms/${roomId}`);
    return response.data;
  },

  // Create debate room
  createDebateRoom: async (data: CreateDebateRoomDto): Promise<DebateRoom> => {
    const response = await apiClient.post<DebateRoom>('/api/debate-rooms', data);
    return response.data;
  },

  // Update debate room
  updateDebateRoom: async (
    roomId: string,
    data: UpdateDebateRoomDto
  ): Promise<DebateRoom> => {
    const response = await apiClient.patch<DebateRoom>(
      `/api/debate-rooms/${roomId}`,
      data
    );
    return response.data;
  },

  // Join debate room
  joinDebateRoom: async (
    roomId: string,
    data?: JoinDebateRoomDto
  ): Promise<{ success: boolean; message: string; participant: { id: string; side: string } }> => {
    const response = await apiClient.post(`/api/debate-rooms/${roomId}/join`, data || {});
    return response.data;
  },

  // Leave debate room
  leaveDebateRoom: async (roomId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/api/debate-rooms/${roomId}/leave`);
    return response.data;
  },

  // Cancel debate room (host only)
  cancelDebateRoom: async (roomId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/api/debate-rooms/${roomId}`);
    return response.data;
  },

  // Start prep phase (host/moderator only)
  startPrepPhase: async (roomId: string): Promise<{ success: boolean; message: string; startTime: string }> => {
    const response = await apiClient.post(`/api/debate-rooms/${roomId}/start-prep`);
    return response.data;
  },

  // Ban participant (host/moderator only)
  banParticipant: async (
    roomId: string,
    participantUserId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/api/debate-rooms/${roomId}/ban`, {
      participantUserId,
      reason,
    });
    return response.data;
  },

  // Generate results (after debate ends)
  generateResults: async (roomId: string): Promise<DebateResults> => {
    const response = await apiClient.post<DebateResults>(
      `/api/debate-rooms/${roomId}/generate-results`
    );
    return response.data;
  },

  // Get results
  getResults: async (roomId: string): Promise<DebateResults> => {
    const response = await apiClient.get<DebateResults>(
      `/api/debate-rooms/${roomId}/results`
    );
    return response.data;
  },

  // Get LiveKit token for debate room
  getLivekitToken: async (roomId: string): Promise<DebateLivekitTokenResponse> => {
    const response = await apiClient.get<DebateLivekitTokenResponse>(
      `/api/debate-rooms/${roomId}/token`
    );
    return response.data;
  },
};
