import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  
  // Try to fetch user data for dynamic metadata
  let userName = "User";
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const response = await fetch(`${baseUrl}/api/users/${userId}/public`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });
    
    if (response.ok) {
      const userData = await response.json();
      userName = userData.name || "User";
    }
  } catch (error) {
    // Fallback to default if fetch fails
    console.error("Error fetching user for metadata:", error);
  }

  return {
    title: `${userName}'s Profile | Webyalaya`,
    description: `View ${userName}'s profile on Webyalaya. See their skills, ratings, reviews, and upcoming study rooms. Connect with peers for peer-to-peer learning.`,
    keywords: [
      "user profile",
      "peer profile",
      "tutor profile",
      "learner profile",
      "webyalaya profile",
      "peer learning",
    ],
    openGraph: {
      title: `${userName}'s Profile | Webyalaya`,
      description: `View ${userName}'s profile and connect for peer-to-peer learning.`,
      url: `/profile/${userId}`,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `${userName}'s Profile | Webyalaya`,
      description: `View ${userName}'s profile and connect for peer-to-peer learning.`,
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `/profile/${userId}`,
    },
  };
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
