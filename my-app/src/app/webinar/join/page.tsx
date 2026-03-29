import { Suspense } from "react";
import { WebinarJoinClient } from "./webinar-join-client";

export default function WebinarJoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
          Loading…
        </div>
      }
    >
      <WebinarJoinClient />
    </Suspense>
  );
}
