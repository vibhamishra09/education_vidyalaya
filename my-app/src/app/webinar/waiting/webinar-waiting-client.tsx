"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

function parseRoomId(roomParam: string | null): string | null {
  if (!roomParam) return null;
  if (roomParam.startsWith("studyroom-")) {
    return roomParam.slice("studyroom-".length);
  }
  return roomParam;
}

const joinTokenStorageKey = (studyRoomId: string) =>
  `webinarJoinToken:${studyRoomId}`;

export function WebinarWaitingClient() {
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room");
  const studyRoomId = useMemo(() => parseRoomId(roomParam), [roomParam]);

  const [joinHrefFromStorage, setJoinHrefFromStorage] = useState<string | null>(
    null,
  );
  useEffect(() => {
    if (!studyRoomId) return;
    try {
      const token = sessionStorage.getItem(joinTokenStorageKey(studyRoomId));
      if (token?.trim()) {
        setJoinHrefFromStorage(
          `/webinar/join?room=studyroom-${studyRoomId}&token=${encodeURIComponent(token.trim())}`,
        );
      }
    } catch {
      // ignore
    }
  }, [studyRoomId]);

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
            <p className="text-sm text-muted-foreground leading-relaxed">
              You&apos;ve registered. Check your email for your{" "}
              <strong>personal join link</strong> and <strong>unique passcode</strong>.
            </p>
          </div>

          <ol className="text-sm text-foreground/90 space-y-3 list-decimal pl-5 border-l-2 border-muted ml-1">
            <li>Open the <strong>join link</strong> from your confirmation email (it&apos;s unique to you).</li>
            <li>
              Enter your <strong>passcode</strong> on the join page—no need to type
              your name or email again.
            </li>
          </ol>

          {joinHrefFromStorage ? (
            <Button asChild className="w-full" size="lg">
              <Link href={joinHrefFromStorage}>Go to join page</Link>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              Use the personalized link from your registration email. It looks like{" "}
              <code className="text-xs bg-muted px-1 rounded">
                …/webinar/join?room=studyroom-…&amp;token=…
              </code>
              . If you already opened it once on this device, the button may appear
              here.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
