"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricCardComponent } from "@/components/cards/metric-card";
import { StudyRoomCard } from "@/components/cards/study-room-card";
import { ReviewCardComponent } from "@/components/cards/review-card";
import { ProfileStatsChart } from "@/components/stats/profile-stats-chart";
import { ArrowLeft, Star, MessageCircle, Users } from "lucide-react";
import { SocialLinksDisplay } from "@/components/ui/social-links-display";
import Link from "next/link";
import { MetricCard } from "@/components/cards/metric-card";
import { User, ReviewCard, StudyRoomCard as StudyRoomCardType, SessionStatus } from "@/types/api.types";
import { usersApi, reviewsApi, studyRoomsApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@clerk/clerk-react";
import { SignInButton } from "@clerk/clerk-react";

export function ProfileClient({ userId }: { userId: string }) {
  const { isSignedIn, isLoaded } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [userReviews, setUserReviews] = useState<ReviewCard[]>([]);
  const [upcomingRooms, setUpcomingRooms] = useState<StudyRoomCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.webyalaya.com";

  // Fetch user data from API
  useEffect(() => {
    // Only fetch if user is authenticated
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch user profile, reviews, and study rooms in parallel
        const [userData, reviewsResponse, studyRoomsResponse] = await Promise.all([
          usersApi.getPublicUserProfile(userId),
          reviewsApi.getReviews({ userId }),
          studyRoomsApi.getStudyRooms({ 
            status: SessionStatus.UPCOMING,
            limit: 10 
          }),
        ]);

        setUser(userData);
        
        // Filter reviews for this user
        const reviews = reviewsResponse.reviews || [];
        setUserReviews(reviews);

        // Filter study rooms created by this user
        const userStudyRooms = (studyRoomsResponse.studyRooms || []).filter(
          (room) => room.createdBy.id === userId
        );
        setUpcomingRooms(userStudyRooms);
      } catch (err: any) {
        console.error('Error fetching user data:', err);
        setError(err.message || 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId, isSignedIn, isLoaded]);

  // Show sign-in prompt if not authenticated
  if (isLoaded && !isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
              <p className="text-muted-foreground mb-6">
                Please sign in to view peer profiles and study room details.
              </p>
              <div className="flex flex-col gap-3">
                <SignInButton mode="modal" forceRedirectUrl={appUrl}>
                  <Button className="w-full">Sign In</Button>
                </SignInButton>
                <Link href="/browse">
                  <Button variant="outline" className="w-full">Back to Browse</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <Skeleton className="h-8 w-48 mx-auto mb-4" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold">{error || "User not found"}</h1>
            <Link href="/browse">
              <Button className="mt-4">Back to Browse</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const sessionsTaught = user.publicStats?.sessionsTaught ?? 0;
  const sessionsAttendedAsLearner = user.publicStats?.sessionsAttendedAsLearner ?? 0;
  const acceptedSessions = user.publicStats?.acceptedSessions ?? 0;
  const totalSessionRequests = user.publicStats?.totalSessionRequests ?? 0;
  const acceptanceRateValue =
    totalSessionRequests > 0
      ? Math.round(
          100 *
            (user.publicStats?.acceptanceRate ??
              (acceptedSessions / totalSessionRequests || 0)),
        )
      : null;

  const rating = user.publicStats?.avgRating ?? 0;
  const reviewCount = user.publicStats?.reviewCount ?? 0;
  const ratingValue =
    reviewCount > 0
      ? rating.toFixed(1)
      : user.publicStats && user.publicStats.reviewCount > 0
        ? user.publicStats.avgRating.toFixed(1)
        : "—";

  const publicMetrics: MetricCard[] = [
    {
      name: "Sessions Taught",
      value: sessionsTaught,
      icon: "check-circle",
    },
    {
      name: "Sessions Attended",
      value: sessionsAttendedAsLearner,
      description: "as learner",
      icon: "book-open",
    },
    {
      name: "Rating",
      value: ratingValue,
      description: `${reviewCount} reviews`,
      icon: "star",
    },
    {
      name: "Acceptance Rate",
      value: acceptanceRateValue !== null ? `${acceptanceRateValue}%` : "—",
      description:
        totalSessionRequests > 0
          ? `${acceptedSessions}/${totalSessionRequests} accepted`
          : "No requests yet",
      icon: "trending-up",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link href="/browse">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Browse
          </Button>
        </Link>

        {/* Profile Header */}
        <Card className="mb-6 sm:mb-8">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col md:flex-row items-start gap-4 sm:gap-6">
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-2xl sm:text-4xl">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-bold">{user.name}</h1>
                      
                      {/* Social Media Icons */}
                      <SocialLinksDisplay socialLinks={user.socialLinks} size="lg" />
                    </div>

                    <div className="flex items-center gap-4 mt-2 sm:mt-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 sm:h-5 sm:w-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium text-sm sm:text-base">
                          {rating.toFixed(1)}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          ({reviewCount} reviews)
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-sm sm:text-base font-medium">
                          {sessionsTaught + sessionsAttendedAsLearner}
                        </span>
                        <span className="text-xs sm:text-sm">sessions</span>
                      </div>
                    </div>
                  </div>
                </div>

                {user.bio && (
                  <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground">{user.bio}</p>
                )}

                {(user.location || user.school) && (
                  <div className="mt-3 sm:mt-4 flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    {user.location && (
                      <span className="flex items-center gap-1">
                        📍 {user.location}
                      </span>
                    )}
                    {user.school && (
                      <span className="flex items-center gap-1">
                        🎓 {user.school}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-3 sm:mt-4">
                  <p className="text-xs sm:text-sm font-medium mb-2">Skills:</p>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {user.hasSkills?.map((skill, index) => (
                      <Badge key={index} variant="default" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Public Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {publicMetrics.map((metric) => (
            <MetricCardComponent key={metric.name} metric={metric} />
          ))}
        </div>

        {/* Performance Overview Chart */}
        <div className="mb-6 sm:mb-8">
          <ProfileStatsChart
            reviews={userReviews}
            avgRating={rating}
            sessionsTaught={sessionsTaught}
            sessionsAttended={sessionsAttendedAsLearner}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Upcoming Study Rooms */}
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">
              Upcoming Study Rooms
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {upcomingRooms.length === 0 ? (
                <Card>
                  <CardContent className="pt-4 sm:pt-6 text-center text-muted-foreground text-sm sm:text-base font-tagline">
                    No upcoming study rooms
                  </CardContent>
                </Card>
              ) : (
                upcomingRooms.map((room) => (
                  <StudyRoomCard
                    key={room.id}
                    roomId={room.id}
                    status={room.sessionStatus === SessionStatus.UPCOMING ? "scheduled" : "live"}
                    category={typeof room.skills[0] === 'string' ? room.skills[0] : room.skills[0]?.name || "General"}
                    title={room.title}
                    description={room.description || ""}
                    participants={{
                      current: room.participantCount,
                      max: room.maxParticipants
                    }}
                    host={{
                      name: room.createdBy.name,
                      avatar: room.createdBy.avatar
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Recent Reviews */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  Recent Reviews ({userReviews.length})
                </CardTitle>
                {userReviews.length > 3 && (
                  <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                    View All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {userReviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm sm:text-base font-tagline">
                    <Star className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    No reviews yet
                  </div>
                ) : (
                  userReviews.slice(0, 3).map((review) => (
                    <ReviewCardComponent 
                      key={review.id} 
                      review={{
                        id: review.id,
                        rating: review.rating,
                        review: review.review,
                        reviewer: {
                          id: review.reviewer.id,
                          name: review.reviewer.name,
                          avatar: review.reviewer.avatar,
                        },
                      }} 
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
