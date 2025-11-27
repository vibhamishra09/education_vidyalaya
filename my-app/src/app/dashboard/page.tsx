"use client";

import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { MetricCardComponent } from "@/components/cards/metric-card";
import { SessionRequestCard } from "@/components/cards/session-request-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { EnhancedCalendarWidget } from "@/components/dashboard/enhanced-calendar-widget";
import { SessionsChart } from "@/components/stats/sessions-chart";
import { AchievementShowcaseConnected } from "@/components/achievements/achievement-showcase-connected";
import { StreakTrackerConnected } from "@/components/profile/streak-tracker-connected";
import { SessionList } from "@/components/dashboard/session-list";
import { SkillsAndSuggestions } from "@/components/dashboard/skills-and-suggestions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { useCurrentUser } from "@/hooks/use-users";
import { peerSessionsApi, studyRoomsApi } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { setAuthToken } from "@/lib/api-client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useToast } from "@/contexts/toast-context";
import Link from "next/link";

export default function DashboardPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const [activeRequestTab, setActiveRequestTab] = useState<'received' | 'sent'>('received');

  // Fetch dashboard data from API
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useDashboard({
    includeMetrics: true,
    includeRequests: true,
    includeSessions: true,
    includeNotifications: true,
    includeStreaks: true,
    includeAchievements: true,
  });

  // Fetch current user data
  const { data: currentUserData, isLoading: userLoading } = useCurrentUser();

  const currentUser = currentUserData?.user;
  const metrics = dashboardData?.metrics || [];
  const pendingRequests = dashboardData?.pendingRequests || [];
  const sentRequests = dashboardData?.sentRequests || [];
  const upcomingSessions = useMemo(() => dashboardData?.upcomingSessions || [], [dashboardData?.upcomingSessions]);
  const pastSessions = dashboardData?.pastSessions || [];
  const upcomingStudyRooms = useMemo(() => dashboardData?.upcomingStudyRooms || [], [dashboardData?.upcomingStudyRooms]);
  const pastStudyRooms = dashboardData?.pastStudyRooms || [];
  const pendingReviews = dashboardData?.pendingReviews || 0;


  // Filter ongoing sessions (sessions currently happening)
  const ongoingSessions = useMemo(() => {
    const now = new Date();

    const ongoingPeerSessions = upcomingSessions.filter(s => {
      const sessionStart = new Date(s.date);
      const sessionEnd = new Date(sessionStart.getTime() + s.duration * 60 * 1000);
      // Session is ongoing if current time is between start and end
      return now >= sessionStart && now <= sessionEnd;
    });

    const ongoingRooms = upcomingStudyRooms.filter(sr => {
      const roomStart = new Date(sr.date);
      const roomEnd = new Date(roomStart.getTime() + sr.duration * 60 * 1000);
      // Room is ongoing if current time is between start and end
      return now >= roomStart && now <= roomEnd;
    });

    return [...ongoingPeerSessions, ...ongoingRooms];
  }, [upcomingSessions, upcomingStudyRooms]);

  // Extract user skill IDs from currentUser (hasSkills is array of skill IDs)
  const userSkillIds = useMemo(() => {
    if (!currentUser?.hasSkills) return [];
    return currentUser.hasSkills;
  }, [currentUser?.hasSkills]);

  // Convert skill IDs to Skill objects for display
  const userSkills = useMemo(() => {
    if (!currentUser?.hasSkills) return [];
    // For now, create basic skill objects from IDs
    // In a real scenario, you'd fetch the full skill details
    return currentUser.hasSkills.map(skillId => ({
      id: skillId,
      name: skillId, // You may want to fetch actual skill names
    }));
  }, [currentUser?.hasSkills]);

  // Fetch suggested study rooms based on user skills
  const { data: studyRoomsData, isLoading: studyRoomsLoading } = useQuery({
    queryKey: ['study-rooms', 'suggestions', userSkillIds],
    queryFn: async () => {
      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }
      return studyRoomsApi.getStudyRooms({
        limit: 10,
      });
    },
    enabled: userSkillIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter study rooms that match user skills and are upcoming
  const suggestedRooms = useMemo(() => {
    if (!studyRoomsData?.studyRooms) return [];
    const now = new Date();

    return studyRoomsData.studyRooms
      .filter(room => {
        // Filter for upcoming rooms
        const roomDate = new Date(room.date);
        if (roomDate < now) return false;

        // Filter for rooms that match user skills
        if (!room.skills || room.skills.length === 0) return false;
        return room.skills.some(skill => {
          const skillId = typeof skill === 'string' ? skill : skill.id;
          return userSkillIds.includes(skillId);
        });
      })
      .slice(0, 5); // Limit to 5 suggestions
  }, [studyRoomsData?.studyRooms, userSkillIds]);

  // Handle accepting a session request
  const handleAcceptRequest = async (requestId: string) => {
    try {
      setProcessingRequests(prev => new Set(prev).add(requestId));
      
      // Get token and set it for API calls
      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }

      await peerSessionsApi.acceptPeerSession(requestId);
      
      showSuccess("Session Accepted", "The session request has been accepted successfully!");
      
      // Refresh dashboard data
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
    } catch (error) {
      console.error('Error accepting session request:', error);
      showError("Failed to Accept", "Failed to accept session request. Please try again.");
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // Handle declining a session request
  const handleDeclineRequest = async (requestId: string) => {
    try {
      setProcessingRequests(prev => new Set(prev).add(requestId));
      
      // Get token and set it for API calls
      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }

      await peerSessionsApi.rejectPeerSession(requestId);
      
      showSuccess("Session Declined", "The session request has been declined.");
      
      // Refresh dashboard data
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
    } catch (error) {
      console.error('Error declining session request:', error);
      showError("Failed to Decline", "Failed to decline session request. Please try again.");
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          {userLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 sm:h-10 w-full max-w-xs" />
              <Skeleton className="h-4 w-full max-w-sm" />
            </div>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                Welcome back, {currentUser?.name || "User"}!
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Here&apos;s what&apos;s happening with your learning journey
              </p>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-4 sm:mb-6">
          <QuickActions />
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {dashboardLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="border rounded-lg p-6 space-y-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))
          ) : dashboardError ? (
            <div className="col-span-full text-center py-8">
              <p className="text-muted-foreground mb-4">
                Failed to load dashboard data. Please try again later.
              </p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : (
            metrics.map((metric) => (
              <MetricCardComponent key={metric.name} metric={metric} />
            ))
          )}
        </div>

        {/* Session Requests and Pending Reviews - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Pending Session Requests */}
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Session Requests</CardTitle>
                {(
                  activeRequestTab === 'received'
                    ? pendingRequests.length
                    : sentRequests.length
                ) > 2 && (
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                )}
              </div>
              <Tabs>
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger
                    active={activeRequestTab === 'received'}
                    onClick={() => setActiveRequestTab('received')}
                  >
                    Received ({pendingRequests.length})
                  </TabsTrigger>
                  <TabsTrigger
                    active={activeRequestTab === 'sent'}
                    onClick={() => setActiveRequestTab('sent')}
                  >
                    Sent ({sentRequests.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {(
                activeRequestTab === 'received'
                  ? pendingRequests
                  : sentRequests
              ).length === 0 ? (
                <div className="text-muted-foreground text-sm">
                  {activeRequestTab === 'received'
                    ? 'No received requests'
                    : 'No sent requests yet'}
                </div>
              ) : (
                <div className="space-y-4">
                  {(activeRequestTab === 'received'
                    ? pendingRequests
                    : sentRequests
                  ).map((request) => (
                    <SessionRequestCard
                      key={request.id}
                      request={request}
                      variant={activeRequestTab}
                      onAccept={
                        activeRequestTab === 'received'
                          ? () => handleAcceptRequest(request.id)
                          : undefined
                      }
                      onDecline={
                        activeRequestTab === 'received'
                          ? () => handleDeclineRequest(request.id)
                          : undefined
                      }
                      isProcessing={
                        activeRequestTab === 'received'
                          ? processingRequests.has(request.id)
                          : false
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Reviews */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  {pendingReviews > 0
                    ? `You have ${pendingReviews} session${pendingReviews > 1 ? 's' : ''} waiting for your review`
                    : "No pending reviews"
                  }
                </p>
                {pendingReviews > 0 && (
                  <Link href="/profile?tab=sessions">
                    <Button variant="outline" size="sm">
                      Review
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar and Streak Tracker - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Enhanced Calendar Widget */}
          <div id="calendar-section">
            <EnhancedCalendarWidget sessions={[
              ...upcomingSessions.map(s => ({
                id: s.id,
                title: s.title,
                date: typeof s.date === 'string' ? s.date : s.date.toISOString(),
                duration: s.duration,
                type: (s.requestedBy?.id && currentUser?.id && s.requestedBy.id === currentUser.id) ? "teaching" as const : "learning" as const,
                participantName: s.peer?.name,
              })),
              ...upcomingStudyRooms.map(sr => ({
                id: sr.id,
                title: sr.title,
                date: typeof sr.date === 'string' ? sr.date : sr.date.toISOString(),
                duration: sr.duration,
                type: (sr.createdBy?.id && currentUser?.id && sr.createdBy.id === currentUser.id) ? "teaching" as const : "learning" as const,
                participantName: `Group (${sr.participantCount}/${sr.maxParticipants})`,
              })),
            ]} />
          </div>

          {/* Streak Tracker */}
          <StreakTrackerConnected />
        </div>

        {/* Skills and Study Room Suggestions */}
        <div className="mb-6">
          <SkillsAndSuggestions
            userSkills={userSkills}
            suggestedRooms={suggestedRooms}
            isLoading={studyRoomsLoading || userLoading}
          />
        </div>

        {/* My Sessions - Full Width */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">My Sessions</CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage all your learning and teaching sessions
            </p>
          </CardHeader>
          <CardContent>
            <SessionList
              upcomingSessions={[
                ...upcomingSessions
                  .filter(s => {
                    // Exclude sessions that are currently ongoing
                    const now = new Date();
                    const sessionStart = new Date(s.date);
                    const sessionEnd = new Date(sessionStart.getTime() + s.duration * 60 * 1000);
                    return !(now >= sessionStart && now <= sessionEnd);
                  })
                  .map(s => ({
                    id: s.id,
                    title: s.title,
                    date: s.date,
                    duration: s.duration,
                    skills: s.skills,
                    description: s.description,
                    requestedBy: s.requestedBy,
                    hostName: s.peer?.name,
                  })),
                ...upcomingStudyRooms
                  .filter(sr => {
                    // Exclude rooms that are currently ongoing
                    const now = new Date();
                    const roomStart = new Date(sr.date);
                    const roomEnd = new Date(roomStart.getTime() + sr.duration * 60 * 1000);
                    return !(now >= roomStart && now <= roomEnd);
                  })
                  .map(sr => ({
                    id: sr.id,
                    title: sr.title,
                    date: sr.date,
                    duration: sr.duration,
                    skills: sr.skills,
                    description: sr.description,
                    hostName: sr.createdBy?.name,
                    participantCount: sr.participantCount,
                    maxParticipants: sr.maxParticipants,
                  })),
              ]}
              ongoingSessions={ongoingSessions.map(session => ({
                id: session.id,
                title: session.title,
                date: session.date,
                duration: session.duration,
                skills: session.skills,
                description: session.description,
                hostName: 'peer' in session ? session.peer?.name : session.createdBy?.name,
                participantCount: 'participantCount' in session ? session.participantCount : undefined,
                maxParticipants: 'maxParticipants' in session ? session.maxParticipants : undefined,
                requestedBy: 'requestedBy' in session ? session.requestedBy : undefined,
              }))}
              pastSessions={[
                ...pastSessions.map(s => ({
                  id: s.id,
                  title: s.title,
                  date: s.date,
                  duration: s.duration,
                  skills: s.skills,
                  description: s.description,
                  requestedBy: s.requestedBy,
                  hostName: s.peer?.name,
                })),
                ...pastStudyRooms.map(sr => ({
                  id: sr.id,
                  title: sr.title,
                  date: sr.date,
                  duration: sr.duration,
                  skills: sr.skills,
                  description: sr.description,
                  hostName: sr.createdBy?.name,
                  participantCount: sr.participantCount,
                  maxParticipants: sr.maxParticipants,
                })),
              ]}
              isLoading={dashboardLoading}
            />
          </CardContent>
        </Card>

        {/* Sessions Activity Chart - Full Width */}
        <SessionsChart />

        {/* Achievement Showcase - Full Width */}
        <div className="mt-6 sm:mt-8">
          <AchievementShowcaseConnected showProgress={false} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
