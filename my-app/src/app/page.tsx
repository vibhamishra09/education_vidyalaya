"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Navigation } from "@/components/layout/navigation";
import { HeroSection } from "@/components/sections/hero";
import { StudyRoomCard } from "@/components/cards/study-room-card";
import { DebateRoomCard } from "@/components/cards/debate-room-card";
import { Footer } from "@/components/layout/footer";
import { FadeIn } from "@/components/ui/fade-in";
import { Button } from "@/components/ui/button";
import { useStudyRooms } from "@/hooks/use-study-rooms";
import { SessionStatus } from "@/types/api.types";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  // Redirect logged-in users to browse page
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/browse');
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch study rooms from API
  const { data: studyRoomsData, isLoading: studyRoomsLoading, error: studyRoomsError } = useStudyRooms({
    limit: 6, // Show only 6 study rooms on home page
  });

  // Mock data for debate rooms (since backend doesn't have debate rooms API yet)
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

  // Transform API data to match component props
  const studyRooms = studyRoomsData?.studyRooms?.map((room) => ({
    status: room.sessionStatus === SessionStatus.ONGOING ? "live" as const : "scheduled" as const,
    category: typeof room.skills?.[0] === 'string' ? room.skills[0] : room.skills?.[0]?.name || "General",
    title: room.title,
    description: room.description || "",
    participants: { 
      current: room.participantCount || 0, 
      max: room.maxParticipants 
    },
    host: { 
      name: room.createdBy.name, 
      avatar: room.createdBy.avatar || "" 
    },
  })) || [];

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

  // Don't render the landing page for signed-in users (they'll be redirected)
  if (isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        <HeroSection />

        {/* Live Study Rooms Section */}
        <section className="py-16 bg-muted/30" id="features">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold">Live Study Rooms</h2>
                <Button variant="ghost">View All</Button>
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
                  No study rooms available at the moment.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {studyRooms.map((room, index) => (
                  <FadeIn key={index} delay={index * 0.1}>
                    <div data-testid="study-room-card">
                      <StudyRoomCard {...room} />
                    </div>
                  </FadeIn>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Debate Rooms Section */}
        <section className="py-16" id="community">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2">Debate Rooms</h2>
                <p className="text-muted-foreground">
                  Engage in structured peer-to-peer debates
                </p>
              </div>
            </FadeIn>

            <div className="grid sm:grid-cols-2 gap-6 max-w-4xl">
              {debateRooms.map((room, index) => (
                <FadeIn key={index} delay={index * 0.1}>
                  <DebateRoomCard {...room} />
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
//