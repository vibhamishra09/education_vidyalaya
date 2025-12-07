import type { Metadata } from "next";
import { Suspense } from "react";
import { OnboardingClient } from "./onboarding-client";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Complete Your Profile",
  description: "Set up your Webyalaya profile to start learning and teaching. Add your skills, interests, and preferences to connect with the right peers.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/onboarding",
  },
};

function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-background to-secondary-50 dark:from-gray-900 dark:via-background dark:to-gray-800 flex items-center justify-center p-4">
      <div className="flex items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading...</span>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingLoading />}>
      <OnboardingClient />
    </Suspense>
  );
}
