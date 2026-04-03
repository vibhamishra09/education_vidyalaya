"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Eye,
  Pencil,
  PencilLine
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { SessionSummaryModal } from "./session-summary-modal";

interface Session {
  id: string;
  title: string;
  date: string | Date;
  duration: number;
  skills?: Array<{ name: string } | string>;
  status?: string;
  sessionStatus?: string;
  participantCount?: number;
  maxParticipants?: number;
  requestedBy?: unknown;
  hostName?: string;
  description?: string;
  /** Peer/group: show after host-details update (any participant). */
  detailsEditedForViewer?: boolean;
  /** Peer session: show Edit on the card (both requester and receiver when session is still editable). */
  peerSessionEditable?: boolean;
  slug?: string | null;
}

interface SessionListProps {
  upcomingSessions?: Session[];
  ongoingSessions?: Session[];
  pastSessions?: Session[];
  isLoading?: boolean;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  hasNextPage?: boolean;
}

export function SessionList({
  upcomingSessions = [],
  ongoingSessions = [],
  pastSessions = [],
  currentPage = 1,
  onPageChange,
  hasNextPage = false
}: SessionListProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "ongoing" | "past">("upcoming");
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<{ id: string; type: "peer" | "study-room" } | null>(null);

  const toggleExpand = (sessionId: string) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  const handleViewSummary = (sessionId: string, isPeerSession: boolean) => {
    setSelectedSession({
      id: sessionId,
      type: isPeerSession ? "peer" : "study-room"
    });
    setSummaryModalOpen(true);
  };

  const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const SessionCard = ({
    session,
    showActions = true,
    showSummaryButton = false,
    onViewSummary
  }: {
    session: Session;
    showActions?: boolean;
    showSummaryButton?: boolean;
    onViewSummary?: () => void;
  }) => {
    const isExpanded = expandedSession === session.id;
    // A session is a peer session if it has requestedBy AND doesn't have participantCount/maxParticipants
    // Study rooms have participantCount/maxParticipants, peer sessions don't
    const isPeerSession = session.requestedBy !== undefined &&
      session.participantCount === undefined &&
      session.maxParticipants === undefined;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-base truncate">
                    {session.title}
                  </h3>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {isPeerSession ? "1-on-1" : "Group"}
                  </Badge>
                  {session.detailsEditedForViewer ? (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-2 py-0 font-semibold uppercase tracking-wide flex-shrink-0"
                    >
                      Edited
                    </Badge>
                  ) : null}
                  {activeTab === "ongoing" && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs flex-shrink-0">
                      Ongoing
                    </Badge>
                  )}
                </div>

                {/* Quick Info */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(session.date)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatTime(session.date)} ({session.duration}m)</span>
                  </div>
                  {!isPeerSession && session.maxParticipants && (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>
                        {session.participantCount || 0}/{session.maxParticipants}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {isPeerSession && session.peerSessionEditable && (
                  <Link href={`/sessions/${session.id}`}>
                    <Button variant="outline" size="sm" className="h-8 gap-1 px-2">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpand(session.id)}
                  className="flex-shrink-0"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Skills - Always visible */}
            {session.skills && session.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {session.skills.slice(0, isExpanded ? undefined : 3).map((skill, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {typeof skill === 'string' ? skill : skill.name}
                  </Badge>
                ))}
                {!isExpanded && session.skills.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{session.skills.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            {/* Expanded Details */}
            {isExpanded && (
              <div className="pt-3 border-t space-y-3 animate-in slide-in-from-top-2 duration-200">
                {session.description && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground font-tagline">
                      {session.description}
                    </p>
                  </div>
                )}

                {session.hostName && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Host</h4>
                    <p className="text-sm text-muted-foreground">
                      {session.hostName}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {showActions && (
                  <div className="flex gap-2 pt-2">
                    <Link
                      href={
                        isPeerSession
                          ? `/sessions/${session.id}`
                          : `/studyroom/${session.slug || session.id}`
                      }
                      className="flex-1"
                    >
                      <Button variant="outline" className="w-full gap-2" size="sm">
                        <BookOpen className="h-4 w-4 shrink-0" />
                        <span className="flex-1 text-center sm:text-left">View details</span>
                        {session.detailsEditedForViewer ? (
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-[10px] px-2 py-0 font-semibold uppercase tracking-wide"
                          >
                            Edited
                          </Badge>
                        ) : null}
                      </Button>
                    </Link>

                    {(() => {
                      const now = new Date();
                      const sessionTime = new Date(session.date);
                      const timeDifferenceMs = sessionTime.getTime() - now.getTime();
                      const minutesBeforeStart = timeDifferenceMs / (1000 * 60);

                      const canJoin =
                        isPeerSession &&
                        (session.sessionStatus === "UPCOMING" || session.sessionStatus === "ONGOING") &&
                        minutesBeforeStart <= 5;

                      if (!canJoin) return null;

                      return (
                        <Link
                          href={`/rooms/studyroom/peersession-${session.id}`}
                          className="flex-1"
                        >
                          <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white" size="sm">
                            <Video className="h-4 w-4 shrink-0" />
                            <span className="flex-1 text-center sm:text-left">Join Live</span>
                          </Button>
                        </Link>
                      );
                    })()}
                  </div>
                )}
                {showSummaryButton && onViewSummary && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={onViewSummary}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Summary
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ message, icon: Icon }: { message: string; icon: LucideIcon }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center py-8 text-muted-foreground">
          <Icon className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">{message}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="w-full">
        <div className="grid w-full grid-cols-3 h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              activeTab === "upcoming" ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 hover:text-foreground"
            )}
            onClick={() => setActiveTab("upcoming")}
          >
            Upcoming
            {upcomingSessions.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {upcomingSessions.length}
              </Badge>
            )}
          </button>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              activeTab === "ongoing" ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 hover:text-foreground"
            )}
            onClick={() => setActiveTab("ongoing")}
          >
            Ongoing
            {ongoingSessions.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700">
                {ongoingSessions.length}
              </Badge>
            )}
          </button>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              activeTab === "past" ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 hover:text-foreground"
            )}
            onClick={() => setActiveTab("past")}
          >
            Past
            {pastSessions.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {pastSessions.length}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* Session Lists */}
      <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        {activeTab === "upcoming" && (
          <>
            {upcomingSessions.length === 0 ? (
              <EmptyState message="No upcoming sessions" icon={Calendar} />
            ) : (
              upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))
            )}
          </>
        )}

        {activeTab === "ongoing" && (
          <>
            {ongoingSessions.length === 0 ? (
              <EmptyState message="No ongoing sessions" icon={Clock} />
            ) : (
              ongoingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))
            )}
          </>
        )}

        {activeTab === "past" && (
          <>
            {pastSessions.length === 0 ? (
              <EmptyState message="No past sessions" icon={BookOpen} />
            ) : (
              pastSessions.map((session) => {
                const isPeerSession = "requestedBy" in session;
                return (
                  <SessionCard
                    key={session.id}
                    session={session}
                    showActions={false}
                    showSummaryButton={true}
                    onViewSummary={() => handleViewSummary(session.id, isPeerSession)}
                  />
                );
              })
            )}
          </>
        )}
      </div>

      {/* Pagination Controls */}
      {onPageChange && (
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasNextPage && (
              (activeTab === "upcoming" && upcomingSessions.length < 10) ||
              (activeTab === "past" && pastSessions.length < 10)
            )}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Session Summary Modal */}
      {selectedSession && (
        <SessionSummaryModal
          open={summaryModalOpen}
          onOpenChange={setSummaryModalOpen}
          sessionId={selectedSession.id}
          sessionType={selectedSession.type}
        />
      )}
    </div>
  );
}
