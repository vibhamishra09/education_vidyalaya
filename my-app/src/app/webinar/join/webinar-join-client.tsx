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

export function WebinarJoinClient() {
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room");
  const tokenParam = searchParams.get("token");
  const studyRoomId = useMemo(() => parseRoomId(roomParam), [roomParam]);

  const [joinToken, setJoinToken] = useState<string | null>(null);
  const [passcode, setPasscode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const waitingRoomHref =
    studyRoomId && joinToken
      ? `/webinar/waiting?room=studyroom-${studyRoomId}&token=${encodeURIComponent(joinToken)}`
      : studyRoomId
        ? `/webinar/waiting?room=studyroom-${studyRoomId}`
        : null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyRoomId || !joinToken) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await studyRoomsApi.joinWebinarWithPasscode({
        studyRoomId,
        joinToken,
        passcode: passcode.trim(),
      });
      window.location.assign(
        res.joinUrl.startsWith("http://") || res.joinUrl.startsWith("https://")
          ? res.joinUrl
          : `${window.location.origin}${res.joinUrl.startsWith("/") ? "" : "/"}${res.joinUrl}`,
      );
    } catch (err: unknown) {
      const code = extractNestErrorCode(err);
      const msg = extractHttpErrorMessage(err, "");
      const isPending =
        code === "WEBINAR_PENDING_APPROVAL" ||
        /not approved your registration|host admits you|WEBINAR_PENDING/i.test(
          msg,
        );
      if (isPending && waitingRoomHref) {
        window.location.assign(waitingRoomHref);
        return;
      }
      setError(
        extractHttpErrorMessage(
          err,
          "Could not continue. Check your passcode and try again.",
        ),
      );
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
            Missing room. Open the link from your confirmation email, or use{" "}
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
            <h1 className="text-2xl font-bold mt-1">Personal link required</h1>
            <p className="text-sm text-muted-foreground">
              Open the full link from your confirmation email (it includes your
              access token).
            </p>
          </div>
          <div className="rounded-2xl border bg-background p-6 shadow-sm space-y-4 text-sm text-muted-foreground">
            <p>
              Use the full <strong className="text-foreground">Join webinar</strong> link from
              your confirmation email (it includes a private token). If you lost the email, ask
              the host to resend it or check your spam folder.
            </p>
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
        <div className="mb-8 text-center space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Webinar
          </p>
          <h1 className="text-2xl font-bold mt-1">Enter passcode</h1>
          <p className="text-sm text-muted-foreground">
            Use the code from your confirmation email. If the host uses a
            waiting room, you&apos;ll go there next—then tap Join when
            you&apos;re admitted.
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
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Continue…
              </>
            ) : (
              "Continue"
            )}
          </Button>
          {waitingRoomHref && (
            <p className="text-center text-sm text-muted-foreground pt-1">
              <Link href={waitingRoomHref} className="text-primary underline-offset-4 hover:underline">
                Already entered your passcode? Open waiting room
              </Link>
            </p>
          )}
        </form>
      </main>
      <Footer />
    </div>
  );
}
