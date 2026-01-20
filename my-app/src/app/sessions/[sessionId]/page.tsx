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
  Calendar,
  Users,
  ExternalLink,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { usePeerSessionDetails, useUpdatePeerSessionStatus } from "@/hooks/use-peer-sessions";
import { useAuth } from "@clerk/nextjs";
import { setAuthToken } from "@/lib/api-client";
import { useToast } from "@/contexts/toast-context";
import Link from "next/link";
import { SessionStatus } from "@/types";
import { ReviewsSection } from "@/components/reviews/reviews-section";

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
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Session Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold">{session.title}</h1>
                  {getStatusBadge()}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {isRequester && <span>You requested this session</span>}
                  {isRequestedTo && <span>You were requested for this session</span>}
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
                    {formattedTime} ({session.duration} min)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Participants</p>
                  <p className="font-medium">2</p>
                </div>
              </div>

              {session.gmeetLink && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Meeting Link</p>
                    {!session.gmeetLink || session.gmeetLink === "https://meet.google.com/your-meeting-code" ? (
                      <span className="font-medium text-muted-foreground">
                        No meeting link provided
                      </span>
                    ) : (
                      <a 
                        href={session.gmeetLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:text-blue-800 underline"
                      >
                        Join Meeting
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

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
          </CardContent>
        </Card>

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
                  <Link href={`/rooms/${liveRoomName}`}>
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

        {/* Participants */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Requester */}
              <Link 
                href={`/profile/${session.requestedBy.id}`}
                className="flex items-center gap-4 hover:bg-muted/50 rounded-lg p-3 -m-3 transition-colors group"
              >
                <Avatar className="h-16 w-16 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                  <AvatarImage
                    src={session.requestedBy.avatar}
                    alt={session.requestedBy.name}
                  />
                  <AvatarFallback>
                    {session.requestedBy.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium group-hover:text-primary transition-colors">{session.requestedBy.name}</p>
                  <p className="text-sm text-muted-foreground">Session Requester</p>
                  {isRequester && (
                    <Badge variant="outline" className="mt-1">You</Badge>
                  )}
                </div>
              </Link>

              {/* Requested To */}
              <Link 
                href={`/profile/${session.requestedTo.id}`}
                className="flex items-center gap-4 hover:bg-muted/50 rounded-lg p-3 -m-3 transition-colors group"
              >
                <Avatar className="h-16 w-16 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                  <AvatarImage
                    src={session.requestedTo.avatar}
                    alt={session.requestedTo.name}
                  />
                  <AvatarFallback>
                    {session.requestedTo.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium group-hover:text-primary transition-colors">{session.requestedTo.name}</p>
                  <p className="text-sm text-muted-foreground">Session Provider</p>
                  {isRequestedTo && (
                    <Badge variant="outline" className="mt-1">You</Badge>
                  )}
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {session.description || "No additional details provided."}
            </p>
          </CardContent>
        </Card>

        {/* Status-specific information */}
        {session.sessionStatus === SessionStatus.PENDING && (
          <Card className="mb-8 border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">Session Pending</p>
              </div>
              <p className="text-yellow-700 mt-2">
                {isRequestedTo 
                  ? "You have been requested for this session. Please accept or decline the request."
                  : "Your session request is pending approval from the other participant."
                }
              </p>
            </CardContent>
          </Card>
        )}

        {session.sessionStatus === SessionStatus.UPCOMING && session.gmeetLink && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-blue-800">
                <ExternalLink className="h-5 w-5" />
                <p className="font-medium">Session Accepted</p>
              </div>
              <p className="text-blue-700 mt-2 mb-4">
                Your session has been accepted! {!session.gmeetLink || session.gmeetLink === "https://meet.google.com/your-meeting-code"
                  ? "A meeting link will be provided by the session organizer."
                  : "Use the meeting link below to join when it's time."
                }
              </p>
              {!session.gmeetLink || session.gmeetLink === "https://meet.google.com/your-meeting-code" ? (
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <a 
                    href="https://meet.google.com/new" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Create Google Meet
                  </a>
                </Button>
              ) : (
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <a 
                    href={session.gmeetLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Join Google Meet
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {session.sessionStatus === SessionStatus.DONE && (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <p className="font-medium">Session Completed</p>
              </div>
              <p className="text-green-700 mt-2">
                This session has been completed successfully. Thank you for participating!
              </p>
              <div className="mt-4">
                <Link href={`/submit-review/${sessionId}?type=peerSession`}>
                  <Button className="bg-green-600 hover:bg-green-700">
                    Leave a Review
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {session.sessionStatus === SessionStatus.CANCELLED && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-800">
                <XCircle className="h-5 w-5" />
                <p className="font-medium">Session Cancelled</p>
              </div>
              <p className="text-red-700 mt-2">
                This session has been cancelled. Any payments have been refunded.
              </p>
            </CardContent>
          </Card>
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
        <ReviewsSection 
          sessionId={sessionId} 
          showTitle={true}
        />
      </main>

      <Footer />
    </div>
  );
}
