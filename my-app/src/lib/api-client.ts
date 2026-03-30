import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from '@/types/api.types';
import { USER_FACING_TRY_AGAIN } from '@/lib/utils/error-handling';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** When true, do not attach Clerk or default Bearer token (e.g. guest chat history). */
    skipClerkAuth?: boolean;
  }
}

// Extend Window interface to include Clerk
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

/**
 * If NEXT_PUBLIC_API_URL equals the browser origin (e.g. both http://localhost:3000),
 * PATCH/POST would hit Next.js and return "Cannot PATCH /api/...". Use same-origin
 * + next.config rewrites to forward /api/* to Nest instead.
 */
function resolveApiBaseURL(): string {
  const env = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ?? "";

  if (typeof window !== "undefined") {
    if (env && env === window.location.origin) {
      return "";
    }
    if (env) {
      return env;
    }
    // Same-origin `/api/*` → next.config rewrites to Nest. Avoids CORS when the app is opened
    // as http://127.0.0.1:3000 while NEXT_PUBLIC_API_URL was http://localhost:3001 (or unset).
    return "";
  }

  return (
    process.env.BACKEND_URL?.trim().replace(/\/$/, "") ||
    "http://127.0.0.1:3001"
  );
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: resolveApiBaseURL(),
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
    if (config.skipClerkAuth) {
      if (config.headers) {
        delete config.headers.Authorization;
      }
      return config;
    }

    // Check if token is already set in headers (manually set via setAuthToken)
    if (config.headers && config.headers.Authorization) {
      // Token already set, use it
      return config;
    }
      
    // Check if token is set in defaults (set via setAuthToken)
    if (apiClient.defaults.headers && apiClient.defaults.headers.common && apiClient.defaults.headers.common.Authorization) {
      const defaultToken = apiClient.defaults.headers.common.Authorization as string;
      if (defaultToken && config.headers) {
        config.headers.Authorization = defaultToken;
        return config;
      }
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
      // Axios body may be JSON (ApiError) or HTML string from Next.js "Cannot PATCH/POST/PUT"
      const raw: unknown = error.response.data;
      const html =
        typeof raw === "string" &&
        (raw.includes("Cannot PATCH") ||
          raw.includes("Cannot POST") ||
          raw.includes("Cannot PUT"));

      if (html) {
        return Promise.reject({
          code: "API_HIT_NEXT",
          message: USER_FACING_TRY_AGAIN,
          timestamp: new Date().toISOString(),
        } as ApiError);
      }

      // Server responded with error
      const apiError: ApiError = raw as ApiError;

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
      // The calling component can handle specific error codes appropriately
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

// Utility function to create authenticated API calls
export const createAuthenticatedRequest = async () => {
  const token = await getClerkToken();
  if (!token) {
    throw new Error('No authentication token available');
  }
  return token;
};

// Alternative method for React components - use this in components that have access to useAuth
export const getTokenFromAuth = async (auth: { getToken?: () => Promise<string | null> }): Promise<string | null> => {
  try {
    if (auth && auth.getToken) {
      const token = await auth.getToken();
      return token;
    }
    return null;
  } catch {
    // Silently handle token retrieval errors
    return null;
  }
};

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
