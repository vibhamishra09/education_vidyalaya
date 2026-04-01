import type { NextConfig } from "next";

function getHostname(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  try {
    return new URL(trimmed).hostname;
  } catch {
    return trimmed.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

/**
 * Nest API target for same-origin /api/* rewrites (when the browser hits localhost:3000/api/...).
 * Use BACKEND_URL so this is never confused with the Next site URL; do not omit on Vercel if you rely on rewrites.
 */
const backendOrigin =
  process.env.BACKEND_URL?.trim().replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ||
  "http://127.0.0.1:3001";

const allowedDevOrigins = Array.from(
  new Set(
    [
      "localhost",
      "127.0.0.1",
      getHostname(process.env.NEXT_PUBLIC_SITE_URL),
      getHostname(process.env.NEXT_PUBLIC_API_URL),
      getHostname(process.env.NEXT_PUBLIC_CHAT_WS_URL),
      ...(process.env.ALLOWED_DEV_ORIGINS
        ?.split(",")
        .map((origin) => getHostname(origin))
        .filter(Boolean) ?? []),
    ].filter((value): value is string => Boolean(value)),
  ),
);

const nextConfig: NextConfig = {
  allowedDevOrigins,
  /**
   * Forward /api/* to Nest so browser calls like PATCH /api/peer-sessions/:id work when
   * NEXT_PUBLIC_API_URL is empty or matches the site origin (same-origin + Bearer token).
   * Infra (e.g. Lightsail) can still route /api to the API directly in production; this
   * mainly fixes local dev and any setup where traffic hits Next first.
   */
  /**
   * Use `fallback` rewrites so existing App Route handlers (e.g.
   * `app/api/peer-sessions/[sessionId]`) run first. A flat array rewrites
   * `/api/*` before matching those routes, so PATCH never reached the proxy.
   */
  async rewrites() {
    return {
      fallback: [
        {
          source: "/api/:path*",
          destination: `${backendOrigin}/api/:path*`,
        },
      ],
    };
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "webyalaya-dev-media.s3.us-west-2.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "webyalaya-test-media-namaste.s3.us-west-2.amazonaws.com",
      },
    ],
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;
