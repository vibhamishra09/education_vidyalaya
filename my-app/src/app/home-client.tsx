"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Navigation } from "@/components/layout/navigation";
import { HeroSection } from "@/components/sections/hero";
import { PlatformStats } from "@/components/sections/platform-stats";
import { StudyRoomCard } from "@/components/cards/study-room-card";
import { DebateRoomCard } from "@/components/cards/debate-room-card";
import { Footer } from "@/components/layout/footer";
import { FadeIn } from "@/components/ui/fade-in";
import { Button } from "@/components/ui/button";
import { useStudyRooms, useJoinStudyRoom } from "@/hooks/use-study-rooms";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useToast } from "@/contexts/toast-context";
import { SessionStatus } from "@/types/api.types";
import type { StudyRoomCard as StudyRoomCardType } from "@/types/api.types";
import { Skeleton } from "@/components/ui/skeleton";

export function HomeClient() {
  const { isLoaded } = useUser();
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const { showSuccess, showError } = useToast();
  const joinStudyRoom = useJoinStudyRoom();
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);

  const { data: studyRoomsData, isLoading: studyRoomsLoading, error: studyRoomsError } = useStudyRooms({
    limit: 6,
    status: SessionStatus.UPCOMING,
    trending: true,
  });

  const studyRooms = studyRoomsData?.studyRooms ?? [];

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

  const handleViewAll = () => {
    router.push("/browse");
  };

  const handleJoinRoom = (room: StudyRoomCardType) => {
    requireAuth(async () => {
      try {
        setJoiningRoomId(room.id);
        await joinStudyRoom.mutateAsync(room.id);
        showSuccess("You're in!", `You joined "${room.title}".`);
      } catch (error: unknown) {
        console.error("Error joining study room from landing:", error);
        if (error && typeof error === "object" && "response" in error) {
          const apiError = error as { response: { data?: { code?: string; message?: string } } };
          const errorCode = apiError.response?.data?.code;
          const errorMessage = apiError.response?.data?.message;

          if (errorCode === "INSUFFICIENT_COINS") {
            showError("Not enough mAYA", errorMessage ?? "You do not have enough mAYA to join this study room.");
          } else if (errorCode === "ROOM_FULL") {
            showError("Room is full", errorMessage ?? "This study room has reached maximum capacity.");
          } else {
            showError("Failed to join", "Failed to join study room. Please try again.");
          }
        } else {
          showError("Failed to join", "Failed to join study room. Please try again.");
        }
      } finally {
        setJoiningRoomId(null);
      }
    });
  };

  // Show loading state while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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
                <Button variant="ghost" onClick={handleViewAll}>
                  View All
                </Button>
              </div>
            </FadeIn>

            {studyRoomsLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <FadeIn key={index} delay={index * 0.1}>
                    <div className="h-full" data-testid="study-room-skeleton">
                      <div className="border rounded-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-6 w-20" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-6 w-24" />
                        </div>
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            ) : studyRoomsError ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  Failed to load study rooms. Please try again later.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            ) : studyRooms.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No trending study rooms are available right now. Check back soon!
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {studyRooms.map((room, index) => {
                  const isLive = room.sessionStatus === SessionStatus.ONGOING;
                  const isFull = (room.participantCount || 0) >= room.maxParticipants;
                  const joinLoading = joinStudyRoom.isPending && joiningRoomId === room.id;

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
                        actionLoading={joinLoading}
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

