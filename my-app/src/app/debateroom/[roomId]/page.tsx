import type { Metadata } from "next";
import DebateRoomClient from './debate-room-client';

// Fetch debate room data for metadata
async function getDebateRoomData(roomId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const response = await fetch(`${baseUrl}/api/debate-rooms/${roomId}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });
    
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error("Error fetching debate room for metadata:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roomId: string }>;
}): Promise<Metadata> {
  const { roomId } = await params;
  const room = await getDebateRoomData(roomId);

  if (!room) {
    return {
      title: "Debate Room | Webyalaya",
      description: "Join a structured debate on Webyalaya.",
    };
  }

  return {
    title: `${room.topic} | Debate Room | Webyalaya`,
    description: room.description || `Join the debate: ${room.topic}. Improve your argumentation skills with peers on Webyalaya.`,
    keywords: [
      "debate",
      "argumentation",
      "discussion",
      "peer debate",
      "intellectual discourse",
    ],
    openGraph: {
      title: `${room.topic} | Debate Room | Webyalaya`,
      description: room.description || `Join the debate: ${room.topic}`,
      url: `/debate-rooms/${roomId}`,
      type: "website",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: room.topic,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${room.topic} | Debate Room | Webyalaya`,
      description: room.description || `Join the debate: ${room.topic}`,
      images: ["/og-image.png"],
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `/debate-rooms/${roomId}`,
    },
  };
}

// Page component (Server Component that renders Client Component)
export default async function DebateRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  
  return <DebateRoomClient roomId={roomId} />;
}
