import type { WebinarPublicMetadata } from "@/lib/api/study-rooms.api";

import { API_CONFIG } from "../api-config";

/**
 * Server-only fetch for webinar registration metadata. Runs during RSC render so the
 * registration page does not wait for hydration + a second client round-trip.
 */
export async function getWebinarPublicMetadata(
  slug: string,
): Promise<{ ok: true; data: WebinarPublicMetadata } | { ok: false }> {
  const base = API_CONFIG.getApiUrl();
  try {
    const url = `${base}/api/study-rooms/webinar/public/${encodeURIComponent(slug)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as WebinarPublicMetadata;
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}
