"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Navigation } from "@/components/layout/navigation";
import { HeroSection } from "@/components/sections/hero";
import { PlatformStats } from "@/components/sections/platform-stats";
import { TestimonialsSlider } from "@/components/sections/testimonials-slider";
import { StudyRoomCard } from "@/components/cards/study-room-card";
import { DebateRoomCard } from "@/components/cards/debate-room-card";
import { Footer } from "@/components/layout/footer";
import { FadeIn } from "@/components/ui/fade-in";
import { Button } from "@/components/ui/button";
import { useStudyRooms, useJoinStudyRoom } from "@/hooks/use-study-rooms";
import { useCurrentUser } from "@/hooks/use-users";
import { useDebateRooms } from "@/hooks/use-debate-rooms";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useToast } from "@/contexts/toast-context";
import { SessionStatus } from "@/types/api.types";
import { DebateStatus } from "@/types/debate.types";
import type { StudyRoomCard as StudyRoomCardType } from "@/types/api.types";
import { Skeleton } from "@/components/ui/skeleton";
import { studyRoomCardDisplayLive } from "@/lib/utils/study-room-edit";

export function HomeClient() {
  const { isLoaded } = useUser();
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const { showSuccess, showError } = useToast();
  const joinStudyRoom = useJoinStudyRoom();
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const { data: currentUserData } = useCurrentUser();

  const { data: studyRoomsData, isLoading: studyRoomsLoading, error: studyRoomsError } = useStudyRooms({
    limit: 6,
    status: SessionStatus.UPCOMING,
    trending: true,
  });

  // Get trending debate rooms (scheduled for future)
  const { data: debateRoomsData, isLoading: debateRoomsLoading, error: debateRoomsError } = useDebateRooms({
    limit: 4,
    status: DebateStatus.WAITING,
    trending: true,
  });

  const studyRooms = studyRoomsData?.studyRooms ?? [];
  const debateRooms = debateRoomsData?.debateRooms ?? [];

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
            showError("Not enough Coins", errorMessage ?? "You do not have enough Coins to join this study room.");
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
        <section className="py-10 sm:py-12" id="features">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="flex items-center justify-between mb-5 sm:mb-6">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Trending Study Rooms</h2>
                  <p className="text-sm sm:text-base text-muted-foreground font-tagline">
                    Join active community sessions and learn together.
                  </p>
                </div>
                <Button variant="ghost" className="hover:bg-muted/50" onClick={handleViewAll}>
                  View All
                </Button>
              </div>
            </FadeIn>

            {studyRoomsLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, index) => (
                  <FadeIn key={index} delay={index * 0.1}>
                    <div className="h-full" data-testid="study-room-skeleton">
                      <div className="border rounded-lg p-5 space-y-4">
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
              <div className="py-10">
                <div className="max-w-md mx-auto border rounded-xl bg-card p-6 shadow-sm text-center">
                  <p className="text-muted-foreground mb-4">
                    Failed to load study rooms. Please try again later.
                  </p>
                  <Button 
                    variant="default"
                    onClick={() => window.location.reload()}
                    className="bg-green-100 text-green-800 hover:bg-green-200 border border-green-300 shadow-none"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : studyRooms.length === 0 ? (
              <div className="py-10">
                <div className="max-w-md mx-auto border rounded-xl bg-card p-6 shadow-sm text-center">
                  <p className="text-muted-foreground">
                  No trending study rooms are available right now. Check back soon!
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {studyRooms.map((room, index) => {
                  const isLive = studyRoomCardDisplayLive(
                    room.sessionStatus,
                    room.date,
                  );
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
                        skillNames={(room.skills ?? [])
                          .map((s) =>
                            typeof s === "string" ? s : s?.name,
                          )
                          .filter((n): n is string => Boolean(n))}
                        title={room.title}
                        description={room.description || ""}
                        date={room.date}
                        duration={room.duration}
                        imageUrl={room.imageUrl}
                        participants={{
                          current: room.participantCount || 0,
                          max: room.maxParticipants,
                        }}
                        host={{
                          id: room.createdBy.id,
                          name: room.createdBy.name,
                          avatar: room.createdBy.avatar || "",
                        }}
                        sessionStatus={room.sessionStatus}
                        currentUserId={currentUserData?.user?.id ?? null}
                        seriesId={room.seriesId ?? null}
                        joiningFee={room.joiningFee}
                        timezone={room.timezone ?? null}
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

        {/* Debate Rooms Section */}
        <section className="py-10 sm:py-12" id="community">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="flex items-center justify-between mb-5 sm:mb-6">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Trending Debate Rooms</h2>
                  <p className="text-sm sm:text-base text-muted-foreground font-tagline">
                    Engage in meaningful conversations. Broaden your perspective.
                  </p>
                </div>
                <Button variant="ghost" className="hover:bg-muted/50" onClick={() => router.push("/debateroom")}>
                  View All
                </Button>
              </div>
            </FadeIn>

            {debateRoomsLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <FadeIn key={index} delay={index * 0.1}>
                    <div className="h-full">
                      <div className="border rounded-lg p-5 space-y-4">
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
            ) : debateRoomsError ? (
              <div className="py-10">
                <div className="max-w-md mx-auto border rounded-xl bg-card p-6 shadow-sm text-center">
                  <p className="text-muted-foreground mb-4">
                    Failed to load debate rooms. Please try again later.
                  </p>
                  <Button 
                    variant="default"
                    onClick={() => window.location.reload()}
                    className="bg-green-100 text-green-800 hover:bg-green-200 border border-green-300 shadow-none"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : debateRooms.length === 0 ? (
              <div className="py-10">
                <div className="max-w-md mx-auto border rounded-xl bg-card p-6 shadow-sm text-center">
                  <p className="text-muted-foreground">
                    No trending debate rooms are available right now. Check back soon!
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {debateRooms.map((room, index) => (
                  <FadeIn key={room.id} delay={index * 0.1}>
                    <DebateRoomCard
                      room={room}
                      currentUserId={currentUserData?.user?.id ?? null}
                    />
                  </FadeIn>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Platform Stats Section */}
        <PlatformStats />

        {/* Testimonials Slider Section */}
        <TestimonialsSlider />
      </main>

      <Footer />
    </div>
  );
}

