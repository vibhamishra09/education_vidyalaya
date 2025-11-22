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
};
