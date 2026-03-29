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

/** Public webinar registration page metadata (GET /api/study-rooms/webinar/public/:slug). */
export type WebinarPublicMetadata = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  duration: number;
  sessionStatus: string;
  hostName: string;
  registrationFields: Array<{
    id: string;
    label: string;
    required?: boolean;
    type?: string;
  }>;
};

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

  getWebinarPublic: async (slug: string): Promise<WebinarPublicMetadata> => {
    const response = await apiClient.get(
      `/api/study-rooms/webinar/public/${encodeURIComponent(slug)}`,
      { skipClerkAuth: true },
    );
    return response.data as WebinarPublicMetadata;
  },

  registerWebinar: async (
    slug: string,
    data: { name: string; email: string; responses?: Record<string, string> },
  ) => {
    const response = await apiClient.post(
      `/api/study-rooms/webinar/register/${encodeURIComponent(slug)}`,
      data,
      { skipClerkAuth: true },
    );
    return response.data as {
      success: boolean;
      /** True when this email was already registered; no new email is sent. */
      alreadyRegistered?: boolean;
      approvalPending?: boolean;
      /** False when SES failed to send confirmation. Passcode is only in email—never returned by the API. */
      emailSent?: boolean;
      joinUrlManual?: string;
      roomId: string;
      title: string;
      message: string;
      /** Only when backend runs in development or WEBINAR_EXPOSE_EMAIL_PREVIEW_IN_API=true — for DevTools console. */
      debugEmailPreview?: { to: string; subject: string; html: string };
    };
  },

  joinWebinarWithPasscode: async (data: {
    studyRoomId: string;
    passcode: string;
    /** From `?token=` on the emailed join link */
    joinToken: string;
  }) => {
    const response = await apiClient.post(`/api/study-rooms/webinar/join`, data, {
      skipClerkAuth: true,
    });
    return response.data as {
      success: boolean;
      guestAccessToken: string;
      joinUrl: string;
      roomId: string;
    };
  },

  /** Poll whether the host has approved this registration (same token as join link). */
  getWebinarApprovalStatus: async (studyRoomId: string, joinToken: string) => {
    const response = await apiClient.get(`/api/study-rooms/webinar/approval-status`, {
      params: { room: studyRoomId, token: joinToken },
      skipClerkAuth: true,
    });
    return response.data as {
      waitingRoomEnabled: boolean;
      canJoin: boolean;
    };
  },

  listWebinarRegistrations: async (studyRoomId: string) => {
    const response = await apiClient.get(
      `/api/study-rooms/webinar/${encodeURIComponent(studyRoomId)}/registrations`,
    );
    return response.data as {
      waitingRoomEnabled: boolean;
      registrations: Array<{
        id: string;
        name: string;
        email: string;
        createdAt: string;
        responses: unknown;
        guestParticipantId: string | null;
        approvalStatus: "pending" | "approved";
      }>;
    };
  },

  approveWebinarRegistration: async (
    studyRoomId: string,
    registrationId: string
  ) => {
    const response = await apiClient.post(
      `/api/study-rooms/webinar/${encodeURIComponent(studyRoomId)}/registrations/${encodeURIComponent(registrationId)}/approve`
    );
    return response.data as {
      success: boolean;
      alreadyApproved?: boolean;
    };
  },

  removeWebinarGuest: async (studyRoomId: string, guestId: string) => {
    const response = await apiClient.delete(
      `/api/study-rooms/webinar/${encodeURIComponent(studyRoomId)}/guests/${encodeURIComponent(guestId)}`,
    );
    return response.data as { success: boolean };
  },

  setWebinarChatEnabled: async (studyRoomId: string, enabled: boolean) => {
    const response = await apiClient.patch(
      `/api/study-rooms/webinar/${encodeURIComponent(studyRoomId)}/chat-enabled`,
      { enabled },
    );
    return response.data as { success: boolean; chatEnabled: boolean };
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

  joinRecurringRooms: async (
    roomId: string,
    scope: 'THIS' | 'FOLLOWING',
  ): Promise<unknown> => {
    const response = await apiClient.post(
      `/api/study-rooms/${roomId}/join-recurring`,
      { scope },
    );

    return response.data;
  },

    unenroll : async(roomId: string , scope: 'THIS'| "ALL" | 'FOLLOWING') : Promise<unknown> => {
      const response = await apiClient.post(`/api/study-rooms/${roomId}/unenroll`, {
        scope
      });

      return response.data;
    },

  requestExternalJoin: async (
    studyRoomId: string,
    data: { name: string; email: string; passcode: string },
  ): Promise<
    | { status: 'PENDING'; message: string }
    | {
        status: 'APPROVED';
        message: string;
        guestAccessToken: string;
        participantIdentity: string;
        role: 'PARTICIPANT' | 'COHOST';
      }
  > => {
    const response = await apiClient.post(
      `/api/study-rooms/${studyRoomId}/external/request`,
      data,
    );
    return response.data;
  },

  listExternalJoinRequests: async (
    studyRoomId: string,
  ): Promise<{
    requests: Array<{
      id: string;
      name: string;
      email: string;
      status: 'PENDING' | 'APPROVED' | 'REJECTED';
      createdAt: string;
    }>;
  }> => {
    const response = await apiClient.get(
      `/api/study-rooms/${studyRoomId}/external/requests`,
    );
    return response.data;
  },

  resolveExternalJoinRequest: async (
    studyRoomId: string,
    requestId: string,
    approve: boolean,
  ): Promise<{
    success: boolean;
    status: 'APPROVED' | 'REJECTED';
    guestAccessToken?: string;
    participantIdentity?: string;
  }> => {
    const response = await apiClient.post(
      `/api/study-rooms/${studyRoomId}/external/requests/${requestId}/resolve`,
      { approve },
    );
    return response.data;
  },

  toggleExternalAutoAccept: async (
    studyRoomId: string,
    enabled: boolean,
  ): Promise<{ success: boolean; externalAutoAccept: boolean }> => {
    const response = await apiClient.post(
      `/api/study-rooms/${studyRoomId}/external/auto-accept`,
      { enabled },
    );
    return response.data;
  },

  updateParticipantRole: async (
    studyRoomId: string,
    participantIdentity: string,
    role: 'PARTICIPANT' | 'COHOST',
  ): Promise<{ success: boolean; role: 'PARTICIPANT' | 'COHOST' }> => {
    const response = await apiClient.post(
      `/api/study-rooms/${studyRoomId}/participants/role`,
      { participantIdentity, role },
    );
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
