"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { studyRoomsApi } from "@/lib/api/study-rooms.api";
import { Clock, Loader2 } from "lucide-react";

function parseRoomId(roomParam: string | null): string | null {
  if (!roomParam) return null;
  if (roomParam.startsWith("studyroom-")) {
    return roomParam.slice("studyroom-".length);
  }
  return roomParam;
}

const joinTokenStorageKey = (studyRoomId: string) =>
  `webinarJoinToken:${studyRoomId}`;

const POLL_MS = 5000;

function resolveJoinUrl(res: { joinUrl: string }): string {
  const u = res.joinUrl;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${window.location.origin}${u.startsWith("/") ? "" : "/"}${u}`;
}

export function WebinarWaitingClient() {
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room");
  const studyRoomId = useMemo(() => parseRoomId(roomParam), [roomParam]);

  const [joinToken, setJoinToken] = useState<string | null>(null);
  const [phase, setPhase] = useState<
    | "loading"
    | "no_token"
    | "pending"
    | "ready"
    | "use_email_passcode"
    | "error"
  >("loading");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!studyRoomId) {
      setPhase("no_token");
      return;
    }
    try {
      const stored = sessionStorage.getItem(joinTokenStorageKey(studyRoomId));
      if (stored?.trim()) {
        setJoinToken(stored.trim());
      } else {
        setPhase("no_token");
      }
    } catch {
      setPhase("no_token");
    }
  }, [studyRoomId]);

  useEffect(() => {
    if (!studyRoomId || !joinToken) return;

    let cancelled = false;

    const tick = async () => {
      try {
        const res = await studyRoomsApi.getWebinarApprovalStatus(
          studyRoomId,
          joinToken,
        );
        if (cancelled) return;
        if (res.waitingRoomEnabled) {
          if (res.canJoin) {
            setPhase("ready");
          } else {
            setPhase("pending");
          }
        } else {
          // No waiting room: join still requires passcode on /webinar/join
          setPhase("use_email_passcode");
        }
      } catch {
        if (!cancelled) setPhase("error");
      }
    };

    setPhase("loading");
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [studyRoomId, joinToken]);

  const onJoin = async () => {
    if (!studyRoomId || !joinToken) return;
    setJoining(true);
    setJoinError(null);
    try {
      const res = await studyRoomsApi.joinWebinarWithPasscode({
        studyRoomId,
        joinToken,
        passcode: "",
      });
      window.location.href = resolveJoinUrl(res);
    } catch {
      setJoinError("Could not start the session. Try again.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Navigation />
      <main className="flex-1 container max-w-lg mx-auto px-4 py-10 md:py-16">
        <div className="rounded-2xl border bg-card p-8 space-y-6 shadow-sm">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Clock className="h-7 w-7 text-amber-600" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Webinar
            </p>
            <h1 className="text-2xl font-semibold">Waiting for the host</h1>
          </div>

          {!studyRoomId && (
            <p className="text-sm text-muted-foreground text-center">
              Missing room in the link. Open the waiting page from your
              registration flow.
            </p>
          )}

          {studyRoomId && phase === "no_token" && (
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              We couldn&apos;t find your session on this device. Register again
              from the webinar link, or open this page in the same browser you
              used after signing up so we can check approval.
            </p>
          )}

          {studyRoomId && phase === "loading" && joinToken && (
            <div className="flex flex-col items-center gap-3 py-4 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
              <p className="text-sm">Checking…</p>
            </div>
          )}

          {studyRoomId && phase === "pending" && (
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              Waiting for host&apos;s approval.
            </p>
          )}

          {studyRoomId && phase === "ready" && joinToken && (
            <div className="space-y-3">
              {joinError && (
                <p className="text-sm text-destructive text-center">{joinError}</p>
              )}
              <Button
                className="w-full"
                size="lg"
                disabled={joining}
                onClick={() => void onJoin()}
              >
                {joining ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                    Joining…
                  </>
                ) : (
                  "Join webinar"
                )}
              </Button>
            </div>
          )}

          {studyRoomId && phase === "use_email_passcode" && joinToken && (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Open the join link in your confirmation email and enter your
                passcode there.
              </p>
              <Button asChild className="w-full" size="lg" variant="secondary">
                <Link
                  href={`/webinar/join?room=studyroom-${studyRoomId}&token=${encodeURIComponent(joinToken)}`}
                >
                  Open join page
                </Link>
              </Button>
            </div>
          )}

          {studyRoomId && phase === "error" && (
            <p className="text-sm text-destructive text-center">
              Couldn&apos;t check approval status. Refresh the page or try again
              shortly.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
