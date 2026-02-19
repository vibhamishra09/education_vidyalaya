import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { studyRoomsApi } from '@/lib/api';
import { setAuthToken } from '@/lib/api-client';
import {
  CreateStudyRoomDto,
  StudyRoomEditScope,
  UpdateStudyRoomDto,
  StudyRoomFilters,
} from '@/types/api.types';

// Query Keys
export const studyRoomKeys = {
  all: ['studyRooms'] as const,
  lists: () => [...studyRoomKeys.all, 'list'] as const,
  list: (filters?: StudyRoomFilters) => [...studyRoomKeys.lists(), filters] as const,
  details: () => [...studyRoomKeys.all, 'detail'] as const,
  detail: (id: string) => [...studyRoomKeys.details(), id] as const,
};

// Get study rooms
export function useStudyRooms(filters?: StudyRoomFilters) {
  return useQuery({
    queryKey: studyRoomKeys.list(filters),
    queryFn: () => studyRoomsApi.getStudyRooms(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Get study room details
export function useStudyRoomDetails(studyRoomId: string) {
  const { getToken, isLoaded } = useAuth();

  return useQuery({
    queryKey: studyRoomKeys.detail(studyRoomId),
    queryFn: async () => {
      // If auth is ready, attach token; don't block this public endpoint on Clerk load.
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return studyRoomsApi.getStudyRoomDetails(studyRoomId);
    },
    enabled: !!studyRoomId,
  });
}

// Create study room
export function useCreateStudyRoom() {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateStudyRoomDto) => {
      // Ensure token is set before making the request
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return studyRoomsApi.createStudyRoom(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studyRoomKeys.lists() });
    },
  });
}

// Update study room
export function useUpdateStudyRoom(studyRoomId: string) {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdateStudyRoomDto) => {
      // Ensure token is set before making the request
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return studyRoomsApi.updateStudyRoom(studyRoomId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studyRoomKeys.detail(studyRoomId) });
      queryClient.invalidateQueries({ queryKey: studyRoomKeys.lists() });
    },
  });
}

// Join study room
export function useJoinStudyRoom() {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async (studyRoomId: string) => {
      // Ensure token is set before making the request
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return studyRoomsApi.joinStudyRoom(studyRoomId);
    },
    onSuccess: async (_, studyRoomId) => {
      // Invalidate queries (marks them as stale)
      queryClient.invalidateQueries({ queryKey: studyRoomKeys.detail(studyRoomId) });
      queryClient.invalidateQueries({ queryKey: studyRoomKeys.lists() });
      // Invalidate current user to refresh webya balance
      queryClient.invalidateQueries({ queryKey: ['users', 'current'] });
      // Invalidate transaction history to show the new payment
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      // Explicitly refetch queries to ensure immediate update
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: studyRoomKeys.detail(studyRoomId),
          type: 'active'
        }),
        queryClient.refetchQueries({
          queryKey: ['users', 'current'],
          type: 'active'
        }),
        queryClient.refetchQueries({
          queryKey: ['transactions'],
          type: 'active'
        }),
      ]);
    },
  });
}

// Cancel study room
export function useCancelStudyRoom(studyRoomId: string) {
  const queryClient = useQueryClient();
  const { getToken, isLoaded } = useAuth();

  return useMutation({
    mutationFn: async (scope: StudyRoomEditScope = StudyRoomEditScope.SINGLE) => {
      if (isLoaded) {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }
      }
      return studyRoomsApi.cancelStudyRoom(studyRoomId, scope);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studyRoomKeys.detail(studyRoomId) });
      queryClient.invalidateQueries({ queryKey: studyRoomKeys.lists() });
    },
  });
}
