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

/** Shown for infra/config issues, HTML errors, or raw paths — never stack traces or env names. */
export const USER_FACING_TRY_AGAIN =
  "Something went wrong and we couldn’t complete that. Please try again in a moment.";

export const USER_FACING_CONNECTION =
  "We couldn’t connect. Check your internet connection and try again.";

/**
 * Strip technical API/Next messages before showing in toasts or page copy.
 */
export function sanitizeUserFacingApiMessage(
  raw: string | undefined | null,
  fallback: string,
): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) {
    return fallback;
  }
  if (/^network error$/i.test(s)) {
    return USER_FACING_CONNECTION;
  }
  if (/cannot\s+patch|cannot\s+post|cannot\s+put|cannot\s+delete/i.test(s)) {
    return USER_FACING_TRY_AGAIN;
  }
  if (/^\/api\//.test(s) || /\s\/api\/[^\s]+/.test(s)) {
    return USER_FACING_TRY_AGAIN;
  }
  if (/BACKEND_URL|NEXT_PUBLIC_API|Nest\.js|Next\.js server|Vercel.*API host/i.test(s)) {
    return USER_FACING_TRY_AGAIN;
  }
  if (/could not reach the api server|is nest running|Set BACKEND_URL/i.test(s)) {
    return USER_FACING_TRY_AGAIN;
  }
  if (/request failed with status code\s+\d+/i.test(s)) {
    return USER_FACING_TRY_AGAIN;
  }
  return s;
}

/**
 * Normalize NestJS `message` (string, string[], or class-validator objects).
 */
function normalizeNestMessageField(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  // Nest BadRequestException({ code, message }) sometimes serializes as message: { message: '...' }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const inner = (value as { message?: unknown }).message;
    if (typeof inner === 'string' && inner.trim()) {
      return inner.trim();
    }
  }
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }
  const parts: string[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      parts.push(item);
    } else if (item && typeof item === 'object' && 'constraints' in item) {
      const c = (item as { constraints?: Record<string, string> }).constraints;
      if (c && typeof c === 'object') {
        parts.push(...Object.values(c));
      }
    }
  }
  const out = parts.join(' ').trim();
  return out || undefined;
}

/**
 * Readable message from axios/Nest/react-query rejections (our interceptor often rejects plain `{ message }`).
 */
export function extractHttpErrorMessage(err: unknown, fallback: string): string {
  let raw = fallback;

  if (typeof err === 'string' && err.trim()) {
    raw = err.trim();
  } else if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    const fromRoot = normalizeNestMessageField(o.message);
    if (fromRoot) {
      raw = fromRoot;
    } else {
      const resp = o.response as { data?: unknown } | undefined;
      const data = resp?.data;
      if (data && typeof data === 'object' && data !== null) {
        const fromData = normalizeNestMessageField(
          (data as Record<string, unknown>).message,
        );
        if (fromData) {
          raw = fromData;
        }
      }
    }
  } else if (err instanceof Error && err.message) {
    raw = err.message;
  }

  return sanitizeUserFacingApiMessage(raw, fallback);
}

/** Nest exception JSON body: `{ message: string | string[] }` from `response.json()`. */
export function messageFromNestJsonBody(
  payload: unknown,
  fallback: string,
): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }
  const m = (payload as { message?: unknown }).message;
  if (typeof m === 'string' && m.trim()) {
    return sanitizeUserFacingApiMessage(m.trim(), fallback);
  }
  if (Array.isArray(m) && m.length > 0) {
    const parts = m.map((x) => String(x)).filter(Boolean);
    const joined = parts.join(' ') || fallback;
    return sanitizeUserFacingApiMessage(joined, fallback);
  }
  return fallback;
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
      return 'You don\'t have enough Coins for this action';
    case 'ROOM_FULL':
      return 'This study room is at capacity';
    case 'ALREADY_REVIEWED':
      return 'You have already reviewed this session';
    default:
      return sanitizeUserFacingApiMessage(
        apiError.message,
        'Something went wrong. Please try again.',
      );
  }
}
