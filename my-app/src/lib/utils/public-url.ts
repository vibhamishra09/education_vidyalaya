/**
 * Public site origin for registration / share link **display** only (copy-paste, not API calls).
 * API traffic uses NEXT_PUBLIC_API_URL in api-client.ts — keep that pointed at Nest for local dev.
 */
const DEFAULT_PUBLIC_APP_ORIGIN = "https://webyalaya.com";

function isLocalDevOrigin(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

export function getPublicAppOrigin(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL?.trim(),
    process.env.NEXT_PUBLIC_SITE_URL?.trim(),
  ].filter((s): s is string => Boolean(s));

  for (const fromEnv of candidates) {
    if (!/^https?:\/\//i.test(fromEnv)) continue;
    const normalized = fromEnv.replace(/\/$/, "");
    if (isLocalDevOrigin(normalized) && process.env.NODE_ENV === "production") {
      continue;
    }
    return normalized;
  }
  return DEFAULT_PUBLIC_APP_ORIGIN;
}

/**
 * Backend join/registration responses may omit FRONTEND_URL and return path-only URLs.
 * Same-origin links work in the current tab; this makes hrefs copy/paste and new-tab safe.
 */
export function toAbsoluteAppUrl(href: string | undefined | null): string {
  if (!href) return "";
  const h = href.trim();
  if (h.startsWith("http://") || h.startsWith("https://")) return h;
  const origin = getPublicAppOrigin();
  return `${origin}${h.startsWith("/") ? "" : "/"}${h}`;
}
