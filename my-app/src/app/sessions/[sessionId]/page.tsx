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
  Clock,
  Users,
  ExternalLink,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { usePeerSessionDetails, useUpdatePeerSessionStatus } from "@/hooks/use-peer-sessions";
import { useAuth } from "@clerk/nextjs";
import { setAuthToken } from "@/lib/api-client";
import { useToast } from "@/contexts/toast-context";
import Link from "next/link";
import { SessionStatus } from "@/types";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { PeerSessionEditDialog } from "@/components/peer/peer-session-edit-dialog";

export default function PeerSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const { getToken } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [canJoinVideoCall, setCanJoinVideoCall] = useState(false);
  const [canCancel, setCanCancel] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  
  const { data: session, isLoading, error } = usePeerSessionDetails(sessionId);
  const updateSessionStatus = useUpdatePeerSessionStatus();

  // Check if video call can be joined (within 5 minutes of start time)
  // and if cancellation is still allowed (before scheduled time)
  useEffect(() => {
    if (!session) {
      setCanJoinVideoCall(false);
      setCanCancel(true);
      return;
    }

    // If session is ongoing, always allow joining
    if (session.sessionStatus === SessionStatus.ONGOING) {
      setCanJoinVideoCall(true);
      setCanCancel(false);
      return;
    }

    if (session.sessionStatus !== SessionStatus.UPCOMING && session.sessionStatus !== SessionStatus.PENDING) {
      setCanJoinVideoCall(false);
      setCanCancel(false);
      return;
    }

    const checkAvailability = () => {
      const now = new Date();
      const scheduledStart = new Date(session.date);
      const fiveMinutesBefore = new Date(scheduledStart.getTime() - 5 * 60 * 1000);
      
      // Enable joining if current time is >= 5 minutes before start time
      setCanJoinVideoCall(now >= fiveMinutesBefore && session.sessionStatus === SessionStatus.UPCOMING);
      
      // Disable cancel if scheduled time has passed
      setCanCancel(now < scheduledStart);
    };

    // Check immediately
    checkAvailability();

    // Update every minute
    const interval = setInterval(checkAvailability, 60000);

    return () => clearInterval(interval);
  }, [session]);

  // Handle session status updates
  const handleStatusUpdate = async (newStatus: SessionStatus) => {
    if (!session) return;
    
    try {
      setIsUpdating(true);
      
      // Get token and set it for API calls
      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }
      
      await updateSessionStatus.mutateAsync({
        sessionId,
        status: newStatus,
      });
      
      const statusMessages: Record<SessionStatus, string> = {
        [SessionStatus.PENDING]: "Session status updated!",
        [SessionStatus.UPCOMING]: "Session accepted successfully!",
        [SessionStatus.CANCELLED]: "Session cancelled successfully!",
        [SessionStatus.DONE]: "Session marked as complete!",
        [SessionStatus.ONGOING]: "Session status updated!",
        [SessionStatus.NOT_COMPLETED]: "Session marked as not completed.",
      };
      
      showSuccess("Status Updated", statusMessages[newStatus]);
      
    } catch (error: unknown) {
      console.error('Error updating session status:', error);
      showError("Failed to Update", "Failed to update session status. Please try again.");
    } finally {
      setIsUpdating(false);
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

  if (error || !session) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Session not found</h1>
            <Link href="/dashboard">
              <Button className="mt-4">Back to Dashboard</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Use role from API response (determined on backend)
  const role = session.role || 'empty';
  const isRequester = role === 'requester';
  const isRequestedTo = role === 'requestedTo';
  const isParticipant = role === 'requester' || role === 'requestedTo'; // User is a participant in the session
  const canEditPeerSession =
    isParticipant &&
    session.sessionStatus !== SessionStatus.DONE &&
    session.sessionStatus !== SessionStatus.CANCELLED &&
    session.sessionStatus !== SessionStatus.NOT_COMPLETED;
  const canAccept = isRequestedTo && session.sessionStatus === SessionStatus.PENDING;
  // Cancel is allowed only before scheduled time and when status is PENDING or UPCOMING
  const canCancelSession = isParticipant && 
    (session.sessionStatus === SessionStatus.PENDING || session.sessionStatus === SessionStatus.UPCOMING) &&
    canCancel; // canCancel is computed in useEffect based on time
  // No manual complete - session completes automatically when time ends in the video room

  const formattedDate = new Date(session.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = new Date(session.date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const liveRoomName = `peersession-${sessionId}`;

  const myParticipantUserId =
    role === "requester"
      ? session.requestedBy.id
      : role === "requestedTo"
        ? session.requestedTo.id
        : null;
  const showPeerDetailsUpdatedBanner =
    myParticipantUserId != null &&
    !!session.hostDetailsUpdatedAt &&
    !!session.lastDetailsEditedById &&
    session.lastDetailsEditedById !== myParticipantUserId;

  const getStatusBadge = () => {
    switch (session.sessionStatus) {
      case SessionStatus.PENDING:
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
      case SessionStatus.UPCOMING:
        return <Badge variant="default" className="bg-blue-800 text-white border-blue-800">Upcoming</Badge>;
      case SessionStatus.ONGOING:
        return <Badge variant="destructive">Live Now</Badge>;
      case SessionStatus.DONE:
        return <Badge variant="secondary" className="text-green-600 border-green-600">Completed</Badge>;
      case SessionStatus.CANCELLED:
        return <Badge variant="destructive">Cancelled</Badge>;
      case SessionStatus.NOT_COMPLETED:
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Not Completed</Badge>;
      default:
        return <Badge variant="outline">{session.sessionStatus}</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/10 selection:text-primary">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        {/* Back Button */}
        <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-12 transition-colors group">
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>

        {showPeerDetailsUpdatedBanner ? (
          <div
            role="status"
            className="mb-8 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground"
          >
            <p className="font-medium">Meeting details have been changed</p>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Last updated{" "}
              {new Date(session.hostDetailsUpdatedAt!).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              . Check the scheduled time and meeting link below.
            </p>
          </div>
        ) : null}

        {/* Header Section */}
        <div className="space-y-8 mb-16">
            <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                   {getStatusBadge()}
                   {isRequester && <Badge variant="secondary" className="rounded-full px-3 py-0.5">Requester</Badge>}
                   {isRequestedTo && <Badge variant="secondary" className="rounded-full px-3 py-0.5">Invited</Badge>}
                   
                   {/* Topics/Skills */}
                   {session.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted/80 rounded-full px-3 py-0.5">
                        {skill.name}
                      </Badge>
                   ))}
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                     <div className="flex flex-wrap items-center gap-3 max-w-2xl">
                       <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight">
                         {session.title}
                       </h1>
                       {canEditPeerSession && (
                         <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           className="rounded-full shrink-0"
                           onClick={() => setEditOpen(true)}
                         >
                           <Pencil className="h-4 w-4 mr-1.5" />
                           Edit
                         </Button>
                       )}
                     </div>
                     
                     <div className="flex flex-wrap gap-3">
                        {canAccept && (
                          <Button 
                            onClick={() => handleStatusUpdate(SessionStatus.UPCOMING)}
                            disabled={isUpdating}
                            className="rounded-full px-6"
                          >
                            {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                            Accept Session
                          </Button>
                        )}

                        {canCancelSession && (
                          <Button 
                            variant="destructive"
                            onClick={() => handleStatusUpdate(SessionStatus.CANCELLED)}
                            disabled={isUpdating}
                            className="rounded-full px-6"
                          >
                            {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                            Cancel Session
                          </Button>
                        )}
                     </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {canAccept && (
                  <Button 
                    size="lg" 
                    onClick={() => handleStatusUpdate(SessionStatus.UPCOMING)}
                    disabled={isUpdating}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Accept Session
                  </Button>
                )}

                {canCancelSession && (
                  <Button 
                    size="lg" 
                    variant="destructive"
                    onClick={() => handleStatusUpdate(SessionStatus.CANCELLED)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Cancel Session
                  </Button>
                )}
              </div>

            {/* Time */}
            <div className="space-y-1">
               <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</span>
               <div className="flex items-center gap-2 text-foreground font-medium">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {formattedTime} <span className="text-muted-foreground font-normal text-sm">({session.duration} min)</span>
               </div>
            </div>

            {/* Participants Count */}
            <div className="space-y-1">
               <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Participants</span>
               <div className="flex items-center gap-2 text-foreground font-medium">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  2
               </div>
            </div>

            {/* Gmeet */}
            {session.gmeetLink && (
                 <div className="space-y-1">
                   <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meeting</span>
                   {!session.gmeetLink || session.gmeetLink === "https://meet.google.com/your-meeting-code" ? (
                      <span className="text-muted-foreground text-sm">Not provided</span>
                    ) : (
                      <a 
                        href={session.gmeetLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary font-medium hover:underline text-sm"
                      >
                        <ExternalLink className="h-3 w-3" />
                         Join
                      </a>
                    )}
                </div>
            )}
        </div>

        {/* Status Alerts (Banner style) */}
        {session.sessionStatus === SessionStatus.PENDING && (
          <div className="rounded-lg bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-200/50 dark:border-yellow-900/20 p-4 mb-12 flex items-start gap-4 text-yellow-800 dark:text-yellow-600">
             <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
             <div>
                <p className="font-semibold">Session Pending</p>
                <p className="text-sm mt-1 opacity-90">
                 {isRequestedTo 
                  ? "You have been requested for this session. Please accept or decline the request."
                  : "Your session request is pending approval from the other participant."
                }
                </p>
             </div>
          </div>
        )}

        <div className="mt-6">
              <p className="text-sm font-medium mb-2">Topics:</p>
              <div className="flex flex-wrap gap-2">
                {session.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary">
                    {skill.name}
                  </Badge>
                ))}
              </div>
        </div>

      {/* Live Session (LiveKit) - Only show for participants */}
      {(session.sessionStatus === SessionStatus.UPCOMING || session.sessionStatus === SessionStatus.ONGOING) && isParticipant && (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Live Session</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {canJoinVideoCall ? (
                  <Link href={`/rooms/studyroom/${liveRoomName}`}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Join Live Session
                    </Button>
                  </Link>
                ) : (
                  <div className="space-y-2">
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700" 
                      disabled
                    >
                      Join Live Session
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Video call will be available 5 minutes before the scheduled start time.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

        {/* Participants Row */}
        <div className="mb-16">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6">Participants</h3>
            <div className="grid sm:grid-cols-2 gap-8">
               {/* Requester */}
              <Link 
                href={`/profile/${session.requestedBy.id}`}
                className="flex items-center gap-4 group p-4 rounded-xl border border-border/50 hover:border-border hover:bg-muted/30 transition-all"
              >
                <Avatar className="h-12 w-12 border border-border">
                  <AvatarImage
                    src={session.requestedBy.avatar}
                    alt={session.requestedBy.name}
                  />
                  <AvatarFallback>{session.requestedBy.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{session.requestedBy.name}</p>
                  <p className="text-xs text-muted-foreground">Requester {isRequester && "(You)"}</p>
                </div>
              </Link>
              
               {/* Requested To */}
              <Link 
                href={`/profile/${session.requestedTo.id}`}
                className="flex items-center gap-4 group p-4 rounded-xl border border-border/50 hover:border-border hover:bg-muted/30 transition-all"
              >
                <Avatar className="h-12 w-12 border border-border">
                  <AvatarImage
                    src={session.requestedTo.avatar}
                    alt={session.requestedTo.name}
                  />
                  <AvatarFallback>{session.requestedTo.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{session.requestedTo.name}</p>
                  <p className="text-xs text-muted-foreground">Provider {isRequestedTo && "(You)"}</p>
                </div>
              </Link>
            </div>
        </div>

      {/* Live Session (LiveKit) - Only show for participants */}
      {(session.sessionStatus === SessionStatus.UPCOMING || session.sessionStatus === SessionStatus.ONGOING) && isParticipant && (
        <div className="rounded-2xl border border-border bg-card p-8 flex flex-col md:flex-row items-center justify-between gap-8 mb-16 shadow-sm">
             <div className="space-y-2 text-center md:text-left">
               <h3 className="text-xl font-semibold tracking-tight">
                  Live Session
               </h3>
               <p className="text-muted-foreground max-w-md">
                   {canJoinVideoCall 
                       ? "The session room is ready. Join now to start." 
                       : "Video call will be available 5 minutes before the scheduled start time."}
               </p>
            </div>
            {canJoinVideoCall ? (
                  <Link href={`/rooms/studyroom/${liveRoomName}`} className="w-full md:w-auto">
                    <Button size="lg" className="w-full md:w-auto px-8 rounded-full h-12 shadow-sm">
                      Join Live Session
                    </Button>
                  </Link>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Button disabled size="lg" variant="secondary" className="w-full md:w-auto px-8 rounded-full h-12 bg-muted text-muted-foreground opacity-50">
                        Join Live Session
                    </Button>
                  </div>
                )}
        </div>
      )}

        {/* Completion Status */}
        {session.sessionStatus === SessionStatus.DONE && (
          <div className="mb-16 border rounded-xl p-6 bg-green-50/30 dark:bg-green-900/10 border-green-100 dark:border-green-800/30">
               <div className="flex items-center gap-2 text-green-700 dark:text-green-500 mb-2">
                <CheckCircle className="h-5 w-5" />
                <p className="font-semibold">Session Completed</p>
              </div>
              <p className="text-muted-foreground mb-4">
                This session has been completed successfully. Thank you for participating!
              </p>
               <Link href={`/submit-review/${sessionId}?type=peerSession`}>
                  <Button variant="outline" className="rounded-full">
                    Leave a Review
                  </Button>
                </Link>
          </div>
        )}

        {session.sessionStatus === SessionStatus.CANCELLED && (
           <div className="mb-16 border rounded-xl p-6 bg-red-50/30 dark:bg-red-900/10 border-red-100 dark:border-red-800/30">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-500 mb-2">
                <XCircle className="h-5 w-5" />
                <p className="font-semibold">Session Cancelled</p>
              </div>
              <p className="text-muted-foreground">
                This session has been cancelled. Any payments have been refunded.
              </p>
          </div>
        )}

        {session.sessionStatus === SessionStatus.NOT_COMPLETED && (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">Session Not Completed</p>
              </div>
              <p className="text-orange-700 mt-2">
                This session was not completed properly. Any payments have been refunded.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Reviews Section */}
        <div className="pt-8 border-t border-border/50">
             <ReviewsSection 
              sessionId={sessionId} 
              showTitle={true}
            />
        </div>

      </main>

      <PeerSessionEditDialog
        sessionId={sessionId}
        open={editOpen}
        onOpenChange={setEditOpen}
        session={session}
      />
      <Footer />
    </div>
  );
}
