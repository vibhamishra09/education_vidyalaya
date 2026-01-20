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
    <div className="min-h-screen flex flex-col bg-muted/5 selection:bg-emerald-100 selection:text-emerald-900">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-6xl">
        {/* Back Button */}
        <Link href="/browse" className="inline-block mb-8">
          <Button variant="ghost" className="rounded-full hover:bg-emerald-50 hover:text-emerald-700 transition-colors group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Browse
          </Button>
        </Link>

        {/* Study Room Header */}
        <Card className="mb-10 border-none shadow-xl bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl ring-1 ring-white/50 dark:ring-white/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-gradient-to-br from-emerald-100/50 to-sky-100/50 rounded-full blur-3xl opacity-60 pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-gradient-to-tr from-lime-100/50 to-amber-100/50 rounded-full blur-3xl opacity-60 pointer-events-none" />
          
          <CardContent className="pt-8 pb-8 px-6 md:px-10 relative">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-8 mb-8">
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Status Badge */}
                   <Badge
                    variant={
                      room.sessionStatus === SessionStatus.ONGOING
                        ? "destructive"
                        : "outline"
                    }
                    className={
                      room.sessionStatus === SessionStatus.ONGOING 
                      ? "animate-pulse shadow-red-200 shadow-lg px-4 py-1.5 text-sm" 
                      : "bg-white/50 backdrop-blur-md border-emerald-200 text-emerald-800 px-4 py-1.5 text-sm"
                    }
                  >
                    {room.sessionStatus === SessionStatus.ONGOING ? (
                      <span className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        Live Now
                      </span>
                    ) : (
                      "Upcoming"
                    )}
                  </Badge>

                  {role === "teacher" && (
                    <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md border-none px-3 py-1">Teacher</Badge>
                  )}
                  {role === "learner" && (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border border-emerald-200">Enrolled</Badge>
                  )}
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {room.skills && room.skills.map((skill: any) => {
                    const skillName = typeof skill === 'string' ? skill : (skill.name || skill.skill?.name);
                    const skillKey = typeof skill === 'string' ? skill : (skill.id || skill.skill?.id || Math.random());
                    
                    if (!skillName) return null;

                    return (
                      <Badge key={skillKey} variant="outline" className="border-slate-200 text-slate-600 bg-slate-50/50">
                        {skillName}
                      </Badge>
                    );
                  })}
                </div>

                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                  {room.title}
                </h1>
                
                {room.description && (
                  <p className="text-lg text-muted-foreground/90 max-w-3xl leading-relaxed">
                    {room.description}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-3 w-full lg:w-auto">
                  <ShareButton
                    url={`${typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_BASE_URL || ""}/studyroom/${roomId}`}
                    title={room.title}
                    description={room.description || ""}
                    variant="outline"
                    size="lg"
                    className="flex-1 lg:flex-none border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                  />
                  
                  {role === "empty" && !isFull && (
                    <Button 
                      size="lg" 
                      onClick={handleJoinRoom}
                      disabled={isJoining}
                      className="flex-1 lg:flex-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 rounded-xl px-8 h-12 text-base font-semibold transition-all hover:-translate-y-0.5"
                    >
                      {isJoining ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Joining...
                        </>
                      ) : (
                        <>
                          <Coins className="h-5 w-5 mr-2 stroke-[2.5]" />
                          Join Room ({formatCoins(room.joiningFee)} WEBYA)
                        </>
                      )}
                    </Button>
                  )}
                  
                  {isFull && role === "empty" && (
                    <Button size="lg" disabled className="flex-1 lg:flex-none rounded-xl opacity-80">
                      Room Full
                    </Button>
                  )}
                </div>
                
                {/* Secondary Actions Row */}
                {(role === "teacher" || role === "learner") && (
                   <span className="text-xs text-muted-foreground font-medium px-2">
                     You are a participant in this room
                   </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
              <div className="flex items-center gap-4 bg-white/40 dark:bg-black/20 p-4 rounded-2xl border border-white/40 shadow-sm backdrop-blur-sm transition-all hover:bg-white/60">
                <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-inner">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Date</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{formattedDate}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white/40 dark:bg-black/20 p-4 rounded-2xl border border-white/40 shadow-sm backdrop-blur-sm transition-all hover:bg-white/60">
                <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Time</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {formattedTime} <span className="text-muted-foreground font-normal text-sm">({room.duration}m)</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white/40 dark:bg-black/20 p-4 rounded-2xl border border-white/40 shadow-sm backdrop-blur-sm transition-all hover:bg-white/60">
                <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shadow-inner">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Participants</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {room.participantCount || 0} / {room.maxParticipants} <span className="text-emerald-600 text-xs font-medium ml-1">Active</span>
                  </p>
                </div>
              </div>

              <Link 
                href={`/profile/${room.createdBy.id}`}
                className="flex items-center gap-4 bg-white/40 dark:bg-black/20 p-4 rounded-2xl border border-white/40 shadow-sm backdrop-blur-sm transition-all hover:bg-white/60 hover:shadow-md group"
              >
                <div className="relative">
                  <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
                    <AvatarImage
                      src={room.createdBy.avatar}
                      alt={room.createdBy.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-emerald-100 text-emerald-800">
                      {room.createdBy.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-white">
                     <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  </div>
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Host</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-700 transition-colors">{room.createdBy.name}</p>
                </div>
              </Link>

              {room.gmeetLink && room.gmeetLink !== "https://meet.google.com/your-meeting-code" && (
                <div className="flex items-center gap-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 transition-all hover:bg-blue-50">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                    <ExternalLink className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-600/70 uppercase tracking-wider mb-0.5">Meeting Link</p>
                    <a 
                      href={room.gmeetLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-700 hover:text-blue-900 hover:underline decoration-2 underline-offset-2"
                    >
                      Join via Google Meet
                    </a>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      {/* Live Session (LiveKit) Area - Sticky or Prominent */}
      {(room.sessionStatus === SessionStatus.UPCOMING || room.sessionStatus === SessionStatus.ONGOING) && (role === "teacher" || role === "learner") && (
        <div className="space-y-6 mb-12">
          <Card className="border-none shadow-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 backdrop-blur-md ring-1 ring-black/5 dark:ring-white/10 overflow-hidden relative">
             <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl relative z-10">
                 <div className="bg-indigo-100 p-2 rounded-lg">
                   <Users className="h-5 w-5 text-indigo-600" />
                 </div>
                 Live Session
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="space-y-1">
                   {canJoinVideoCall ? (
                     <p className="font-medium text-lg">The room is open!</p>
                   ) : (
                     <p className="font-medium text-lg text-muted-foreground">Waiting to start...</p>
                   )}
                   <p className="text-sm text-muted-foreground max-w-md">
                     {canJoinVideoCall 
                       ? "Jump in to collaborate with your peers using high-quality video and audio." 
                       : "The virtual classroom will open 5 minutes before the scheduled start time."}
                   </p>
                </div>
                
                {canJoinVideoCall ? (
                  <Link href={`/rooms/${liveRoomName}`}>
                    <Button size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 text-white rounded-xl px-8 h-12 text-lg transition-transform hover:-translate-y-0.5">
                      Enter Classroom
                      <ArrowLeft className="h-5 w-5 ml-2 rotate-180" />
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    size="lg" 
                    disabled
                    className="w-full sm:w-auto bg-slate-100 text-slate-400 border-slate-200 rounded-xl px-8 h-12 text-lg"
                  >
                    <Clock className="h-5 w-5 mr-2" />
                    Opens Soon
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}



        {/* Summary & Reviews (only for concluded sessions) */}
        {room.sessionStatus === SessionStatus.DONE && (
          <div className="space-y-8 mt-12 pb-12">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent flex-1" />
              <h2 className="text-2xl font-bold text-muted-foreground/50">Session Concluded</h2>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent flex-1" />
            </div>

            {/* AI Summary */}
            <Card className="border-none shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="bg-sky-100 p-2 rounded-lg">
                    <Loader2 className="h-5 w-5 text-sky-600" />
                  </div>
                  Session Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
                    This session has ended. A summary of the key topics covered will appear here shortly.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Reviews */}
            <div className="bg-white/40 dark:bg-black/20 rounded-3xl p-6 md:p-8 backdrop-blur-sm ring-1 ring-black/5">
              <ReviewsSection 
                sessionId={roomId} 
                showTitle={true}
              />
            
              {/* Review Submission Button */}
              {role === 'learner' && (
                 <div className="mt-8 text-center bg-white/50 rounded-xl p-8 border border-dashed border-slate-300">
                    <p className="text-lg font-medium text-slate-700 mb-4">
                      How was your learning experience?
                    </p>
                    <Link href={`/submit-review/${roomId}?type=studyRoom`}>
                      <Button variant="outline" className="border-emerald-200 hover:bg-emerald-50 text-emerald-700">
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

