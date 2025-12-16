"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navigation } from "@/components/layout/navigation";
import { HeroSection } from "@/components/sections/hero";
import { PlatformStats } from "@/components/sections/platform-stats";
import { StudyRoomCard } from "@/components/cards/study-room-card";
import { DebateRoomCard } from "@/components/cards/debate-room-card";
import { Footer } from "@/components/layout/footer";
import { FadeIn } from "@/components/ui/fade-in";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionStatus } from "@/types/api.types";
import type { StudyRoomCard as StudyRoomCardType } from "@/types/api.types";
import { studyRoomsApi } from "@/lib/api";

export function HomeClient() {
  const [studyRooms, setStudyRooms] = useState<StudyRoomCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch trending study rooms from API
  useEffect(() => {
    const fetchStudyRooms = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch a limited number of study rooms for the home page
        // Get both upcoming and ongoing rooms
        const response = await studyRoomsApi.getStudyRooms({
          limit: 6, // Show 6 study rooms on home page
        });
        
        setStudyRooms(response.studyRooms || []);
      } catch (err: any) {
        console.error('Error fetching study rooms:', err);
        setError(err.message || 'Failed to load study rooms');
        setStudyRooms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudyRooms();
  }, []);

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

            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {error}
                </p>
              </div>
            ) : studyRooms.length === 0 ? (
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

