import { ApiError } from '@/types/api.types';

/**
 * Error handling utilities for API calls
 */

export interface ErrorHandlerOptions {
  showToast?: boolean;
  redirectOnAuth?: boolean;
  fallbackMessage?: string;
}

/**
 * Handles API errors gracefully with user-friendly messages
 */
export function handleApiError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): ApiError {
  const {
    // showToast = false,
    // redirectOnAuth = false,
    fallbackMessage = 'Something went wrong. Please try again.'
  } = options;

  // If it's already an ApiError, return it
  if (error && typeof error === 'object' && 'code' in error) {
    return error as ApiError;
  }

  // Handle different error types
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || fallbackMessage,
      timestamp: new Date().toISOString(),
    };
  }

  // Fallback for unknown error types
  return {
    code: 'UNKNOWN_ERROR',
    message: fallbackMessage,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Checks if an error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    const apiError = error as ApiError;
    return apiError.code === 'UNAUTHORIZED' || apiError.code === 'could_not_authenticate_request';
  }
  return false;
}

/**
 * Checks if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    const apiError = error as ApiError;
    return apiError.code === 'NETWORK_ERROR';
  }
  return false;
}

/**
 * Gets a user-friendly error message for display
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  const apiError = handleApiError(error);
  
  switch (apiError.code) {
    case 'UNAUTHORIZED':
    case 'could_not_authenticate_request':
      return 'Please sign in to continue';
    case 'NETWORK_ERROR':
      return 'Unable to connect to server. Please check your internet connection.';
    case 'INSUFFICIENT_FUNDS':
      return 'You don\'t have enough Webya for this action';
    case 'ROOM_FULL':
      return 'This study room is at capacity';
    case 'ALREADY_REVIEWED':
      return 'You have already reviewed this session';
    default:
      return apiError.message || 'Something went wrong. Please try again.';
  }
}
