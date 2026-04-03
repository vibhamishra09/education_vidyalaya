"use client";

import { memo, useMemo, useState, useCallback } from "react";
import { Calendar, Clock, Users, TrendingUp, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StreakTrackerConnected } from "@/components/profile/streak-tracker-connected";
import { SessionRequestCard } from "@/components/cards/session-request-card";
import { SessionList } from "@/components/dashboard/session-list";
import { useDashboard, dashboardKeys } from "@/hooks/use-dashboard";
import { useToast } from "@/contexts/toast-context";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { peerSessionsApi } from "@/lib/api";
import { setAuthToken } from "@/lib/api-client";
import { peerSessionKeys } from "@/hooks/use-peer-sessions";
import { useCurrentUser } from "@/hooks/use-users";
import type {
  PendingRequest,
  PastSession,
  PastStudyRoom,
  UpcomingSession,
  UpcomingStudyRoom,
  PublicUserStats,
} from "@/types/api.types";

interface SessionsTabProps {
  publicStats?: PublicUserStats;
  isLoading?: boolean;
}

export const SessionsTab = memo(function SessionsTab({ publicStats, isLoading = false }: SessionsTabProps) {
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const sessionsPerPage = 10;

  const { data: currentUserData } = useCurrentUser();
  const myUserId = currentUserData?.user?.id;

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = useDashboard({
    includeRequests: true,
    includeSessions: true,
    page: currentPage,
    limit: sessionsPerPage,
  });
  
  // Calculate stats from publicStats and dashboardData
  const stats = useMemo(() => {
    if (!publicStats) return null;
    const totalSessions = (publicStats.sessionsTaught || 0) + (publicStats.sessionsAttendedAsLearner || 0);
    
    // Calculate hours completed from past sessions and study rooms
    const pastSessions = dashboardData?.pastSessions || [];
    const pastStudyRooms = dashboardData?.pastStudyRooms || [];
    const totalMinutes = [...pastSessions, ...pastStudyRooms].reduce((sum, session) => sum + (session.duration || 0), 0);
    const hoursCompleted = Math.round(totalMinutes / 60);
    
    // Calculate completion rate: (acceptedSessions / totalSessionRequests) * 100
    const completionRate = publicStats.totalSessionRequests > 0 
      ? Math.round((publicStats.acceptedSessions / publicStats.totalSessionRequests) * 100) 
      : 0;
    
    return {
      totalSessions,
      hoursCompleted,
      averageRating: publicStats.avgRating || 0,
      completionRate,
    };
  }, [publicStats, dashboardData?.pastSessions, dashboardData?.pastStudyRooms]);

  const isDataLoading = isLoading;
  const pendingRequests = dashboardData?.pendingRequests || [];

  const splitByToday = <T extends { date: string | Date }>(items: T[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return items.reduce(
      (acc, item) => {
        const itemDate = new Date(item.date);
        itemDate.setHours(0, 0, 0, 0);
        if (itemDate.getTime() === today.getTime()) {
          acc.today.push(item);
        } else if (itemDate.getTime() > today.getTime()) {
          acc.future.push(item);
        }
        return acc;
      },
      { today: [] as T[], future: [] as T[] }
    );
  };

  const { today: todayPeerSessions, future: futurePeerSessions } = useMemo(
    () => splitByToday(dashboardData?.upcomingSessions ?? []),
    [dashboardData?.upcomingSessions]
  );

  const { today: todayStudyRooms, future: futureStudyRooms } = useMemo(
    () => splitByToday(dashboardData?.upcomingStudyRooms ?? []),
    [dashboardData?.upcomingStudyRooms]
  );

  const formatPeerSession = useCallback((session: UpcomingSession | PastSession) => ({
    ...session,
    id: session.id,
    title: session.title,
    date: session.date,
    duration: session.duration,
    skills: session.skills,
    description: session.description,
    requestedBy: session.requestedBy,
    hostName: session.peer?.name,
    detailsEditedForViewer:
      !!session.hostDetailsUpdatedAt &&
      !!session.lastDetailsEditedById &&
      !!myUserId &&
      session.lastDetailsEditedById !== myUserId,
  }), [myUserId]);

  const formatStudyRoom = useCallback((room: UpcomingStudyRoom | PastStudyRoom) => ({
    ...room,
    id: room.id,
    title: room.title,
    date: room.date,
    duration: room.duration,
    skills: room.skills,
    description: room.description,
    participantCount: room.participantCount,
    maxParticipants: room.maxParticipants,
    hostName: room.createdBy?.name,
    detailsEditedForViewer:
      !!room.hostDetailsUpdatedAt &&
      !!myUserId &&
      room.createdBy?.id !== myUserId,
  }), [myUserId]);

  const upcomingList = useMemo(
    () => [
      ...futurePeerSessions.map(formatPeerSession),
      ...futureStudyRooms.map(formatStudyRoom),
    ],
    [futurePeerSessions, futureStudyRooms, formatPeerSession, formatStudyRoom]
  );

  const ongoingList = useMemo(
    () => [
      ...todayPeerSessions.map(formatPeerSession),
      ...todayStudyRooms.map(formatStudyRoom),
    ],
    [todayPeerSessions, todayStudyRooms, formatPeerSession, formatStudyRoom]
  );

  const pastList = useMemo(() => {
    const pastSessions = dashboardData?.pastSessions ?? [];
    const pastStudyRooms = dashboardData?.pastStudyRooms ?? [];
    console.log('📊 [Sessions] Past peer sessions:', pastSessions.length);
    console.log('📊 [Sessions] Past study rooms:', pastStudyRooms.length);
    const combined = [
      ...pastSessions.map(formatPeerSession),
      ...pastStudyRooms.map(formatStudyRoom),
    ];
    console.log('📊 [Sessions] Combined past sessions:', combined.length);
    return combined.sort(
      (a: { date: string | Date }, b: { date: string | Date }) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [dashboardData, formatPeerSession, formatStudyRoom]);

  // Use backend pagination data
  const totalPastSessions = 
    (dashboardData?.sessionsPagination?.pastSessions?.total || 0) + 
    (dashboardData?.sessionsPagination?.pastStudyRooms?.total || 0);
  const totalPages = Math.ceil(totalPastSessions / sessionsPerPage);
  
  console.log('📄 [Pagination] Current page:', currentPage);
  console.log('📄 [Pagination] Total past sessions:', totalPastSessions);
  console.log('📄 [Pagination] Past sessions total:', dashboardData?.sessionsPagination?.pastSessions?.total || 0);
  console.log('📄 [Pagination] Past study rooms total:', dashboardData?.sessionsPagination?.pastStudyRooms?.total || 0);
  console.log('📄 [Pagination] Total pages:', totalPages);
  console.log('📄 [Pagination] Sessions on this page:', pastList.length);

  const handleRequestAction = async (
    requestId: string,
    action: "accept" | "decline"
  ) => {
    try {
      setProcessingRequests((prev) => new Set(prev).add(requestId));
      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }
      if (action === "accept") {
        await peerSessionsApi.acceptPeerSession(requestId);
        showSuccess("Session Accepted", "The session request has been accepted successfully!");
      } else {
        await peerSessionsApi.rejectPeerSession(requestId);
        showSuccess("Session Declined", "The session request has been declined.");
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
        queryClient.invalidateQueries({ queryKey: peerSessionKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: ['userStats'] }),
      ]);
    } catch (error) {
      console.error(`Error ${action}ing session request:`, error);
      showError(
        action === "accept" ? "Failed to Accept" : "Failed to Decline",
        "Something went wrong. Please try again."
      );
    } finally {
      setProcessingRequests((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Sessions</p>
                {isDataLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.totalSessions || 0}</p>
                )}
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Hours Completed</p>
                {isDataLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.hoursCompleted || 0}</p>
                )}
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg. Rating</p>
                {isDataLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">
                    {stats?.averageRating && stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
                  </p>
                )}
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Completion Rate</p>
                {isDataLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">
                    {stats?.completionRate && stats.completionRate > 0 ? `${stats.completionRate}%` : 'N/A'}
                  </p>
                )}
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Streak */}
      <StreakTrackerConnected />

      {/* Session Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Session Requests</CardTitle>
            </div>
            {pendingRequests.length > 0 && (
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {dashboardLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={idx} className="space-y-3 border rounded-lg p-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : dashboardError ? (
            <p className="text-sm text-destructive">
              Unable to load session requests. Please refresh the page.
            </p>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-3 opacity-60" />
              <p>No pending session requests right now.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request: PendingRequest) => (
                <SessionRequestCard
                  key={request.id}
                  request={request}
                  onAccept={() => handleRequestAction(request.id, "accept")}
                  onDecline={() => handleRequestAction(request.id, "decline")}
                  isProcessing={processingRequests.has(request.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>My Sessions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Track upcoming, ongoing, and past sessions from one place.
          </p>
        </CardHeader>
        <CardContent>
          {dashboardLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <Card key={idx} className="border border-dashed">
                  <CardContent className="pt-6 space-y-3">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : dashboardError ? (
            <p className="text-sm text-destructive">
              Unable to load sessions. Please refresh the page.
            </p>
          ) : (
            <>
              <SessionList
                upcomingSessions={upcomingList}
                ongoingSessions={ongoingList}
                pastSessions={pastList}
              />
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * sessionsPerPage) + 1} to {Math.min(currentPage * sessionsPerPage, totalPastSessions)} of {totalPastSessions} past sessions
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 text-sm border rounded-md hover:bg-muted ${
                            currentPage === page ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
