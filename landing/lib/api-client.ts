import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from '@/types/api.types';

// Extend Window interface to include Clerk (from @clerk/clerk-react)
declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>;
      };
    };
  }
}

// Helper function to get Clerk token
const getClerkToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // For client-side, we need to access the Clerk instance directly
    // Check if Clerk is available on the window object
    if (window.Clerk && window.Clerk.session) {
      const token = await window.Clerk.session.getToken();
      return token;
    }
    
    return null;
  } catch {
    // Silently handle token retrieval errors - this is expected when user is not authenticated
    return null;
  }
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://be.dev.webyalaya.com',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  paramsSerializer: {
    serialize: (params: Record<string, unknown>) => {
      const searchParams = new URLSearchParams();
      
      for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
          // For arrays, add each item with the same key (no brackets)
          value.forEach((item) => {
            searchParams.append(key, String(item));
          });
        } else if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      
      return searchParams.toString();
    },
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Check if token is already set in headers (manually set via setAuthToken)
    if (config.headers && config.headers.Authorization) {
      // Token already set, use it
      return config;
    }
    
    // Otherwise, try to get the Clerk token for authenticated requests
    const token = await getClerkToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response) {
      // Server responded with error
      const apiError: ApiError = error.response.data;

      // Handle authentication errors gracefully
      if (error.response.status === 401) {
        // Return a user-friendly error without logging to console
        return Promise.reject({
          code: 'UNAUTHORIZED',
          message: 'Please sign in to continue',
          timestamp: new Date().toISOString(),
        } as ApiError);
      }

      // Return the API error as-is for other cases
      return Promise.reject(apiError);
    } else if (error.request) {
      // Request made but no response - network error
      return Promise.reject({
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to server. Please check your internet connection.',
        timestamp: new Date().toISOString(),
      } as ApiError);
    } else {
      // Error in request setup
      return Promise.reject({
        code: 'REQUEST_ERROR',
        message: 'An error occurred while processing your request',
        timestamp: new Date().toISOString(),
      } as ApiError);
    }
  }
);

// Method to manually set token for testing or when you have the token from elsewhere
export const setAuthToken = (token: string) => {
  if (apiClient.defaults.headers) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

// Method to clear auth token
export const clearAuthToken = () => {
  if (apiClient.defaults.headers) {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Export the client and helper functions
export { getClerkToken };
export default apiClient;
