import { NextRequest, NextResponse } from "next/server";
import { getBackendUrlForServer } from "@/lib/server-backend-url";
import { USER_FACING_TRY_AGAIN } from "@/lib/utils/error-handling";

/**
 * Proxies GET/PATCH /api/peer-sessions/:id to Nest so updates work when:
 * - next.config rewrites point at the wrong host (e.g. default 127.0.0.1 on Vercel), or
 * - rewrites do not apply as expected for some deployments.
 *
 * Sub-routes (/accept, /status, …) are not handled here and still use rewrites or direct API URL.
 */
export const dynamic = "force-dynamic";

function targetUrl(sessionId: string, search: string): string {
  const base = getBackendUrlForServer();
  const q = search || "";
  return `${base}/api/peer-sessions/${encodeURIComponent(sessionId)}${q}`;
}

function hopHeaders(req: NextRequest): Headers {
  const h = new Headers();
  const auth = req.headers.get("authorization");
  if (auth) {
    h.set("authorization", auth);
  }
  const ct = req.headers.get("content-type");
  if (ct) {
    h.set("content-type", ct);
  }
  const accept = req.headers.get("accept");
  if (accept) {
    h.set("accept", accept);
  }
  return h;
}

async function toNextResponse(upstream: Response): Promise<NextResponse> {
  const body = await upstream.arrayBuffer();
  const res = new NextResponse(body, { status: upstream.status });
  const ct = upstream.headers.get("content-type");
  if (ct) {
    res.headers.set("content-type", ct);
  }
  return res;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await ctx.params;
  const url = targetUrl(sessionId, new URL(req.url).search);
  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: hopHeaders(req),
      cache: "no-store",
    });
    return toNextResponse(upstream);
  } catch (e) {
    console.error("[peer-sessions proxy] GET failed:", url, e);
    return NextResponse.json(
      { message: USER_FACING_TRY_AGAIN, statusCode: 502 },
      { status: 502 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await ctx.params;
  const url = targetUrl(sessionId, new URL(req.url).search);
  const payload = await req.text();
  try {
    const upstream = await fetch(url, {
      method: "PATCH",
      headers: hopHeaders(req),
      body: payload.length > 0 ? payload : undefined,
      cache: "no-store",
    });
    return toNextResponse(upstream);
  } catch (e) {
    console.error("[peer-sessions proxy] PATCH failed:", url, e);
    return NextResponse.json(
      { message: USER_FACING_TRY_AGAIN, statusCode: 502 },
      { status: 502 },
    );
  }
}
