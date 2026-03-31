import Constants from 'expo-constants';
import { Platform } from 'react-native';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function getHostUri() {
  const expoConfig = Constants.expoConfig as { hostUri?: string } | null | undefined;
  const manifest2 = Constants.manifest2 as
    | { extra?: { expoClient?: { hostUri?: string } } }
    | null
    | undefined;
  const manifest = Constants.manifest as { hostUri?: string } | null | undefined;

  return (
    expoConfig?.hostUri ||
    manifest2?.extra?.expoClient?.hostUri ||
    manifest?.hostUri ||
    null
  );
}

function inferBaseUrlFromHostUri() {
  const hostUri = getHostUri();

  if (!hostUri) {
    return null;
  }

  const host = hostUri.split(':')[0];
  if (!host) {
    return null;
  }

  return `http://${host}:3001`;
}

function isLoopbackBaseUrl(rawUrl: string) {
  try {
    const { hostname } = new URL(rawUrl);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '10.0.2.2';
  } catch {
    return false;
  }
}

export function getApiBaseUrl() {
  const envBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const inferredBaseUrl = inferBaseUrlFromHostUri();

  if (envBaseUrl) {
    const normalizedEnvBaseUrl = envBaseUrl.replace(/\/$/, '');

    // On a physical device, `localhost` points to the device itself, not the dev machine.
    // Prefer Expo's host IP when the configured URL is loopback-based.
    if (isLoopbackBaseUrl(normalizedEnvBaseUrl) && inferredBaseUrl) {
      return inferredBaseUrl;
    }

    return normalizedEnvBaseUrl;
  }

  if (inferredBaseUrl) {
    return inferredBaseUrl;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001';
  }

  return 'http://localhost:3001';
}

function buildHeaders(headers?: HeadersInit) {
  return new Headers({
    Accept: 'application/json',
    ...Object.fromEntries(new Headers(headers).entries()),
  });
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = buildHeaders(init.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : null) ||
      (typeof data === 'string' && data) ||
      `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
