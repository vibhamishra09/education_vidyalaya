import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { debateRoomsApi } from '@/lib/api/debate-rooms.api';
import { setAuthToken } from '@/lib/api-client';
import {
  CreateDebateRoomDto,
  UpdateDebateRoomDto,
  JoinDebateRoomDto,
  DebateRoomFilters,
  DebateSide,
  UpsertDebateModeratorEvaluationDto,
  ModeratorEvaluationsQuery,
} from '@/types/debate.types';

// Query Keys
export const debateRoomKeys = {
  all: ['debateRooms'] as const,
  lists: () => [...debateRoomKeys.all, 'list'] as const,
  list: (filters?: DebateRoomFilters) => [...debateRoomKeys.lists(), filters] as const,
  details: () => [...debateRoomKeys.all, 'detail'] as const,
  detail: (id: string) => [...debateRoomKeys.details(), id] as const,
  results: (id: string) => [...debateRoomKeys.all, 'results', id] as const,
  token: (id: string) => [...debateRoomKeys.all, 'token', id] as const,
  evaluations: (id: string) => [...debateRoomKeys.all, 'evaluations', id] as const,
  evaluationsFiltered: (id: string, query?: ModeratorEvaluationsQuery) =>
    [...debateRoomKeys.evaluations(id), query] as const,
  participantEvaluations: (id: string, participantId: string, turnNumber?: number) =>
    [...debateRoomKeys.evaluations(id), participantId, turnNumber] as const,
};

// Get debate rooms list
export function useDebateRooms(filters?: DebateRoomFilters) {
  return useQuery({
    queryKey: debateRoomKeys.list(filters),
    queryFn: () => debateRoomsApi.getDebateRooms(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Get debate room details
export function useDebateRoomDetails(roomId: string) {
  const { getToken, isLoaded } = useAuth();

  return useQuery({
    queryKey: debateRoomKeys.detail(roomId),
    queryFn: async () => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return debateRoomsApi.getDebateRoomDetails(roomId);
    },
    enabled: !!roomId && isLoaded,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });
}

// Create debate room
export function useCreateDebateRoom() {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateDebateRoomDto) => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return debateRoomsApi.createDebateRoom(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: debateRoomKeys.lists() });
    },
  });
}

// Update debate room
export function useUpdateDebateRoom(roomId: string) {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdateDebateRoomDto) => {
      if (!isLoaded) {
        throw new Error('Signing in… try saving again in a moment.');
      }
      let token = await getToken();
      if (!token) {
        token = await getToken({ skipCache: true });
      }
      if (!token) {
        throw new Error('You must be signed in to update this debate.');
      }
      setAuthToken(token);
      return debateRoomsApi.updateDebateRoom(roomId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: debateRoomKeys.detail(roomId) });
      queryClient.invalidateQueries({ queryKey: debateRoomKeys.lists() });
    },
  });
}

// Join debate room
export function useJoinDebateRoom() {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async ({
      roomId,
      preferredSide,
    }: {
      roomId: string;
      preferredSide?: DebateSide;
    }) => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      const data: JoinDebateRoomDto = preferredSide ? { preferredSide } : {};
      return debateRoomsApi.joinDebateRoom(roomId, data);
    },
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: debateRoomKeys.detail(roomId) });
      queryClient.invalidateQueries({ queryKey: debateRoomKeys.lists() });
    },
  });
}

// Leave debate room
export function useLeaveDebateRoom() {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async (roomId: string) => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return debateRoomsApi.leaveDebateRoom(roomId);
    },
    onSuccess: (_, roomId) => {
      queryClient.invalidateQueries({ queryKey: debateRoomKeys.detail(roomId) });
      queryClient.invalidateQueries({ queryKey: debateRoomKeys.lists() });
    },
  });
}

// Cancel debate room
export function useCancelDebateRoom() {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async (roomId: string) => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return debateRoomsApi.cancelDebateRoom(roomId);
    },
    onSuccess: (_, roomId) => {
      queryClient.invalidateQueries({ queryKey: debateRoomKeys.detail(roomId) });
      queryClient.invalidateQueries({ queryKey: debateRoomKeys.lists() });
    },
  });
}

// Start prep phase
export function useStartPrepPhase() {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async (roomId: string) => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return debateRoomsApi.startPrepPhase(roomId);
    },
    onSuccess: (_, roomId) => {
      queryClient.invalidateQueries({ queryKey: debateRoomKeys.detail(roomId) });
    },
  });
}

// Ban participant
export function useBanParticipant() {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async ({
      roomId,
      participantUserId,
      reason,
    }: {
      roomId: string;
      participantUserId: string;
      reason?: string;
    }) => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return debateRoomsApi.banParticipant(roomId, participantUserId, reason);
    },
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: debateRoomKeys.detail(roomId) });
    },
  });
}

// Generate results
export function useGenerateResults() {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async (roomId: string) => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return debateRoomsApi.generateResults(roomId);
    },
    onSuccess: (_, roomId) => {
      queryClient.invalidateQueries({ queryKey: debateRoomKeys.results(roomId) });
      queryClient.invalidateQueries({ queryKey: debateRoomKeys.detail(roomId) });
    },
  });
}

// Get results
export function useDebateResults(roomId: string, enabled = true) {
  const { getToken, isLoaded } = useAuth();

  return useQuery({
    queryKey: debateRoomKeys.results(roomId),
    queryFn: async () => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return debateRoomsApi.getResults(roomId);
    },
    enabled: !!roomId && isLoaded && enabled,
  });
}

// Get LiveKit token
export function useDebateLivekitToken(roomId: string, enabled = true) {
  const { getToken, isLoaded } = useAuth();

  return useQuery({
    queryKey: debateRoomKeys.token(roomId),
    queryFn: async () => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return debateRoomsApi.getLivekitToken(roomId);
    },
    enabled: !!roomId && isLoaded && enabled,
    staleTime: 5 * 60 * 1000, // Token is valid for longer
  });
}

// Create or update moderator evaluation
export function useUpsertModeratorEvaluation(roomId: string) {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async (payload: UpsertDebateModeratorEvaluationDto) => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return debateRoomsApi.upsertModeratorEvaluation(roomId, payload);
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: debateRoomKeys.evaluations(roomId) });
      queryClient.invalidateQueries({
        queryKey: debateRoomKeys.participantEvaluations(roomId, payload.participantId, payload.turnNumber),
      });
    },
  });
}

// Get current moderator evaluations with optional filters
export function useModeratorEvaluations(
  roomId: string,
  query?: ModeratorEvaluationsQuery,
  enabled = true,
) {
  const { getToken, isLoaded } = useAuth();

  return useQuery({
    queryKey: debateRoomKeys.evaluationsFiltered(roomId, query),
    queryFn: async () => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return debateRoomsApi.getModeratorEvaluations(roomId, query);
    },
    enabled: !!roomId && isLoaded && enabled,
  });
}

// Get current moderator evaluations for a specific participant
export function useParticipantEvaluations(
  roomId: string,
  participantId: string,
  turnNumber?: number,
  enabled = true,
) {
  const { getToken, isLoaded } = useAuth();

  return useQuery({
    queryKey: debateRoomKeys.participantEvaluations(roomId, participantId, turnNumber),
    queryFn: async () => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return debateRoomsApi.getParticipantEvaluations(roomId, participantId, { turnNumber });
    },
    enabled: !!roomId && !!participantId && isLoaded && enabled,
  });
}
