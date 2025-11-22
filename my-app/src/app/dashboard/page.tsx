"use client";

import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { MetricCardComponent } from "@/components/cards/metric-card";
import { SessionRequestCard } from "@/components/cards/session-request-card";
import { UpcomingSessionCardComponent } from "@/components/cards/upcoming-session-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { CoinWidget } from "@/components/dashboard/coin-widget";
import { EnhancedCalendarWidget } from "@/components/dashboard/enhanced-calendar-widget";
import { SessionsChart } from "@/components/stats/sessions-chart";
import { EarningsChart } from "@/components/stats/earnings-chart";
import { AchievementShowcase } from "@/components/achievements/achievement-showcase";
import { StreakTracker } from "@/components/profile/streak-tracker";
import { TimezoneSelector } from "@/components/dashboard/timezone-selector";
import { SessionList } from "@/components/dashboard/session-list";
import { MOCK_ACHIEVEMENTS } from "@/types/achievements.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, ArrowRight } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { useCurrentUser } from "@/hooks/use-users";
import { peerSessionsApi } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { setAuthToken } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/contexts/toast-context";
import Link from "next/link";
import { getNotificationLink } from "@/lib/utils/notification-links";

export default function DashboardPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());

  // Fetch dashboard data from API
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useDashboard({
    includeMetrics: true,
    includeRequests: true,
    includeSessions: true,
    includeNotifications: true,
  });

  // Fetch current user data
  const { data: currentUserData, isLoading: userLoading } = useCurrentUser();

  const currentUser = currentUserData?.user;
  const metrics = dashboardData?.metrics || [];
  const pendingRequests = dashboardData?.pendingRequests || [];
  const upcomingSessions = dashboardData?.upcomingSessions || [];
  const pastSessions = dashboardData?.pastSessions || [];
  const upcomingStudyRooms = dashboardData?.upcomingStudyRooms || [];
  const pastStudyRooms = dashboardData?.pastStudyRooms || [];
  const notifications = dashboardData?.notifications || [];
  const pendingReviews = dashboardData?.pendingReviews || 0;

  const unreadNotifications = notifications.filter((n) => !n.viewed);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {dashboardLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
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

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Pending Session Requests */}
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold">Session Requests</h2>
                {pendingRequests.length > 2 && (
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {pendingRequests.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      No pending requests
                    </CardContent>
                  </Card>
                ) : (
                  pendingRequests.map((request) => (
                    <SessionRequestCard
                      key={request.id}
                      request={request}
                      onAccept={() => handleAcceptRequest(request.id)}
                      onDecline={() => handleDeclineRequest(request.id)}
                      isProcessing={processingRequests.has(request.id)}
                    />
                  ))
                )}
              </div>
            </div>

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

            {/* Sessions Activity Chart */}
            <SessionsChart />

            {/* Earnings Chart */}
            <EarningsChart />
          </div>

          {/* Right Column */}
          <div className="space-y-4 sm:space-y-6">
            {/* Coin Balance Widget */}
            <CoinWidget
              coins={typeof currentUser?.coins === 'number' ? currentUser.coins : undefined}
              isLoading={userLoading}
            />

            {/* Timezone Selector */}
            <TimezoneSelector variant="card" />

            {/* Streak Tracker */}
            <StreakTracker
              currentStreak={7}
              longestStreak={14}
            />

            {/* Upcoming Sessions */}
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg font-semibold">Upcoming Sessions</h2>
              </div>

              <div className="space-y-3">
                {upcomingSessions.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      No upcoming sessions
                    </CardContent>
                  </Card>
                ) : (
                  upcomingSessions.slice(0, 5).map((session) => (
                    <UpcomingSessionCardComponent
                      key={session.id}
                      session={session}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Notifications */}
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-semibold">Notifications</h2>
                  {unreadNotifications.length > 0 && (
                    <Badge variant="destructive">
                      {unreadNotifications.length}
                    </Badge>
                  )}
                </div>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {notifications.slice(0, 3).map((notification) => {
                      return (
                        <Link key={notification.id} href={getNotificationLink(notification)}>
                          <div
                            className={`flex items-start gap-3 pb-4 border-b last:border-b-0 last:pb-0 hover:bg-muted/50 -mx-6 px-6 py-3 rounded-lg transition-colors cursor-pointer ${
                              !notification.viewed ? "font-medium" : ""
                            }`}
                          >
                            <Bell
                              className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                                notification.notifType === "URGENT"
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">{notification.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </div>
                            {!notification.viewed && (
                              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                            )}
                          </div>
                        </Link>
                      );
                    })}
                    {notifications.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No notifications
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* All Sessions - Full Width */}
        <div className="mt-6 sm:mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">My Sessions</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Manage all your learning and teaching sessions
              </p>
            </CardHeader>
            <CardContent>
              <SessionList
                upcomingSessions={[
                  ...upcomingSessions.map(s => ({
                    id: s.id,
                    title: s.title,
                    date: s.date,
                    duration: s.duration,
                    skills: s.skills,
                    description: s.description,
                    requestedBy: s.requestedBy,
                    hostName: s.peer?.name,
                  })),
                  ...upcomingStudyRooms.map(sr => ({
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
                pendingSessions={pendingRequests.map(r => ({
                  id: r.id,
                  title: r.title,
                  date: r.date,
                  duration: r.duration,
                  skills: r.skills,
                  requestedBy: r.requestedBy,
                  hostName: r.requestedBy?.name,
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
        </div>

        {/* Achievement Showcase - Full Width */}
        <div className="mt-6 sm:mt-8">
          <AchievementShowcase achievements={MOCK_ACHIEVEMENTS} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
