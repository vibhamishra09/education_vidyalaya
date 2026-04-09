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
 * Same idea as `api-client` `looksLikeWebyalayaMarketingOrigin`: the public homepage is not the Nest API.
 * In dev, using it as NEXT_PUBLIC_API_URL would make /api/* rewrites hit webyalaya.com → 404 on /api/livekit/token.
 */
function looksLikeWebyalayaMarketingOrigin(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./i, "");
    return host === "webyalaya.com" && (u.pathname === "" || u.pathname === "/");
  } catch {
    return false;
  }
}

const resolvedPublicApi =
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ?? "";
const publicApiForRewrites =
  process.env.NODE_ENV === "development" &&
  resolvedPublicApi &&
  looksLikeWebyalayaMarketingOrigin(resolvedPublicApi)
    ? ""
    : resolvedPublicApi;

/**
 * Nest API target for same-origin /api/* rewrites (when the browser hits localhost:3000/api/...).
 * Prefer BACKEND_URL; do not rely on NEXT_PUBLIC_API_URL alone in dev (often set to the marketing site).
 */
const backendOrigin =
  process.env.API_URL?.trim().replace(/\/$/, "") ||
  process.env.BACKEND_URL?.trim().replace(/\/$/, "") ||
  publicApiForRewrites ||
  "http://127.0.0.1:3002";

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
        /**
         * Socket.IO (chat, etc.) runs on Nest. When the client uses same-origin
         * (e.g. `getSocketIoBaseUrl()` → `window.location.origin` because env was unset at build),
         * forward `/socket.io` to the API so the browser does not hit Next (which has no WS gateway).
         */
        {
          source: "/socket.io/:path*",
          destination: `${backendOrigin}/socket.io/:path*`,
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
