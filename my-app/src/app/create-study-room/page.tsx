import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateStudyRoomClient } from "./create-study-room-client";

export const metadata: Metadata = {
  title: "Create Study Room",
  description: "Host a group learning session on We. Set your topic, schedule, and participant limit to start teaching and earning We coins.",
  keywords: [
    "create study room",
    "host study session",
    "online tutoring",
    "group learning",
    "teach online",
    "peer teaching",
    "study group",
  ],
  openGraph: {
    title: "Create Study Room | We",
    description: "Host a group learning session and share your knowledge with peers.",
    url: "/create-study-room",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Create Study Room | We",
    description: "Host a group learning session and share your knowledge.",
  },
  robots: {
    index: false, // Form page, no need to index
    follow: true,
  },
  alternates: {
    canonical: "/create-study-room",
  },
};

export default function CreateStudyRoomPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-muted-foreground text-sm">Loading…</div>}>
      <CreateStudyRoomClient />
    </Suspense>
  );
}
