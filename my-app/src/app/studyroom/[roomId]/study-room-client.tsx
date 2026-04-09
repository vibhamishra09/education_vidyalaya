"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import RecurringActionModal from "@/components/modals/recurring-action-modal";
import {
  ArrowLeft,
  Users,
  Clock,
  Calendar,
  Coins,
  Loader2,
  Check,
  Pencil,
} from "lucide-react";
import {
  useStudyRoomDetails,
  useJoinStudyRoom,
  useCancelStudyRoom,
  useUnenrollRoom,
  useJoinRecurringStudyRoom,
} from "@/hooks/use-study-rooms";
import { useAuth } from "@clerk/nextjs";
import { AuthPromptButtons } from "@/components/auth/auth-prompt-buttons";
import { setAuthToken } from "@/lib/api-client";
import { useToast } from "@/contexts/toast-context";
import Link from "next/link";
import { SessionStatus } from "@/types";
import { StudyRoomEditScope } from "@/types/api.types";
import { formatCoins } from "@/lib/utils/coin-format";
import { ShareButton } from "@/components/share/share-button";
import { useCurrentUser } from "@/hooks/use-users";
import { canStudyRoomHostEditFromCard } from "@/lib/utils/study-room-edit";
import { StudyRoomHostEditDialog } from "@/components/study-room/study-room-host-edit-dialog";
import {
  getStudyRoomPagePath,
  getStudyRoomShareUrl,
  STUDY_ROOM_JOIN_PARAM,
  STUDY_ROOM_JOIN_VALUE,
} from "@/lib/utils/study-room-share";

interface StudyRoomClientProps {
  roomId: string;
  slug:string
}

export default function StudyRoomClient({ roomId, slug }: StudyRoomClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinIntentRef = useRef(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const { mutateAsync: unenroll, isPending: isUnenrolling } = useUnenrollRoom();
  const { mutateAsync: joinRecurring, isPending: _isJoiningRecurring } =
    useJoinRecurringStudyRoom();
  const [recurringRoom, setRecurringRoom] = useState<{
    id: string;
    seriesId?: string | null;
    slug: string | undefined
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { getToken, isSignedIn, isLoaded: authLoaded } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  const [canJoinVideoCall, setCanJoinVideoCall] = useState(false);
  
  const { data: room, isLoading, error } = useStudyRoomDetails(roomId);
  const joinStudyRoom = useJoinStudyRoom();
  const cancelStudyRoom = useCancelStudyRoom();
  const [hostEditOpen, setHostEditOpen] = useState(false);
  const { data: currentUserData } = useCurrentUser();

  // Video join: hosts can enter anytime while upcoming; learners within 5 min of start
  useEffect(() => {
    if (!room || room.sessionStatus === SessionStatus.ONGOING) {
      setCanJoinVideoCall(true);
      return;
    }

    if (room.sessionStatus !== SessionStatus.UPCOMING) {
      setCanJoinVideoCall(false);
      return;
    }

    const role = room.role || "empty";
    if (role === "teacher") {
      setCanJoinVideoCall(true);
      return;
    }

    const checkVideoCallAvailability = () => {
      const now = new Date();
      const scheduledStart = new Date(room.date);
      const startMs = scheduledStart.getTime();
      if (Number.isNaN(startMs)) {
        setCanJoinVideoCall(false);
        return;
      }
      const fiveMinutesBefore = startMs - 5 * 60 * 1000;
      setCanJoinVideoCall(now.getTime() >= fiveMinutesBefore);
    };

    checkVideoCallAvailability();
    const interval = setInterval(checkVideoCallAvailability, 60000);
    return () => clearInterval(interval);
  }, [room]);

  const handleJoinRoom = useCallback(async () => {
    if (!room) return;

    if (room.seriesId) {
      setRecurringRoom(room);
      setIsModalOpen(true);
      return;
    }

    try {
      setIsJoining(true);

      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }

      await joinStudyRoom.mutateAsync(roomId);

      showSuccess(
        "Successfully Joined!",
        `You have joined "${room.title}" successfully!`,
      );
    } catch (error: unknown) {
      console.error("Error joining study room:", error);

      if (error && typeof error === "object" && "response" in error) {
        const apiError = error as {
          response: { data: { code: string; message: string } };
        };
        if (apiError.response?.data?.code === "INSUFFICIENT_COINS") {
          showError("Insufficient Coins", apiError.response.data.message);
        } else if (apiError.response?.data?.code === "ROOM_FULL") {
          showError("Room Full", apiError.response.data.message);
        } else {
          showError(
            "Failed to Join",
            "Failed to join study room. Please try again.",
          );
        }
      } else {
        showError(
          "Failed to Join",
          "Failed to join study room. Please try again.",
        );
      }
    } finally {
      setIsJoining(false);
    }
  }, [room, roomId, getToken, joinStudyRoom, showSuccess, showError]);

  useEffect(() => {
    if (searchParams.get(STUDY_ROOM_JOIN_PARAM) !== STUDY_ROOM_JOIN_VALUE) {
      joinIntentRef.current = false;
    }
  }, [searchParams]);

  /** Shared link (?join=1): after login, join once without an extra click. */
  useEffect(() => {
    if (!room || !authLoaded || !isSignedIn) return;
    if (searchParams.get(STUDY_ROOM_JOIN_PARAM) !== STUDY_ROOM_JOIN_VALUE)
      return;
    if (joinIntentRef.current) return;

    const role = room.role || "empty";
    const full = room.participantCount >= room.maxParticipants;

    if(role === 'teacher') return
    if(role === 'learner') return

    joinIntentRef.current = true;
    void (async () => {
      try {
        await handleJoinRoom();
      } 
      catch(e){
        console.log(e)
      }
    })();
  }, [
    room,
    authLoaded,
    isSignedIn,
    searchParams,
    roomId,
    router,
    handleJoinRoom,
  ]);

  const handleCancelRoom = async () => {
    if (!room) return;
    const hasSeries = !!room.seriesId;
    let scope = StudyRoomEditScope.SINGLE;

    if (hasSeries) {
      const selected = window.prompt(
        "Cancel scope: type 1 for this session, 2 for this and future, 3 for entire series",
        "1",
      );
      if (selected === "2") scope = StudyRoomEditScope.THIS_AND_FUTURE;
      if (selected === "3") scope = StudyRoomEditScope.ENTIRE_SERIES;
    }

    try {
      await cancelStudyRoom.mutateAsync({
        roomId: room.id,
        slug: room.slug,
        scope,
      });
      showSuccess("Cancelled", "Study room cancellation applied successfully.");
    } catch {
      showError("Cancel Failed", "Could not cancel this study room.");
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

  const hostEditSkillNames = (room.skills || [])
    .map(
      (skill: string | { name?: string; skill?: { name?: string } }) =>
        typeof skill === "string"
          ? skill
          : skill.name || skill.skill?.name || "",
    )
    .filter(Boolean) as string[];

  const showHostDetailMenu =
    role === "teacher" &&
    canStudyRoomHostEditFromCard({
      currentUserId: currentUserData?.user?.id ?? null,
      hostUserId: room.createdBy?.id ?? "",
      sessionStatus: room.sessionStatus,
    });


  const handleConfirmRecurring = async (scope: "ALL" | "THIS") => {
    if (!recurringRoom) return;
    setIsModalOpen(false);
    setIsJoining(true);

    const apiScope: "THIS" | "FOLLOWING" =
      scope === "ALL" ? "FOLLOWING" : "THIS";

    try {
      await joinRecurring({ roomId: recurringRoom.id ?? recurringRoom.id, scope: apiScope });
      showSuccess("Joined Room successfully!");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const errorMessage =
        err.response?.data?.message || "Failed to join series";
      showError(errorMessage);
    } finally {
      setIsJoining(false);
      setRecurringRoom(null);
    }
  };

  const handleUnenroll = async () => {
    if (room.seriesId) {
      setIsLeaveModalOpen(true);
      setRecurringRoom(room)
    } else {
      try {
        await unenroll({ roomId: room.id, scope: "THIS" });
        showSuccess("Successfully Unenrolled from room")
      }
      catch(e){
        showError("Failed to Unenroll")
      }
    }
  };

  const handleConfirmLeave = async (scope: "ALL" | "THIS") => {
    if(!recurringRoom)  return;
    setIsLeaveModalOpen(false);
    
    if (scope === "ALL") {
      try {
        await unenroll({ roomId: recurringRoom.seriesId!, scope: "ALL" });
        showSuccess("Successfully Unenrolled from series")
      }
      catch(e){
        showError("Failed to Unenroll")
      }
      finally{
        setRecurringRoom(null)
      }
    } else {
      try {
        await unenroll({ roomId: recurringRoom.id, scope: "THIS" });
        showSuccess("Successfully Unenrolled from room")
      }
      catch(e){
        showError("Failed to Unenroll")
      }
      finally {
        setRecurringRoom(null)
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/10 selection:text-primary">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl relative z-10">
        {/* Back Button */}
        <Link href="/browse" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors group">
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Browse
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column: Content */}
            <div className="lg:col-span-2 space-y-5">
                {/* Header Section */}
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <Badge
                            variant={room.sessionStatus === SessionStatus.ONGOING ? "destructive" : "secondary"}
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium shadow-none border-transparent bg-primary/10 text-primary hover:bg-primary/20"
                        >
                            {room.sessionStatus === SessionStatus.ONGOING ? (
                                <span className="flex items-center gap-1.5">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                                    </span>
                                    Live Now
                                </span>
                            ) : (
                                "Upcoming Session"
                            )}
                        </Badge>
                        
                        {role === "teacher" && (
                            <Badge className="rounded-full px-2.5 py-0.5 text-xs bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 shadow-none border-transparent">Teacher</Badge>
                        )}
                        {role === "learner" && (
                            <Badge className="rounded-full px-2.5 py-0.5 text-xs bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 shadow-none border-transparent">Enrolled</Badge>
                        )}
                        {role !== "teacher" && room.hostDetailsUpdatedAt && (
                          <Badge
                            variant="outline"
                            className="rounded-full px-2.5 py-0.5 text-xs font-semibold border-amber-500/40 text-amber-800 dark:text-amber-200 bg-amber-500/10"
                          >
                            Edited
                          </Badge>
                        )}
                      </div>
                      {showHostDetailMenu && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 h-auto min-h-0 text-xs font-medium shadow-none border-transparent bg-primary/10 text-primary hover:bg-primary/20 gap-1.5"
                          aria-label="Edit study room (host)"
                          onClick={() => setHostEditOpen(true)}
                        >
                          <Pencil className="h-3 w-3 shrink-0" aria-hidden />
                          Edit
                        </Button>
                      )}
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-tight">
                        {room.title}
                    </h1>
              
                    {room.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {room.description}
                        </p>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                        {room.skills && room.skills.map((skill: string | { id?: string; name?: string; skill?: { id?: string; name?: string } }) => {
                            const skillName = typeof skill === 'string' ? skill : (skill.name || skill.skill?.name);
                            const skillKey = typeof skill === 'string' ? skill : (skill.id || skill.skill?.id || Math.random());
                            if (!skillName) return null;
                            return (
                                <Badge key={skillKey} variant="outline" className="rounded-md px-2 py-0.5 text-xs font-normal border-border/50 bg-background/50 backdrop-blur-sm">
                                    {skillName}
                                </Badge>
                            );
                        })}
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-3 transition-colors hover:bg-blue-500/10">
                        <div className="p-2 rounded-lg bg-background shadow-sm border border-border/50">
                            <Calendar className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Date</p>
                            <p className="text-sm font-semibold">{formattedDate}</p>
                        </div>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-3 transition-colors hover:bg-blue-500/10">
                        <div className="p-2 rounded-lg bg-background shadow-sm border border-border/50">
                            <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Time</p>
                            <p className="text-sm font-semibold">{formattedTime} ({room.duration} min)</p>
                        </div>
                    </div>
                </div>

                {/* Host Info */}
                 {room.createdBy && (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
                        <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                            <AvatarImage src={room.createdBy.avatar} />
                            <AvatarFallback>{room.createdBy.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-xs text-muted-foreground">Hosted by</p>
                            <Link href={`/profile/${room.createdBy.id}`} className="text-sm font-semibold hover:underline decoration-1 underline-offset-4 decoration-primary/50 transition-all">
                                {room.createdBy.name}
                            </Link>
                        </div>
                    </div>
                )}
                
            </div>

            {/* Right Column: Action Card & Status */}
            <div className="lg:col-span-1 space-y-4">
                <div className="sticky top-20 space-y-4">
                    <Card className="border-border/50 shadow-lg shadow-primary/5 overflow-hidden backdrop-blur-sm bg-background/80 relative">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-blue-500" />
                        <CardHeader className="space-y-1 pb-3 pt-5 px-5">
                            <CardTitle className="flex justify-between items-center text-base">
                                <span>Session Details</span>
                                <Badge variant={isFull ? "destructive" : "secondary"} className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5">
                                    {isFull ? 'Full' : 'Open'}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 px-5 pb-5">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between py-1.5 border-b border-border/50 group text-sm">
                                    <div className="flex items-center text-muted-foreground group-hover:text-foreground transition-colors">
                                        <Users className="h-3.5 w-3.5 mr-2" />
                                        <span>Participants</span>
                                    </div>
                                    <span className="font-medium font-mono">{room.participantCount || 0} / {room.maxParticipants}</span>
                                </div>
                                
                                <div className="flex items-center justify-between py-1.5 border-b border-border/50 group text-sm">
                                    <div className="flex items-center text-muted-foreground group-hover:text-foreground transition-colors">
                                        <Coins className="h-3.5 w-3.5 mr-2" />
                                        <span>Entry Fee</span>
                                    </div>
                                    <span className="font-bold flex items-center gap-1.5">
                                        <span className="text-green-600 font-bold">{formatCoins(room.joiningFee)}</span>
                                        <span className="text-foreground text-[10px]">Coins</span>
                                    </span>
                                </div>
                            </div>

                            <div className="pt-1 space-y-2.5">
                                {role === "empty" && !isFull && authLoaded && isSignedIn && (
                                    <Button 
                                        size="default" 
                                        className="w-full font-semibold text-sm h-10 shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] rounded-lg bg-green-600 hover:bg-green-700 text-white"
                                        onClick={handleJoinRoom}
                                        disabled={isJoining}
                                    >
                                        {isJoining ? (
                                            <>
                                                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                                Joining...
                                            </>
                                        ) : (
                                            "Join Session"
                                        )}
                                    </Button>
                                )}

                                {role === "empty" && !isFull && authLoaded && !isSignedIn && (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50/90 dark:bg-amber-950/40 dark:border-amber-800 px-3 py-3 space-y-3">
                                        <p className="text-sm font-semibold text-foreground text-center sm:text-left">
                                            Sign in to join
                                        </p>
                                        <p className="text-xs text-muted-foreground text-center sm:text-left leading-relaxed">
                                          Use Sign in or Sign up—then you’ll join automatically from this link.
                                        </p>
                                        <Button
                                            size="default"
                                            type="button"
                                            disabled
                                            className="w-full font-semibold text-sm h-10 rounded-lg bg-muted text-muted-foreground cursor-not-allowed opacity-90"
                                        >
                                            Join Session
                                        </Button>
                                        <AuthPromptButtons className="w-full justify-center flex-wrap" />
                                    </div>
                                )}

                                {isFull && role === "empty" && (
                                    <Button size="default" disabled variant="secondary" className="w-full h-10 rounded-lg opacity-80 text-sm">
                                        Room Full
                                    </Button>
                                )}

                                {role !== "empty" && (
                                    <div className="w-full h-10 bg-green-500/10 text-green-600 border border-green-500/20 rounded-lg flex items-center justify-center text-sm font-medium">
                                        <Check className="h-3.5 w-3.5 mr-2" />
                                        You are enrolled
                                    </div>
                                )}

                                <ShareButton
                                    url={getStudyRoomShareUrl(slug)}
                                    title={room.title}
                                    description={room.description || ""}
                                    image={room.imageUrl}
                                    variant="outline"
                                    className="w-full rounded-lg h-9 hover:bg-primary/5 text-xs text-green-600 border-green-200/50 hover:text-green-700"
                                />
                                
                                {(role !== "empty" && role !== 'teacher')  && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full h-9 rounded-lg text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                      onClick={handleUnenroll}
                                      disabled={isUnenrolling}
                                    >
                                      {isUnenrolling ? "Unenrolling..." : "Unenroll Session"}
                                    </Button>
                                )}

                                {role === "teacher" &&
                                  (room.sessionStatus === SessionStatus.UPCOMING ||
                                    room.sessionStatus === SessionStatus.ONGOING) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full h-9 rounded-lg text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                      onClick={handleCancelRoom}
                                      disabled={cancelStudyRoom.isPending}
                                    >
                                      {cancelStudyRoom.isPending ? "Cancelling..." : "Cancel Session"}
                                    </Button>
                                  )}

                            </div>
                        </CardContent>
                    </Card>

                    {/* Live Session CTA Box */}
                    {(room.sessionStatus === SessionStatus.UPCOMING || room.sessionStatus === SessionStatus.ONGOING) && (role === "teacher" || role === "learner") && (
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3 backdrop-blur-sm">
                            <div className="space-y-0.5">
                               <h3 className="font-semibold text-sm tracking-tight flex items-center gap-2">
                                  {canJoinVideoCall ? (
                                    <>
                                        <span className="relative flex h-1.5 w-1.5">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                        </span>
                                        Classroom Open
                                    </>
                                  ) : (
                                    <>
                                        <Clock className="h-3.5 w-3.5 text-primary" />
                                        Starts Soon
                                    </>
                                  )}
                               </h3>
                               <p className="text-[10px] text-muted-foreground leading-relaxed">
                                   {canJoinVideoCall 
                                       ? "Jump in to collaborate with your peers." 
                                       : "Classroom opens 5 minutes before start."}
                               </p>
                            </div>
                            
                            {canJoinVideoCall ? (
                              !authLoaded ? (
                                <Button disabled size="sm" variant="outline" className="w-full h-9 rounded-lg text-xs">
                                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                  Loading…
                                </Button>
                              ) : isSignedIn ? (
                                <Link href={`/rooms/studyroom/${liveRoomName}`} className="block w-full">
                                  <Button size="sm" className="w-full h-9 rounded-lg bg-green-600 text-white hover:bg-green-700 shadow-sm transition-all text-xs">
                                    Enter Classroom
                                    <ArrowLeft className="h-3 w-3 ml-2 rotate-180" />
                                  </Button>
                                </Link>
                              ) : (
                                <div className="rounded-xl border border-amber-200 bg-amber-50/90 dark:bg-amber-950/40 dark:border-amber-800 px-3 py-3 space-y-2">
                                  <p className="text-xs font-semibold text-foreground text-center sm:text-left">
                                    Sign in to enter
                                  </p>
                                  <p className="text-[10px] text-muted-foreground text-center sm:text-left leading-relaxed">
                                    Sign in or sign up, then open Enter Classroom again (or refresh this page).
                                  </p>
                                  <Button
                                    size="sm"
                                    disabled
                                    className="w-full h-9 rounded-lg opacity-80 cursor-not-allowed text-xs"
                                  >
                                    Enter Classroom
                                  </Button>
                                  <AuthPromptButtons className="w-full justify-center flex-wrap" />
                                </div>
                              )
                            ) : (
                              <Button disabled size="sm" variant="outline" className="w-full h-9 rounded-lg bg-background/50 border-dashed text-xs">
                                Opens Soon
                              </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        {/* Reviews Section */}
        {/* <div className="mt-12 pt-6 border-t border-border/40">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                Reviews & Feedback
                <Badge variant="secondary" className="bg-secondary/50 rounded-full h-5 px-2 text-xs">
                    Community
                </Badge>
            </h2>

            {room.sessionStatus === SessionStatus.DONE && (
                <div className="mb-8 p-4 rounded-xl bg-secondary/20 border border-border/50">
                    <h3 className="text-base font-semibold mb-1">Session Ended</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed max-w-2xl">
                        This session has concluded. Thank you for participating! Check below for community feedback.
                    </p>
                    {role === 'learner' && (
                        <div className="mt-4">
                            <Link href={`/submit-review/${roomId}?type=studyRoom`}>
                              <Button variant="outline" size="sm" className="rounded-full px-4 h-8 text-xs border-primary/20 text-primary hover:bg-primary/5 hover:text-primary hover:border-primary/50">
                                Write a Review
                              </Button>
                            </Link>
                        </div>
                    )}
                </div>
            )}

            <ReviewsSection 
              targetId={roomId} 
              targetType="study-room" 
            />
        </div> */}

          <RecurringActionModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onConfirm={handleConfirmRecurring}
                    actionType="join"
                  />

          <RecurringActionModal
              isOpen={isLeaveModalOpen}
              actionType="leave"
              title="Unenrollment Options"
              onClose={() => setIsLeaveModalOpen(false)}
              onConfirm={handleConfirmLeave}
        />

      </main>
      <Footer />

      {showHostDetailMenu && (
        <StudyRoomHostEditDialog
          open={hostEditOpen}
          onOpenChange={setHostEditOpen}
          roomId={slug}
          initialTitle={room.title}
          initialDescription={room.description}
          initialDate={room.date}
          initialDuration={room.duration}
          initialMaxParticipants={room.maxParticipants}
          initialJoiningFee={Number(room.joiningFee ?? 0)}
          initialSkillNames={hostEditSkillNames}
          initialTimezone={room.timezone ?? null}
          initialImageUrl={room.imageUrl ?? null}
          seriesId={room.seriesId ?? null}
        />
      )}
    </div>
  );
}

