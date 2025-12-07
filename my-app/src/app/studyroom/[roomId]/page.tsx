"use client";

import { use, useState, useEffect } from "react";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Users,
  Clock,
  Calendar,
  Coins,
  Loader2,
  ExternalLink,
} from "lucide-react";
// Removed mock data imports - now using API data
import { useStudyRoomDetails, useJoinStudyRoom } from "@/hooks/use-study-rooms";
import { useAuth } from "@clerk/nextjs";
import { setAuthToken } from "@/lib/api-client";
import { useToast } from "@/contexts/toast-context";
import Link from "next/link";
import { SessionStatus } from "@/types";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { formatMaya } from "@/lib/utils/coin-format";
import { ShareButton } from "@/components/share/share-button";

export default function StudyRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const { getToken } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  const [canJoinVideoCall, setCanJoinVideoCall] = useState(false);
  
  const { data: room, isLoading, error } = useStudyRoomDetails(roomId);
  console.log(room);
  const joinStudyRoom = useJoinStudyRoom();

  // Check if video call can be joined (within 5 minutes of start time)
  useEffect(() => {
    if (!room || room.sessionStatus === SessionStatus.ONGOING) {
      // If session is ongoing, always allow joining
      setCanJoinVideoCall(true);
      return;
    }

    if (room.sessionStatus !== SessionStatus.UPCOMING) {
      setCanJoinVideoCall(false);
      return;
    }

    const checkVideoCallAvailability = () => {
      const now = new Date();
      const scheduledStart = new Date(room.date);
      const fiveMinutesBefore = new Date(scheduledStart.getTime() - 5 * 60 * 1000); // 5 minutes in milliseconds
      
      // Enable if current time is >= 5 minutes before start time
      setCanJoinVideoCall(now >= fiveMinutesBefore);
    };

    // Check immediately
    checkVideoCallAvailability();

    // Update every minute to handle the 5-minute window
    const interval = setInterval(checkVideoCallAvailability, 60000);

    return () => clearInterval(interval);
  }, [room]);

  // Handle joining study room
  const handleJoinRoom = async () => {
    if (!room) return;
    
    try {
      setIsJoining(true);
      
      // Get token and set it for API calls
      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }
      
      await joinStudyRoom.mutateAsync(roomId);
      
      showSuccess("Successfully Joined!", `You have joined "${room.title}" successfully!`);
      
    } catch (error: unknown) {
      console.error('Error joining study room:', error);
      
      // Handle specific error cases
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response: { data: { code: string; message: string } } };
        if (apiError.response?.data?.code === 'INSUFFICIENT_COINS') {
          showError("Insufficient mAYA", apiError.response.data.message);
        } else if (apiError.response?.data?.code === 'ROOM_FULL') {
          showError("Room Full", apiError.response.data.message);
        } else {
          showError("Failed to Join", "Failed to join study room. Please try again.");
        }
      } else {
        showError("Failed to Join", "Failed to join study room. Please try again.");
      }
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-32 mb-6" />
          <Card className="mb-8">
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Study room not found</h1>
            <Link href="/browse">
              <Button className="mt-4">Back to Browse</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Use the role from the API response directly
  const role = room.role || "empty";
  const isFull = room.participantCount >= room.maxParticipants;


  const formattedDate = new Date(room.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = new Date(room.date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const liveRoomName = `studyroom-${roomId}`;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link href="/browse">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>

        {/* Study Room Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold">{room.title}</h1>
                  {role === "teacher" && (
                    <Badge variant="default">Teacher</Badge>
                  )}
                  {role === "learner" && (
                    <Badge variant="secondary">Enrolled</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      room.sessionStatus === SessionStatus.ONGOING
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {room.sessionStatus === SessionStatus.ONGOING
                      ? "Live Now"
                      : room.sessionStatus}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ShareButton
                  url={`${typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_BASE_URL || ""}/studyroom/${roomId}`}
                  title={room.title}
                  description={room.description || ""}
                  variant="outline"
                  size="lg"
                />
                {role === "empty" && !isFull && (
                  <Button 
                    size="lg" 
                    onClick={handleJoinRoom}
                    disabled={isJoining}
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      <>
                        <Coins className="h-4 w-4 mr-2" />
                        Join Room ({formatMaya(room.joiningFee)} mAYA tokens)
                      </>
                    )}
                  </Button>
                )}
                {isFull && role === "empty" && (
                  <Button size="lg" disabled>
                    Room Full
                  </Button>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formattedDate}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">
                    {formattedTime} ({room.duration} min)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Participants</p>
                  <p className="font-medium">
                    {room.participantCount || 0} / {room.maxParticipants}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={room.createdBy.avatar}
                    alt={room.createdBy.name}
                  />
                  <AvatarFallback>
                    {room.createdBy.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground">Teacher</p>
                  <p className="font-medium">{room.createdBy.name}</p>
                </div>
              </div>

              {room.gmeetLink && room.gmeetLink !== "https://meet.google.com/your-meeting-code" && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Meeting Link</p>
                    <a 
                      href={room.gmeetLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:text-blue-800 underline"
                    >
                      Join Meeting
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium mb-2">Topics:</p>
              <div className="flex flex-wrap gap-2">
                {room.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary">
                    {typeof skill === 'string' ? skill : skill.name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Live Session (LiveKit) */}
      {(room.sessionStatus === SessionStatus.UPCOMING || room.sessionStatus === SessionStatus.ONGOING) && (role === "teacher" || role === "learner") && (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Live Session</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {canJoinVideoCall ? (
                  <Link href={`/rooms/${liveRoomName}`}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Join Study Room
                    </Button>
                  </Link>
                ) : (
                  <div className="space-y-2">
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700" 
                      disabled
                    >
                      Join Study Room
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Video call will be available 5 minutes before the scheduled start time.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat Widget - Only show when session is UPCOMING (not during live call) */}
          {room.sessionStatus === SessionStatus.UPCOMING && (role === "teacher" || role === "learner") && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <ChatWidget channelId={room.chatChannelId} />
              </CardContent>
            </Card>
          )}
        </>
      )}

        {/* Description */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground font-tagline">
              {room.description || "No description provided."}
            </p>
          </CardContent>
        </Card>

        {/* Summary & Reviews (only for concluded sessions) */}
        {room.sessionStatus === SessionStatus.DONE && (
          <div className="space-y-8">
            {/* AI Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Session Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground mb-4 font-tagline">
                    This session covered advanced React hooks including useState,
                    useEffect, and useContext. We explored best practices for
                    custom hooks and discussed common pitfalls to avoid.
                  </p>
                  <h4 className="font-semibold mb-2">Key Points:</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground font-tagline">
                    <li>Understanding the rules of hooks</li>
                    <li>Creating custom hooks for reusable logic</li>
                    <li>Performance optimization with useMemo and useCallback</li>
                    <li>Context API for state management</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Reviews */}
            <ReviewsSection 
              sessionId={roomId} 
              showTitle={true}
            />
            
            {/* Review Submission Button */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">
                    Share your experience and help others learn
                  </p>
                  <Link href={`/submit-review/${roomId}?type=studyRoom`}>
                    <Button>
                      Leave a Review
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
