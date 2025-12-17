import apiClient from '../api-client';
import {
  StudyRoomsResponse,
  StudyRoom,
  CreateStudyRoomDto,
  UpdateStudyRoomDto,
  StudyRoomFilters,
} from '@/types/api.types';
import { cleanQueryParams } from '../utils/api-utils';

export const studyRoomsApi = {
  // Get study rooms
  getStudyRooms: async (filters?: StudyRoomFilters): Promise<StudyRoomsResponse> => {
    const response = await apiClient.get<StudyRoomsResponse>('/api/study-rooms', {
      params: filters ? cleanQueryParams(filters) : {},
    });
    return response.data;
  },

  // Get study room details
  getStudyRoomDetails: async (studyRoomId: string): Promise<StudyRoom> => {
    const response = await apiClient.get<StudyRoom>(`/api/study-rooms/${studyRoomId}`);
    return response.data;
  },

  // Create study room
  createStudyRoom: async (data: CreateStudyRoomDto): Promise<StudyRoom> => {
    const response = await apiClient.post<StudyRoom>('/api/study-rooms', data);
    return response.data;
  },

  // Update study room
  updateStudyRoom: async (studyRoomId: string, data: UpdateStudyRoomDto): Promise<StudyRoom> => {
    const response = await apiClient.patch<StudyRoom>(`/api/study-rooms/${studyRoomId}`, data);
    return response.data;
  },

  // Join study room
  joinStudyRoom: async (studyRoomId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `/api/study-rooms/${studyRoomId}/join`
    );
    return response.data;
  },
};
