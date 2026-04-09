import { API_CONFIG } from "./api-config";

/**
 * Base URL for server-side fetch to Nest (Route Handlers, Server Actions).
 * Prefer BACKEND_URL (same as next.config rewrites). Avoid relying on the browser
 * origin as the API host when NEXT_PUBLIC_API_URL equals the Next app URL.
 */
export function getBackendUrlForServer(): string {
  return API_CONFIG.getApiUrl();
}
