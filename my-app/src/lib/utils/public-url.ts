/**
 * Backend join/registration responses may omit FRONTEND_URL and return path-only URLs.
 * Same-origin links work in the current tab; this makes hrefs copy/paste and new-tab safe.
 */
export function toAbsoluteAppUrl(href: string | undefined | null): string {
  if (!href) return "";
  const h = href.trim();
  if (h.startsWith("http://") || h.startsWith("https://")) return h;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${h.startsWith("/") ? "" : "/"}${h}`;
  }
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "";
  return base ? `${base}${h.startsWith("/") ? "" : "/"}${h}` : h;
}
