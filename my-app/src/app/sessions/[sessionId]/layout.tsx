import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<Metadata> {
  const { sessionId } = await params;

  // Try to fetch session data for dynamic metadata
  let sessionTitle = "Peer Session";
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const response = await fetch(`${baseUrl}/api/peer-sessions/${sessionId}`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });
    
    if (response.ok) {
      const sessionData = await response.json();
      sessionTitle = sessionData.title || "Peer Session";
    }
  } catch (error) {
    // Fallback to default if fetch fails
    console.error("Error fetching session for metadata:", error);
  }

  return {
    title: `${sessionTitle} | Peer Session | We`,
    description: `View and manage your peer session on We. Connect with peers for one-on-one learning sessions.`,
    robots: {
      index: false, // Sessions are private
      follow: false,
    },
  };
}

export default function SessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
