"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  Clock,
  Users,
  User,
  FileText,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { setAuthToken } from "@/lib/api-client";
import { peerSessionsApi, studyRoomsApi } from "@/lib/api";
import { PeerSession, StudyRoom } from "@/types/api.types";
import ReactMarkdown from "react-markdown";

interface SessionSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionType: "peer" | "study-room";
}

export function SessionSummaryModal({
  open,
  onOpenChange,
  sessionId,
  sessionType,
}: SessionSummaryModalProps) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<PeerSession | StudyRoom | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && sessionId) {
      fetchSessionDetails();
    }
  }, [open, sessionId]);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }

      let data;
      if (sessionType === "peer") {
        data = await peerSessionsApi.getPeerSessionDetails(sessionId);
      } else {
        data = await studyRoomsApi.getStudyRoomDetails(sessionId);
      }

      setSession(data);
    } catch (err) {
      console.error("Error fetching session details:", err);
      setError("Failed to load session details");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const isPeerSession = (
    session: PeerSession | StudyRoom
  ): session is PeerSession => {
    return "requestedBy" in session;
  };

  const getHost = () => {
    if (!session) return null;
    if (isPeerSession(session)) {
      return session.requestedBy;
    }
    return (session as StudyRoom).createdBy;
  };

  const getParticipants = () => {
    if (!session) return [];
    if (isPeerSession(session)) {
      return [session.requestedBy, session.requestedTo];
    }
    return (session as StudyRoom).participants || [];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Meeting Summary
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-80px)] px-6 pb-6">
          {loading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">{error}</p>
            </div>
          ) : session ? (
            <div className="space-y-6 py-4">
              {/* Session Title */}
              <div>
                <h2 className="text-xl font-semibold mb-2">{session.title}</h2>
                <Badge variant="outline" className="text-xs">
                  {isPeerSession(session) ? "1-on-1 Session" : "Group Study Room"}
                </Badge>
              </div>

              {/* Session Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 rounded-lg p-4">
                {/* Date */}
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(session.date)}
                    </p>
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Time & Duration</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(session.date)} · {formatDuration(session.duration)}
                    </p>
                  </div>
                </div>

                {/* Host */}
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Host</p>
                    <p className="text-sm text-muted-foreground">
                      {getHost()?.name || "Unknown"}
                    </p>
                  </div>
                </div>

                {/* Participants */}
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      {isPeerSession(session) ? "Participants" : "Attendees"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isPeerSession(session)
                        ? "2 participants"
                        : `${getParticipants().length}/${
                            (session as StudyRoom).maxParticipants
                          } participants`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Participants List */}
              {!isPeerSession(session) && getParticipants().length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3">Participants</h3>
                  <div className="flex flex-wrap gap-2">
                    {getParticipants().map((participant, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {participant.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {isPeerSession(session) && (
                <div>
                  <h3 className="text-sm font-medium mb-3">Participants</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {session.requestedBy.name}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {session.requestedTo.name}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Skills/Topics */}
              {session.skills && session.skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3">Topics Covered</h3>
                  <div className="flex flex-wrap gap-2">
                    {session.skills.map((skill, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {typeof skill === "string" ? skill : skill.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {session.description && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground">
                    {session.description}
                  </p>
                </div>
              )}

              {/* AI Summary */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI-Generated Summary
                </h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  {(session as any).summary ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>
                        {(session as any).summary}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No summary available</p>
                      <p className="text-xs mt-1">
                        The AI summary will be generated after the meeting ends.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
