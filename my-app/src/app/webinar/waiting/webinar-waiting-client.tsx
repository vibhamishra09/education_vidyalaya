"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Clock, Mail } from "lucide-react";

function parseRoomId(roomParam: string | null): string | null {
  if (!roomParam) return null;
  if (roomParam.startsWith("studyroom-")) {
    return roomParam.slice("studyroom-".length);
  }
  return roomParam;
}

export function WebinarWaitingClient() {
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room");
  const studyRoomId = useMemo(() => parseRoomId(roomParam), [roomParam]);

  const joinHref =
    studyRoomId !== null
      ? `/webinar/join?room=studyroom-${studyRoomId}`
      : null;

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
              You&apos;ve registered. The host must approve you before you can join
              the live session. Check your email for your{" "}
              <strong>unique passcode</strong> and the <strong>join link</strong>.
            </p>
          </div>

          <ol className="text-sm text-foreground/90 space-y-3 list-decimal pl-5 border-l-2 border-muted ml-1">
            <li>Open the join link from your confirmation email (or below).</li>
            <li>
              Enter the same <strong>full name</strong> and <strong>email</strong>{" "}
              you used to register, plus your <strong>passcode</strong>.
            </li>
            <li>
              After the host admits you, you&apos;ll enter the webinar. If you see
              an error, wait a moment and try again.
            </li>
          </ol>

          {joinHref ? (
            <Button asChild className="w-full" size="lg">
              <Link href={joinHref}>Go to join page</Link>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              Open the join link from your registration email. It looks like{" "}
              <code className="text-xs bg-muted px-1 rounded">
                …/webinar/join?room=studyroom-…
              </code>
            </p>
          )}

          <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <Mail className="h-5 w-5 shrink-0 mt-0.5" />
            <p>
              When you&apos;re approved, you may get a second email. You can also
              bookmark this page and return to the join link anytime.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
