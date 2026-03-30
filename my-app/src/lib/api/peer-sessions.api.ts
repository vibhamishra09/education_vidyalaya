import apiClient from '../api-client';
import {
  PeerSessionsResponse,
  PeerSession,
  RequestSessionDto,
  UpdateSessionStatusDto,
  UpdatePeerSessionDto,
  SessionFeedbackSubmission,
} from '@/types/api.types';
import { cleanQueryParams } from '../utils/api-utils';
import type { AvailableSlotsResponse } from './availability.api';

/**
 * Peer session URLs:
 * - If the API lives on another origin (NEXT_PUBLIC_API_URL), call it directly.
 * - Otherwise use same-origin `/api/...` so Next can run `app/api/peer-sessions/[sessionId]`
 *   (proxy) or `fallback` rewrites — never a dead PATCH on the root Next app.
 */
function peerSessionsUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '') ?? '';
  if (
    base &&
    typeof window !== 'undefined' &&
    base !== window.location.origin
  ) {
    return `${base}${normalizedPath}`;
  }
  return normalizedPath;
}

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
    const response = await apiClient.get<PeerSessionsResponse>(peerSessionsUrl('/api/peer-sessions'), {
      params,
    });
    return response.data;
  },

  // Get peer session details
  getPeerSessionDetails: async (peerSessionId: string): Promise<PeerSession> => {
    const response = await apiClient.get<PeerSession>(
      peerSessionsUrl(`/api/peer-sessions/${peerSessionId}`),
    );
    return response.data;
  },

  // Request peer session
  requestPeerSession: async (data: RequestSessionDto): Promise<PeerSession> => {
    const response = await apiClient.post<PeerSession>(peerSessionsUrl('/api/peer-sessions'), data);
    return response.data;
  },

  // Update peer session status
  updatePeerSessionStatus: async (
    peerSessionId: string,
    data: UpdateSessionStatusDto
  ): Promise<PeerSession> => {
    const response = await apiClient.patch<PeerSession>(
      peerSessionsUrl(`/api/peer-sessions/${peerSessionId}/status`),
      data,
    );
    return response.data;
  },

  updatePeerSession: async (
    peerSessionId: string,
    data: UpdatePeerSessionDto
  ): Promise<PeerSession> => {
    const response = await apiClient.patch<PeerSession>(
      peerSessionsUrl(`/api/peer-sessions/${peerSessionId}`),
      data,
    );
    return response.data;
  },

  // Accept peer session request
  acceptPeerSession: async (peerSessionId: string): Promise<PeerSession> => {
    const response = await apiClient.patch<PeerSession>(
      peerSessionsUrl(`/api/peer-sessions/${peerSessionId}/accept`),
    );
    return response.data;
  },

  // Reject peer session request
  rejectPeerSession: async (peerSessionId: string): Promise<PeerSession> => {
    const response = await apiClient.patch<PeerSession>(
      peerSessionsUrl(`/api/peer-sessions/${peerSessionId}/reject`),
    );
    return response.data;
  },

  // Complete peer session
  completePeerSession: async (peerSessionId: string): Promise<PeerSession> => {
    const response = await apiClient.patch<PeerSession>(
      peerSessionsUrl(`/api/peer-sessions/${peerSessionId}/complete`),
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
    conflicts?: Array<{
      id: string;
      type: 'session' | 'blocked_slot' | 'availability';
      startTime: string;
      endTime: string;
      reason?: string;
    }>;
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
    interval: number = 30, // Minutes
    durations?: number[]
  ): Promise<AvailableSlotsResponse> => {
    const params: Record<string, string | number> = { date, duration, interval };
    if (durations && durations.length > 0) {
      params.durations = durations.join(',');
    }

    const response = await apiClient.get(`/api/availability/slots/${userId}`, {
      params,
    });
    return response.data;
  },

  // Submit session feedback
  submitSessionFeedback: async (
    peerSessionId: string,
    feedback: SessionFeedbackSubmission
  ): Promise<{ success: boolean; message: string; peerSessionId: string }> => {
    const response = await apiClient.post(
      peerSessionsUrl(`/api/peer-sessions/${peerSessionId}/feedback`),
      feedback,
    );
    return response.data;
  },

  // Check if user is host
  checkIsHost: async (peerSessionId: string): Promise<{ isHost: boolean }> => {
    const response = await apiClient.get<{ isHost: boolean }>(
      peerSessionsUrl(`/api/peer-sessions/${peerSessionId}/is-host`),
    );
    return response.data;
  },
};
