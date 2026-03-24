/**
 * Base URL for server-side fetch to Nest (Route Handlers, Server Actions).
 * Prefer BACKEND_URL (same as next.config rewrites). Avoid relying on the browser
 * origin as the API host when NEXT_PUBLIC_API_URL equals the Next app URL.
 */
export function getBackendUrlForServer(): string {
  const fromBackend = process.env.BACKEND_URL?.trim().replace(/\/$/, "");
  if (fromBackend) {
    return fromBackend;
  }
  const fromPublic = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ?? "";
  if (fromPublic) {
    return fromPublic;
  }
  return "http://127.0.0.1:3001";
}
