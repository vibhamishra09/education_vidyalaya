import type { Metadata } from "next";
import { ProfileClient } from "./profile-client";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Manage your We profile. Update your skills, view sessions, track earnings, and manage your learning preferences.",
  keywords: [
    "profile",
    "tutor profile",
    "skills",
    "learning preferences",
    "session history",
    "wallet",
    "Coins balance",
  ],
  openGraph: {
    title: "My Profile | We",
    description: "Manage your profile, skills, and learning journey on We.",
    url: "/profile",
    type: "profile",
  },
  twitter: {
    card: "summary",
    title: "My Profile | We",
    description: "Manage your profile and learning journey.",
  },
  robots: {
    index: false, // Profile is private content
    follow: true,
  },
  alternates: {
    canonical: "/profile",
  },
};

export default function ProfilePage() {
  return <ProfileClient />;
}
