"use client";

import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { MetricCardComponent } from "@/components/cards/metric-card";
import { SessionRequestCard } from "@/components/cards/session-request-card";

import { EnhancedCalendarWidget } from "@/components/dashboard/enhanced-calendar-widget";
import { SessionsChart } from "@/components/stats/sessions-chart";
import { AchievementShowcaseConnected } from "@/components/achievements/achievement-showcase-connected";
import { StreakTrackerConnected } from "@/components/profile/streak-tracker-connected";
import { SessionList } from "@/components/dashboard/session-list";
import { SkillsAndSuggestions } from "@/components/dashboard/skills-and-suggestions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { useCurrentUser } from "@/hooks/use-users";
import { peerSessionsApi, studyRoomsApi } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { setAuthToken } from "@/lib/api-client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useToast } from "@/contexts/toast-context";
import { useTabPersistence } from "@/hooks/use-local-storage";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  isDashboardOngoingSlot,
  isDashboardUpcomingSlot,
  ongoingDashboardCard,
  peerDashboardCard,
  studyRoomDashboardCard,
} from "@/lib/utils/dashboard-session-cards";

const REQUEST_TABS = ["received", "sent"] as const;
type RequestTab = typeof REQUEST_TABS[number];

export function DashboardClient() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const sessionsPerPage = 10;
  
  // Use tab persistence hook for localStorage sync
  const [activeRequestTab, setActiveRequestTab] = useTabPersistence<RequestTab>(
    "dashboard_request_tab",
    "received",
    REQUEST_TABS
  );

  // Fetch dashboard data from API
  const { data: dashboardData, isLoading: dashboardLoading, error: _dashboardError } = useDashboard({
    includeMetrics: true,
    includeRequests: true,
    includeSessions: true,
    includeNotifications: true,
    includeStreaks: true,
    includeAchievements: true,
    page: currentPage,
    limit: sessionsPerPage,
  });

  // Fetch current user data
  const { data: currentUserData, isLoading: userLoading } = useCurrentUser();

  const currentUser = currentUserData?.user;
  const myUserId = currentUser?.id;

  // Create default/fallback metrics if actual metrics are missing
  const defaultMetrics = [
    {
       name: "Sessions Completed",
       value: "0",
       icon: "check-circle",
       description: "Total sessions"
    },
    {
       name: "Total Earnings",
       value: "0",
       icon: "coins",
       description: "Coins earned"
    },
    {
       name: "Average Rating",
       value: "0.0",
       icon: "star",
       description: "Out of 5 stars"
    }
  ];

  const metrics = (dashboardData?.metrics && dashboardData.metrics.length > 0) 
    ? dashboardData.metrics 
    : defaultMetrics;

  const pendingRequests = dashboardData?.pendingRequests || [];
  const sentRequests = dashboardData?.sentRequests || [];
  const upcomingSessions = useMemo(() => dashboardData?.upcomingSessions || [], [dashboardData?.upcomingSessions]);
  const pastSessions = dashboardData?.pastSessions || [];
  const upcomingStudyRooms = useMemo(() => dashboardData?.upcomingStudyRooms || [], [dashboardData?.upcomingStudyRooms]);
  const pastStudyRooms = dashboardData?.pastStudyRooms || [];
  const pendingReviews = dashboardData?.pendingReviews || 0;


  // Filter ongoing sessions (sessions currently happening)
  const ongoingSessions = useMemo(
    () => [
      ...upcomingSessions.filter(isDashboardOngoingSlot),
      ...upcomingStudyRooms.filter(isDashboardOngoingSlot),
    ],
    [upcomingSessions, upcomingStudyRooms],
  );

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
    <div className="min-h-screen flex flex-col bg-muted/5">
      <Navigation />

      <main className="flex-1 container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            {userLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold tracking-tight">
                  Welcome back, {currentUser?.name || "Arghadeep"}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Ready to continue your learning journey?
                </p>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-3">
             <Link href="/create-study-room">
                <Button className="gap-2 shadow-sm bg-sky-100 text-sky-700 hover:bg-sky-200 border border-sky-200">
                   <Plus className="h-4 w-4" />
                   Create Room
                </Button>
             </Link>
          </div>
        </div>

        {/* Top Section: Metrics Row - REMOVED */}{/* Metrics moved to left column */}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="xl:col-span-2 space-y-8">

             {/* Metrics - Now stacked vertically on mobile, horizontal on desktop, but contained in left column */}
             <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {dashboardLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex-1">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                 <Skeleton className="h-4 w-24" />
                                 <Skeleton className="h-8 w-16" />
                              </div>
                              <Skeleton className="h-10 w-10 rounded-xl" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))
                  ) : (
                    metrics.map((metric) => (
                       <div key={metric.name} className="flex-1 min-w-0">
                          <MetricCardComponent metric={metric} />
                       </div>
                    ))
                  )}
                </div>
             </div>

             {/* Sessions List */}
            <div className="space-y-4">
              <div className="pl-1">
                <h3 className="font-semibold text-lg">Your Sessions</h3>
                {/* <p className="text-sm text-muted-foreground">Upcoming and past learning activities</p> */}
              </div>
              <SessionList
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                upcomingSessions={[
                  ...upcomingSessions
                    .filter(isDashboardUpcomingSlot)
                    .map((s) => peerDashboardCard(s, myUserId, true)),
                  ...upcomingStudyRooms
                    .filter(isDashboardUpcomingSlot)
                    .map((sr) => studyRoomDashboardCard(sr, myUserId)),
                ]}
                ongoingSessions={ongoingSessions.map((session) =>
                  ongoingDashboardCard(session, myUserId),
                )}
                pastSessions={[
                  ...pastSessions.map((s) => peerDashboardCard(s, myUserId, true)),
                  ...pastStudyRooms.map((sr) => studyRoomDashboardCard(sr, myUserId)),
                ]}
                isLoading={dashboardLoading}
              />
            </div>
          
            {/* Pagination Controls */}
            {(() => {
              const totalPastSessions = 
                (dashboardData?.sessionsPagination?.pastSessions?.total || 0) + 
                (dashboardData?.sessionsPagination?.pastStudyRooms?.total || 0);
              const totalPages = Math.ceil(totalPastSessions / sessionsPerPage);
              
              if (totalPages <= 1) return null;
              
              return (
                <div className="flex items-center justify-between pt-2 px-1">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              );
            })()}

             {/* Achievements - Moved from right side */}
             <div className="pt-2">
                 <AchievementShowcaseConnected showProgress={true} />
             </div>

             {/* Charts */}
             <div className="">
                 <SessionsChart />
             </div>

          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">

             {/* Streak Tracker - Moved from metrics row */}
             <StreakTrackerConnected />

             {/* Calendar Section - Moved from left side */}
             <div id="calendar-section">
               <EnhancedCalendarWidget sessions={[
                ...upcomingSessions.map(s => ({
                  id: s.id,
                  title: s.title,
                  date: typeof s.date === 'string' ? s.date : s.date.toISOString(),
                  duration: s.duration,
                  type: (s.requestedBy?.id && currentUser?.id && s.requestedBy.id === currentUser.id) ? "teaching" as const : "learning" as const,
                  participantName: s.peer?.name,
                  sessionType: "peer" as const,
                })),
                ...upcomingStudyRooms.map(sr => ({
                  id: sr.id,
                  title: sr.title,
                  date: typeof sr.date === 'string' ? sr.date : sr.date.toISOString(),
                  duration: sr.duration,
                  type: (sr.createdBy?.id && currentUser?.id && sr.createdBy.id === currentUser.id) ? "teaching" as const : "learning" as const,
                  participantName: `Group (${sr.participantCount}/${sr.maxParticipants})`,
                  sessionType: "study-room" as const,
                })),
              ]} />
            </div>
            
            {/* Requests Card */}
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Requests</CardTitle>
                  <div className="grid w-[160px] grid-cols-2 h-8 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                        activeRequestTab === "received" ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 hover:text-foreground"
                      )}
                      onClick={() => setActiveRequestTab("received")}
                    >
                      In ({pendingRequests.length})
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                        activeRequestTab === "sent" ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 hover:text-foreground"
                      )}
                      onClick={() => setActiveRequestTab("sent")}
                    >
                      Out ({sentRequests.length})
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4">
                  {(
                    activeRequestTab === 'received' ? pendingRequests : sentRequests
                  ).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                      {activeRequestTab === 'received' ? 'No incoming requests' : 'No sent requests'}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(activeRequestTab === 'received' ? pendingRequests : sentRequests).map((request) => (
                        <SessionRequestCard
                          key={request.id}
                          request={request}
                          variant={activeRequestTab}
                          onAccept={activeRequestTab === 'received' ? () => handleAcceptRequest(request.id) : undefined}
                          onDecline={activeRequestTab === 'received' ? () => handleDeclineRequest(request.id) : undefined}
                          isProcessing={activeRequestTab === 'received' ? processingRequests.has(request.id) : false}
                        />
                      ))}
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Pending Reviews */}
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Pending Reviews</CardTitle>
                  <Link href="/profile?tab=sessions">
                    <Button size="sm" variant={pendingReviews > 0 ? "default" : "outline"} className="h-8 text-xs">
                      {pendingReviews > 0 ? "Review" : "History"}
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="px-4">
                  {pendingReviews > 0 ? (
                    <div className="flex flex-col gap-2">
                       <p className="text-sm text-muted-foreground">
                        You have <span className="font-semibold text-primary">{pendingReviews}</span> session{pendingReviews > 1 ? 's' : ''} waiting for your review.
                       </p>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                      No reviews pending
                    </div>
                  )}
              </CardContent>
            </Card>
            
            {/* Skills & Suggestion */}
            <SkillsAndSuggestions
              userSkills={userSkills}
              suggestedRooms={suggestedRooms}
              isLoading={studyRoomsLoading || userLoading}
            />

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

