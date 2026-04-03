import type { WebinarPublicMetadata } from "@/lib/api/study-rooms.api";

/**
 * Server-only fetch for webinar registration metadata. Runs during RSC render so the
 * registration page does not wait for hydration + a second client round-trip.
 */
export async function getWebinarPublicMetadata(
  slug: string,
): Promise<{ ok: true; data: WebinarPublicMetadata } | { ok: false }> {
  const base =
    process.env.BACKEND_URL?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ||
    "http://127.0.0.1:3002";
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
