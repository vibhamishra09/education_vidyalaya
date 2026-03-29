"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { studyRoomsApi } from "@/lib/api/study-rooms.api";
import {
  extractHttpErrorMessage,
  extractNestErrorCode,
} from "@/lib/utils/error-handling";
import { Loader2 } from "lucide-react";

function parseRoomId(roomParam: string | null): string | null {
  if (!roomParam) return null;
  if (roomParam.startsWith("studyroom-")) {
    return roomParam.slice("studyroom-".length);
  }
  return roomParam;
}

const joinTokenStorageKey = (studyRoomId: string) =>
  `webinarJoinToken:${studyRoomId}`;

function resolveJoinUrl(res: { joinUrl: string }): string {
  const u = res.joinUrl;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${window.location.origin}${u.startsWith("/") ? "" : "/"}${u}`;
}

type JoinGate = "checking" | "auto_joining" | "waiting_host" | "passcode";

const POLL_MS = 5000;

export function WebinarJoinClient() {
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room");
  const tokenParam = searchParams.get("token");
  const studyRoomId = useMemo(() => parseRoomId(roomParam), [roomParam]);

  const [joinToken, setJoinToken] = useState<string | null>(null);
  const [passcode, setPasscode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [gate, setGate] = useState<JoinGate>("checking");

  useEffect(() => {
    if (!studyRoomId) return;
    const fromUrl = tokenParam?.trim();
    if (fromUrl) {
      setJoinToken(fromUrl);
      try {
        sessionStorage.setItem(joinTokenStorageKey(studyRoomId), fromUrl);
      } catch {
        // ignore
      }
      return;
    }
    try {
      const stored = sessionStorage.getItem(joinTokenStorageKey(studyRoomId));
      if (stored?.trim()) setJoinToken(stored.trim());
    } catch {
      // ignore
    }
  }, [studyRoomId, tokenParam]);

  const waitingRoomHref = studyRoomId
    ? `/webinar/waiting?room=studyroom-${studyRoomId}`
    : null;

  /** Host approved (waiting-room on): join with token only—no passcode step. */
  useEffect(() => {
    if (!studyRoomId || !joinToken) return;
    let cancelled = false;

    const run = async () => {
      setGate("checking");
      try {
        const status = await studyRoomsApi.getWebinarApprovalStatus(
          studyRoomId,
          joinToken,
        );
        if (cancelled) return;
        if (status.waitingRoomEnabled && status.canJoin) {
          setGate("auto_joining");
          setSubmitting(true);
          setError(null);
          const res = await studyRoomsApi.joinWebinarWithPasscode({
            studyRoomId,
            joinToken,
            passcode: "",
          });
          if (cancelled) return;
          window.location.href = resolveJoinUrl(res);
          return;
        }
        if (status.waitingRoomEnabled && !status.canJoin) {
          setGate("waiting_host");
          return;
        }
        setGate("passcode");
      } catch {
        if (!cancelled) setGate("passcode");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [studyRoomId, joinToken]);

  /** Poll while waiting for host approval; then token-only join. */
  useEffect(() => {
    if (gate !== "waiting_host" || !studyRoomId || !joinToken) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const status = await studyRoomsApi.getWebinarApprovalStatus(
          studyRoomId,
          joinToken,
        );
        if (cancelled) return;
        if (status.waitingRoomEnabled && status.canJoin) {
          setGate("auto_joining");
          setSubmitting(true);
          const res = await studyRoomsApi.joinWebinarWithPasscode({
            studyRoomId,
            joinToken,
            passcode: "",
          });
          if (cancelled) return;
          window.location.href = resolveJoinUrl(res);
        }
      } catch {
        // keep waiting
      }
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [gate, studyRoomId, joinToken]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyRoomId || !joinToken) return;
    setSubmitting(true);
    setError(null);
    setPendingApproval(false);
    try {
      const res = await studyRoomsApi.joinWebinarWithPasscode({
        studyRoomId,
        joinToken,
        passcode: passcode.trim(),
      });
      window.location.href = resolveJoinUrl(res);
    } catch (err: unknown) {
      const msg = extractHttpErrorMessage(
        err,
        "Could not join. Check your passcode.",
      );
      const code = extractNestErrorCode(err);
      const isPending =
        code === "WEBINAR_PENDING_APPROVAL" ||
        /not approved|approve your registration|host has not approved/i.test(
          msg,
        );
      setPendingApproval(isPending);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!studyRoomId) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/20">
        <Navigation />
        <main className="flex-1 container max-w-lg mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">
            Missing room. Open the join link from your registration email, or use{" "}
            <code className="text-xs bg-muted px-1 rounded">
              ?room=studyroom-…
            </code>
            .
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!joinToken) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/20">
        <Navigation />
        <main className="flex-1 container max-w-md mx-auto px-4 py-10 md:py-16">
          <div className="mb-8 text-center space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Webinar
            </p>
            <h1 className="text-2xl font-bold mt-1">Personal join link required</h1>
            <p className="text-sm text-muted-foreground">
              Open the full link from your confirmation email (it includes a private
              token).
            </p>
          </div>
          <div className="rounded-2xl border bg-background p-6 shadow-sm space-y-4 text-sm text-muted-foreground">
            <p>
              If you lost the email, ask the host to resend your confirmation or
              check your spam folder.
            </p>
            {waitingRoomHref && (
              <Button variant="secondary" className="w-full" asChild>
                <Link href={waitingRoomHref}>Waiting room</Link>
              </Button>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (gate === "checking" || gate === "auto_joining") {
    return (
      <div className="min-h-screen flex flex-col bg-muted/20">
        <Navigation />
        <main className="flex-1 container max-w-md mx-auto px-4 py-10 md:py-16 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            {gate === "auto_joining" ? "Joining…" : "Loading…"}
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  if (gate === "waiting_host") {
    return (
      <div className="min-h-screen flex flex-col bg-muted/20">
        <Navigation />
        <main className="flex-1 container max-w-md mx-auto px-4 py-10 md:py-16">
          <div className="rounded-2xl border bg-card p-8 text-center space-y-4 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Webinar
            </p>
            <h1 className="text-2xl font-semibold">Waiting for host&apos;s approval</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Stay on this page. When the host admits you, you&apos;ll join
              automatically—no passcode needed.
            </p>
            <div className="flex justify-center py-2">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Navigation />
      <main className="flex-1 container max-w-md mx-auto px-4 py-10 md:py-16">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Webinar
          </p>
          <h1 className="text-2xl font-bold mt-1">Join with passcode</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Enter the passcode from your confirmation email.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border bg-background p-6 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="wj-pass">Passcode</Label>
            <Input
              id="wj-pass"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
          </div>
          {error && (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              {pendingApproval && waitingRoomHref && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    Waiting for host
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Open the waiting page until the host admits you.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-2 w-full"
                    asChild
                  >
                    <Link href={waitingRoomHref}>Open waiting page</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Joining…
              </>
            ) : (
              "Join webinar"
            )}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
