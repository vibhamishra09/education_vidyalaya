import { Suspense } from "react";
import type { Metadata } from "next";
import { NotificationsClient } from "./notifications-client";

export const metadata: Metadata = {
  title: "Notifications",
  description: "View and manage your Webyalaya notifications. Stay updated on session requests, reviews, and more.",
  robots: {
    index: false,
    follow: false,
  },
};

function NotificationsLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="h-16 border-b bg-background/95" />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading notifications...</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<NotificationsLoading />}>
      <NotificationsClient />
    </Suspense>
  );
}
