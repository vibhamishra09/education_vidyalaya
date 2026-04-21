import type { Metadata } from "next";
import { OfflineClient } from "./offline-client";

export const metadata: Metadata = {
  title: "Offline | We",
  description: "You're currently offline. We works best when you're connected to the internet. Please check your connection and try again.",
  robots: {
    index: false,
    follow: false,
  },
};

// Force dynamic rendering to skip prerendering
export const dynamic = 'force-dynamic';

export default function OfflinePage() {
  return <OfflineClient />;
}
