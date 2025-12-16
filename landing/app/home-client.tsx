"use client";

import Link from "next/link";
import { Navigation } from "@/components/layout/navigation";
import { HeroSection } from "@/components/sections/hero";
import { PlatformStats } from "@/components/sections/platform-stats";
import { StudyRoomCard } from "@/components/cards/study-room-card";
import { DebateRoomCard } from "@/components/cards/debate-room-card";
import { Footer } from "@/components/layout/footer";
import { FadeIn } from "@/components/ui/fade-in";
import { Button } from "@/components/ui/button";
import { SessionStatus } from "@/types/api.types";
import type { StudyRoomCard as StudyRoomCardType } from "@/types/api.types";

// Mock study rooms data
const mockStudyRooms: StudyRoomCardType[] = [
  {
    id: "1",
    title: "Introduction to React Hooks",
    description: "Learn the fundamentals of React Hooks and modern React development",
    sessionStatus: SessionStatus.UPCOMING,
    date: new Date(Date.now() + 86400000).toISOString(),
    duration: 60,
    maxParticipants: 20,
    joiningFee: 10,
    participantCount: 12,
    createdBy: {
      id: "user1",
      name: "Sarah Johnson",
      avatar: "",
    },
    skills: ["React", "JavaScript"],
    hostAvgRating: 4.8,
    hostReviewCount: 45,
  },
  {
    id: "2",
    title: "Advanced TypeScript Patterns",
    description: "Deep dive into advanced TypeScript patterns and best practices",
    sessionStatus: SessionStatus.UPCOMING,
    date: new Date(Date.now() + 172800000).toISOString(),
    duration: 90,
    maxParticipants: 15,
    joiningFee: 15,
    participantCount: 8,
    createdBy: {
      id: "user2",
      name: "Michael Chen",
      avatar: "",
    },
    skills: ["TypeScript", "Programming"],
    hostAvgRating: 4.9,
    hostReviewCount: 67,
  },
  {
    id: "3",
    title: "Web Design Fundamentals",
    description: "Master the basics of modern web design and UI/UX principles",
    sessionStatus: SessionStatus.ONGOING,
    date: new Date().toISOString(),
    duration: 45,
    maxParticipants: 25,
    joiningFee: 5,
    participantCount: 18,
    createdBy: {
      id: "user3",
      name: "Emily Rodriguez",
      avatar: "",
    },
    skills: ["Design", "UI/UX"],
    hostAvgRating: 4.7,
    hostReviewCount: 32,
  },
];

export function HomeClient() {
  const studyRooms = mockStudyRooms;

  const debateRooms = [
    {
      status: "open" as const,
      title: "AI will replace human creativity in the next decade",
      watchers: 0,
      participants: { for: null, against: null },
    },
    {
      status: "in_progress" as const,
      title: "Remote work is more productive than office work",
      watchers: 5,
      participants: { for: "Emma Wilson", against: "John Smith" },
    },
  ];

  // For static build, use Link component instead of router

  const handleJoinRoom = (room: StudyRoomCardType) => {
    console.log("Joining room:", room);
    // For landing page, just log the action
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        <HeroSection />

        {/* Trending Study Rooms Section */}
        <section className="py-16 bg-muted/30" id="features">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold">Trending Study Rooms</h2>
                <Link href="/browse">
                  <Button variant="ghost">
                    View All
                  </Button>
                </Link>
              </div>
            </FadeIn>

            {studyRooms.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No trending study rooms are available right now. Check back soon!
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {studyRooms.map((room: StudyRoomCardType, index: number) => {
                  const isLive = room.sessionStatus === SessionStatus.ONGOING;
                  const isFull = (room.participantCount || 0) >= room.maxParticipants;

                  return (
                    <FadeIn key={room.id} delay={index * 0.1}>
                    <div data-testid="study-room-card">
                      <StudyRoomCard
                        roomId={room.id}
                        status={isLive ? "live" : "scheduled"}
                        category={
                          typeof room.skills?.[0] === "string"
                            ? room.skills[0]
                            : room.skills?.[0]?.name || "General"
                        }
                        title={room.title}
                        description={room.description || ""}
                        participants={{
                          current: room.participantCount || 0,
                          max: room.maxParticipants,
                        }}
                        host={{
                          name: room.createdBy.name,
                          avatar: room.createdBy.avatar || "",
                          rating: room.hostAvgRating ?? undefined,
                          reviewCount: room.hostReviewCount ?? undefined,
                        }}
                        actionLabel={
                          isFull ? "Room Full" : isLive ? "Join Live" : "Join Room"
                        }
                        actionVariant={
                          isFull ? "secondary" : isLive ? "default" : "outline"
                        }
                        actionDisabled={isFull}
                        actionLoading={false}
                        onAction={
                          isFull ? undefined : () => handleJoinRoom(room)
                        }
                      />
                    </div>
                  </FadeIn>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Debate Rooms Section (Mock Data) */}
        <section className="py-16" id="community">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2">Debate Rooms</h2>
                <p className="text-muted-foreground font-tagline">
                  Engage in structured peer-to-peer debates
                </p>
              </div>
            </FadeIn>

            <div className="grid sm:grid-cols-2 gap-6 max-w-4xl">
              {debateRooms.map((room, index) => (
                <FadeIn key={room.title} delay={index * 0.1}>
                  <DebateRoomCard {...room} />
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Platform Stats Section */}
        <PlatformStats />
      </main>

      <Footer />
    </div>
  );
}

