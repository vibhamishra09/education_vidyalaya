import type { Metadata } from "next";
import StudyRoomClient from "./study-room-client";

// Type for skill in API response
interface SkillData {
  name?: string;
  skill?: { name: string };
}

// Type for study room API response
interface StudyRoomData {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  date: string;
  duration: number;
  maxParticipants: number;
  participantCount?: number;
  createdBy?: {
    id: string;
    name: string;
    avatar?: string;
  };
  skills?: SkillData[];
  slug: string
}

// Server-side function to fetch room data for metadata
async function getStudyRoomData(roomId: string): Promise<StudyRoomData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const response = await fetch(`${baseUrl}/api/study-rooms/${roomId}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });
    
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error("Error fetching study room for metadata:", error);
    return null;
  }
}

// Dynamic metadata generation for Open Graph / social media previews
export async function generateMetadata({
  params,
}: {
  params: Promise<{ roomId: string }>;
}): Promise<Metadata> {
  const { roomId } = await params;
  const room = await getStudyRoomData(roomId);

  // Default metadata if room not found
  if (!room) {
    return {
      title: "Study Room | Webyalaya",
      description: "Join a peer-to-peer learning session on Webyalaya",
      openGraph: {
        title: "Study Room | Webyalaya",
        description: "Join a peer-to-peer learning session on Webyalaya",
        siteName: "Webyalaya",
        type: "website",
      },
    };
  }

  // Format date and time for display
  const formattedDate = new Date(room.date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const formattedTime = new Date(room.date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Skills as comma-separated string
  const skillsList = room.skills
    ?.map((s: SkillData) => 
      typeof s === "string" ? s : s.skill?.name || s.name
    )
    .filter(Boolean)
    .join(", ") || "";

  // Rich description with key details
  const description = `📚 ${room.title}\n👨‍🏫 Teacher: ${room.createdBy?.name || "TBA"}\n📅 ${formattedDate} at ${formattedTime}\n⏱️ Duration: ${room.duration} minutes${skillsList ? `\n🎯 Topics: ${skillsList}` : ""}`;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://webyalaya.com";
  const pageUrl = `${baseUrl}/studyroom/${roomId}`;
  const generatedOgImageUrl = `${baseUrl}/api/og/studyroom/${roomId}`;
  
  // Use study room image if available, otherwise fallback to generated OG image
  const ogImageUrl = room.imageUrl || generatedOgImageUrl;

  return {
    title: `${room.title} | Study Room - Webyalaya`,
    description: room.description || description,
    openGraph: {
      title: room.title,
      description: description,
      url: pageUrl,
      siteName: "Webyalaya",
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: room.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: room.title,
      description: description,
      images: [ogImageUrl],
    },
  };
}

// Page component (Server Component that renders Client Component)
export default async function StudyRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  
  const room = await getStudyRoomData(roomId);
  return <StudyRoomClient roomId={room?.id ?? roomId} />;
}
