import type { Metadata } from "next";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your personalized learning dashboard. Track your sessions, manage requests, view achievements, and monitor your learning progress on Webyalaya.",
  keywords: [
    "learning dashboard",
    "session management",
    "learning progress",
    "study tracker",
    "achievements",
    "peer sessions",
  ],
  openGraph: {
    title: "Dashboard | Webyalaya",
    description: "Track your learning journey with your personalized dashboard.",
    url: "/dashboard",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Dashboard | Webyalaya",
    description: "Track your learning journey with your personalized dashboard.",
  },
  robots: {
    index: false, // Dashboard is private content
    follow: true,
  },
  alternates: {
    canonical: "/dashboard",
  },
};

export default function DashboardPage() {
  return <DashboardClient />;
}
