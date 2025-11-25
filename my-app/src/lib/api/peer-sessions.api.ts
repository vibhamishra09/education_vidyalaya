import apiClient from '../api-client';
import {
  PeerSessionsResponse,
  PeerSession,
  RequestSessionDto,
  UpdateSessionStatusDto,
} from '@/types/api.types';
import { cleanQueryParams } from '../utils/api-utils';

export const peerSessionsApi = {
  // Get peer sessions
  getPeerSessions: async (
    status?: string,
    requestedBy?: string,
    requestedTo?: string,
    page?: number,
    limit?: number
  ): Promise<PeerSessionsResponse> => {
    const params = cleanQueryParams({
      status,
      requestedBy,
      requestedTo,
      page,
      limit,
    });
    const response = await apiClient.get<PeerSessionsResponse>('/api/peer-sessions', {
      params,
    });
    return response.data;
  },

  // Get peer session details
  getPeerSessionDetails: async (peerSessionId: string): Promise<PeerSession> => {
    const response = await apiClient.get<PeerSession>(`/api/peer-sessions/${peerSessionId}`);
    return response.data;
  },

  // Request peer session
  requestPeerSession: async (data: RequestSessionDto): Promise<PeerSession> => {
    const response = await apiClient.post<PeerSession>('/api/peer-sessions', data);
    return response.data;
  },

  // Update peer session status
  updatePeerSessionStatus: async (
    peerSessionId: string,
    data: UpdateSessionStatusDto
  ): Promise<PeerSession> => {
    const response = await apiClient.patch<PeerSession>(
      `/api/peer-sessions/${peerSessionId}/status`,
      data
    );
    return response.data;
  },

  // Accept peer session request
  acceptPeerSession: async (peerSessionId: string): Promise<PeerSession> => {
    const response = await apiClient.patch<PeerSession>(
      `/api/peer-sessions/${peerSessionId}/accept`
    );
    return response.data;
  },

  // Reject peer session request
  rejectPeerSession: async (peerSessionId: string): Promise<PeerSession> => {
    const response = await apiClient.patch<PeerSession>(
      `/api/peer-sessions/${peerSessionId}/reject`
    );
    return response.data;
  },

  // Complete peer session
  completePeerSession: async (peerSessionId: string): Promise<PeerSession> => {
    const response = await apiClient.patch<PeerSession>(
      `/api/peer-sessions/${peerSessionId}/complete`
    );
    return response.data;
  },

  // Check availability for a specific time slot
  checkAvailability: async (
    userId: string,
    startTime: string, // ISO date string
    duration: number // Minutes
  ): Promise<{
    isAvailable: boolean;
    reason?: string;
    conflicts?: any[];
  }> => {
    const response = await apiClient.get(`/api/availability/check/${userId}`, {
      params: { startTime, duration },
    });
    return response.data;
  },

  // Get available slots for a specific date
  getAvailableSlots: async (
    userId: string,
    date: string, // YYYY-MM-DD
    duration: number = 60, // Minutes
    interval: number = 30 // Minutes
  ): Promise<{
    availableSlots: Array<{
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    }>;
  }> => {
    const response = await apiClient.get(`/api/availability/slots/${userId}`, {
      params: { date, duration, interval },
    });
    return response.data;
  },
};
