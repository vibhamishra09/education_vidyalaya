import apiClient from '../api-client';
import {
  StudyRoomsResponse,
  StudyRoom,
  CreateStudyRoomDto,
  UpdateStudyRoomDto,
  StudyRoomFilters,
  SessionFeedbackSubmission,
  StudyRoomEditScope,
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
  updateStudyRoom: async (
    studyRoomId: string,
    data: UpdateStudyRoomDto
  ): Promise<StudyRoom> => {
    const response = await apiClient.patch<StudyRoom>(
      `/api/study-rooms/${studyRoomId}`,
      data
    );
    return response.data;
  },

  // Join study room
  joinStudyRoom: async (studyRoomId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/api/study-rooms/${studyRoomId}/join`);
    return response.data;
  },

  // Cancel study room (single occurrence, future occurrences, or entire series)
  cancelStudyRoom: async (
    studyRoomId: string,
    editScope: StudyRoomEditScope = StudyRoomEditScope.SINGLE,
  ): Promise<{ success: boolean; message: string; updatedCount: number }> => {
    const response = await apiClient.post(`/api/study-rooms/${studyRoomId}/cancel`, {
      editScope,
    });
    return response.data;
  },

  // Submit session feedback
  submitSessionFeedback: async (
    studyRoomId: string,
    feedback: SessionFeedbackSubmission
  ): Promise<{ success: boolean; message: string; studyRoomId: string }> => {
    const response = await apiClient.post(
      `/api/study-rooms/${studyRoomId}/feedback`,
      feedback
    );
    return response.data;
  },

  // Check if user is host
  checkIsHost: async (studyRoomId: string): Promise<{ isHost: boolean }> => {
    const response = await apiClient.get<{ isHost: boolean }>(
      `/api/study-rooms/${studyRoomId}/is-host`
    );
    return response.data;
  },
};
