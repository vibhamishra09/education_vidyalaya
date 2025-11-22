import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { peerSessionsApi } from '@/lib/api';
import { setAuthToken } from '@/lib/api-client';
import {
  RequestSessionDto,
  SessionStatus,
} from '@/types/api.types';

// Query Keys
export const peerSessionKeys = {
  all: ['peerSessions'] as const,
  lists: () => [...peerSessionKeys.all, 'list'] as const,
  list: (status?: string, requestedBy?: string, requestedTo?: string, page?: number, limit?: number) => 
    [...peerSessionKeys.lists(), { status, requestedBy, requestedTo, page, limit }] as const,
  details: () => [...peerSessionKeys.all, 'detail'] as const,
  detail: (id: string) => [...peerSessionKeys.details(), id] as const,
};

// Get peer sessions
export function usePeerSessions(
  status?: string,
  requestedBy?: string,
  requestedTo?: string,
  page?: number,
  limit?: number
) {
  const { getToken, isLoaded } = useAuth();

  return useQuery({
    queryKey: peerSessionKeys.list(status, requestedBy, requestedTo, page, limit),
    queryFn: async () => {
      // Ensure token is set before making the request
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return peerSessionsApi.getPeerSessions(status, requestedBy, requestedTo, page, limit);
    },
    enabled: isLoaded, // Wait for Clerk to be loaded
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Get peer session details
export function usePeerSessionDetails(peerSessionId: string) {
  const { getToken, isLoaded } = useAuth();

  return useQuery({
    queryKey: peerSessionKeys.detail(peerSessionId),
    queryFn: async () => {
      // Ensure token is set before making the request (optional auth)
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return peerSessionsApi.getPeerSessionDetails(peerSessionId);
    },
    enabled: !!peerSessionId && isLoaded, // Wait for Clerk to be loaded
  });
}

// Request peer session
export function useRequestPeerSession() {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async (data: RequestSessionDto) => {
      // Ensure token is set before making the request
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return peerSessionsApi.requestPeerSession(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peerSessionKeys.lists() });
    },
  });
}

// Update peer session status
export function useUpdatePeerSessionStatus() {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async ({ sessionId, status }: { sessionId: string; status: SessionStatus }) => {
      // Ensure token is set before making the request
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return peerSessionsApi.updatePeerSessionStatus(sessionId, { status });
    },
    onSuccess: async (_, { sessionId }) => {
      // Invalidate queries (marks them as stale)
      queryClient.invalidateQueries({ queryKey: peerSessionKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: peerSessionKeys.lists() });
      // Explicitly refetch the detail query to ensure immediate update (especially for chatChannelId)
      await queryClient.refetchQueries({ 
        queryKey: peerSessionKeys.detail(sessionId),
        type: 'active' 
      });
    },
  });
}
