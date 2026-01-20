"use client";

import { useState, useEffect } from "react";
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
import { useStudyRoomDetails, useJoinStudyRoom } from "@/hooks/use-study-rooms";
import { useAuth } from "@clerk/nextjs";
import { setAuthToken } from "@/lib/api-client";
import { useToast } from "@/contexts/toast-context";
import Link from "next/link";
import { SessionStatus } from "@/types";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { formatCoins } from "@/lib/utils/coin-format";
import { ShareButton } from "@/components/share/share-button";

interface StudyRoomClientProps {
  roomId: string;
}

export default function StudyRoomClient({ roomId }: StudyRoomClientProps) {
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
          showError("Insufficient WEBYA", apiError.response.data.message);
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
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/10 selection:text-primary">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        {/* Back Button */}
        <Link href="/browse" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-12 transition-colors group">
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Browse
        </Link>

        {/* Header Section */}
        <div className="space-y-8 mb-16">
           <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                 {/* Status Badge */}
                   <Badge
                    variant={
                      room.sessionStatus === SessionStatus.ONGOING
                        ? "destructive"
                        : "secondary"
                    }
                    className="rounded-full px-3 py-0.5 font-medium"
                  >
                    {room.sessionStatus === SessionStatus.ONGOING ? (
                      <span className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                        </span>
                        Live Now
                      </span>
                    ) : (
                      "Upcoming"
                    )}
                  </Badge>
                  
                  {role === "teacher" && (
                    <Badge variant="default" className="rounded-full px-3 py-0.5">Teacher</Badge>
                  )}
                  {role === "learner" && (
                    <Badge variant="outline" className="rounded-full px-3 py-0.5">Enrolled</Badge>
                  )}
                  {room.skills && room.skills.map((skill: any) => {
                    const skillName = typeof skill === 'string' ? skill : (skill.name || skill.skill?.name);
                    const skillKey = typeof skill === 'string' ? skill : (skill.id || skill.skill?.id || Math.random());
                    
                    if (!skillName) return null;

                    return (
                      <Badge key={skillKey} variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted/80 rounded-full px-3 py-0.5">
                        {skillName}
                      </Badge>
                    );
                  })}
              </div>

              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
                  {room.title}
              </h1>
              
              {room.description && (
                  <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                    {room.description}
                  </p>
              )}
           </div>

           {/* Action Buttons */}
           <div className="flex flex-wrap items-center gap-4 pt-2">
              {role === "empty" && !isFull && (
                <Button 
                  size="lg" 
                  onClick={handleJoinRoom}
                  disabled={isJoining}
                  className="rounded-full px-8 h-12 text-base font-medium"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Joining
                    </>
                  ) : (
                    <>
                      Join for {formatCoins(room.joiningFee)} WEBYA
                    </>
                  )}
                </Button>
              )}
              
              {isFull && role === "empty" && (
                <Button size="lg" disabled variant="secondary" className="rounded-full px-8 h-12">
                  Room Full
                </Button>
              )}

              <ShareButton
                url={`${typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_BASE_URL || ""}/studyroom/${roomId}`}
                title={room.title}
                description={room.description || ""}
                variant="outline"
                className="rounded-full h-12 px-6 border-muted-foreground/20 hover:bg-muted/50 transition-colors"
              />
           </div>
        </div>
        
        <div className="h-px bg-border/50 mb-16" />

        {/* Details Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-8 mb-16">
            
            {/* Date */}
            <div className="space-y-1">
               <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                 Date
               </span>
               <div className="flex items-center gap-2 text-foreground font-medium">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formattedDate}
               </div>
            </div>

            {/* Time */}
            <div className="space-y-1">
               <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                 Time
               </span>
               <div className="flex items-center gap-2 text-foreground font-medium">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {formattedTime} <span className="text-muted-foreground font-normal text-sm">({room.duration} min)</span>
               </div>
            </div>

            {/* Participants */}
            <div className="space-y-1">
               <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                 Participants
               </span>
               <div className="flex items-center gap-2 text-foreground font-medium">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {room.participantCount || 0} / {room.maxParticipants}
               </div>
            </div>

            {/* Host */}
            <div className="space-y-1">
               <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                 Host
               </span>
               <Link href={`/profile/${room.createdBy.id}`} className="flex items-center gap-2 group w-max">
                 <Avatar className="h-5 w-5 border border-border">
                    <AvatarImage src={room.createdBy.avatar} />
                    <AvatarFallback className="text-[10px]">{room.createdBy.name.charAt(0)}</AvatarFallback>
                 </Avatar>
                 <span className="font-medium text-foreground group-hover:underline decoration-1 underline-offset-4 decoration-muted-foreground">{room.createdBy.name}</span>
               </Link>
            </div>
        </div>

        {/* External Link */}
        {room.gmeetLink && room.gmeetLink !== "https://meet.google.com/your-meeting-code" && (
            <div className="mb-16 p-4 rounded-lg bg-muted/30 border border-border/50 inline-block">
                 <a 
                    href={room.gmeetLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Join via Google Meet
                  </a>
            </div>
        )}

      {/* Live Session CTA */}
      {(room.sessionStatus === SessionStatus.UPCOMING || room.sessionStatus === SessionStatus.ONGOING) && (role === "teacher" || role === "learner") && (
        <div className="rounded-2xl border border-border bg-card p-8 flex flex-col md:flex-row items-center justify-between gap-8 mb-16 shadow-sm">
            <div className="space-y-2 text-center md:text-left">
               <h3 className="text-xl font-semibold tracking-tight">
                  {canJoinVideoCall ? "The classroom is open" : "Waiting to start"}
               </h3>
               <p className="text-muted-foreground max-w-md">
                   {canJoinVideoCall 
                       ? "Jump in to collaborate with your peers using high-quality video and audio." 
                       : "The virtual classroom will open 5 minutes before the scheduled start time."}
               </p>
            </div>
            {canJoinVideoCall ? (
                  <Link href={`/rooms/${liveRoomName}`} className="w-full md:w-auto">
                    <Button size="lg" className="w-full md:w-auto px-8 rounded-full h-12 shadow-sm">
                      Enter Classroom
                      <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                    </Button>
                  </Link>
                ) : (
                  <Button disabled size="lg" variant="secondary" className="w-full md:w-auto px-8 rounded-full h-12 bg-muted text-muted-foreground opacity-50">
                    <Clock className="h-4 w-4 mr-2" />
                    Opens Soon
                  </Button>
                )}
        </div>
      )}

      {/* Reviews etc */}
       {room.sessionStatus === SessionStatus.DONE && (
          <div className="space-y-16">
             <div className="pt-8 border-t border-border/50">
                <h3 className="text-xl font-semibold mb-6 tracking-tight">Session Summary</h3>
                 <div className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                    <p>This session has ended. A summary of the key topics covered will appear here shortly.</p>
                 </div>
             </div>
             
             <div className="pt-8 border-t border-border/50">
                <ReviewsSection sessionId={roomId} showTitle={true} />
                {role === 'learner' && (
                 <div className="mt-10 p-8 rounded-2xl bg-muted/30 border border-dashed border-border text-center">
                    <p className="text-lg font-medium mb-4 text-foreground">
                      How was your learning experience?
                    </p>
                    <Link href={`/submit-review/${roomId}?type=studyRoom`}>
                      <Button variant="outline" className="rounded-full px-6">
                        Write a Review
                      </Button>
                    </Link>
                 </div>
              )}
             </div>
          </div>
       )}

      </main>
      <Footer />
    </div>
  );
}

