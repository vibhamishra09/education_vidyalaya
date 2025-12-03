import axios, { AxiosInstance } from 'axios';
import {
  FeedbackSubmission,
  FeedbackResponse,
  Feedback,
  FeedbackListResponse,
  FeedbackFilters,
  FeedbackStatsResponse,
  AttachmentUploadRequest,
  AttachmentUploadResponse,
} from '@/types/api.types';
import { cleanQueryParams } from '../utils/api-utils';

// Create a separate axios instance for feedback API (AWS API Gateway)
const feedbackApiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_FEEDBACK_API_URL || '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to get device info
export const getDeviceInfo = (): {
  browser?: string;
  os?: string;
  device?: string;
  screenResolution?: string;
} => {
  if (typeof window === 'undefined') {
    return {};
  }

  const ua = navigator.userAgent;
  const screen = window.screen;

  // Detect browser
  let browser: string | undefined;
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  else browser = 'Unknown';

  // Detect OS
  let os: string | undefined;
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS')) os = 'iOS';
  else os = 'Unknown';

  // Detect device type
  let device: string | undefined;
  if (screen.width < 768) device = 'Mobile';
  else if (screen.width < 1024) device = 'Tablet';
  else device = 'Desktop';

  return {
    browser,
    os,
    device,
    screenResolution: `${screen.width}x${screen.height}`,
  };
};

export const feedbackApi = {
  // Submit feedback
  submitFeedback: async (
    data: FeedbackSubmission
  ): Promise<FeedbackResponse> => {
    // Auto-capture device info if not provided
    const submissionData: FeedbackSubmission = {
      ...data,
      deviceInfo: data.deviceInfo || getDeviceInfo(),
    };

    const response = await feedbackApiClient.post<FeedbackResponse>(
      '/feedback',
      submissionData
    );
    return response.data;
  },

  // Upload attachment for feedback
  uploadAttachment: async (
    feedbackId: string,
    attachment: AttachmentUploadRequest
  ): Promise<AttachmentUploadResponse> => {
    const response = await feedbackApiClient.post<AttachmentUploadResponse>(
      `/feedback/${feedbackId}/attachments`,
      attachment
    );
    return response.data;
  },

  // Get feedback by ID
  getFeedback: async (feedbackId: string): Promise<Feedback> => {
    const response = await feedbackApiClient.get<{ feedback: Feedback }>(
      `/feedback/${feedbackId}`
    );
    return response.data.feedback;
  },

  // Get list of feedback
  getFeedbackList: async (
    filters?: FeedbackFilters
  ): Promise<FeedbackListResponse> => {
    const response = await feedbackApiClient.get<FeedbackListResponse>(
      '/feedback',
      {
        params: filters ? cleanQueryParams(filters) : {},
      }
    );
    return response.data;
  },

  // Get feedback statistics
  getFeedbackStats: async (): Promise<FeedbackStatsResponse> => {
    const response = await feedbackApiClient.get<FeedbackStatsResponse>(
      '/feedback/stats'
    );
    return response.data;
  },
};

// Helper function to convert File to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1]; // Remove data:type;base64, prefix
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

