import { Suspense } from "react";
import { WebinarWaitingClient } from "./webinar-waiting-client";

export default function WebinarWaitingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
          Loading…
        </div>
      }
    >
      <WebinarWaitingClient />
    </Suspense>
  );
}
