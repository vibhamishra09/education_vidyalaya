"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReviewCardComponent } from "@/components/cards/review-card";
import { EditProfileModal } from "@/components/modals/edit-profile-modal";
import { UserReviewStats } from "@/components/reviews/user-review-stats";
import { WalletTab } from "@/components/profile/wallet-tab";
import { SessionsTab } from "@/components/profile/sessions-tab";
import { AchievementShowcase } from "@/components/achievements/achievement-showcase";
import { StreakTracker } from "@/components/profile/streak-tracker";
import { MOCK_ACHIEVEMENTS } from "@/types/achievements.types";
import { Edit, Star, Coins, Loader2 } from "lucide-react";
import { usersApi, reviewsApi } from "@/lib/api";
import { User, ReviewCard } from "@/types/api.types";
import { setAuthToken } from "@/lib/api-client";
import { formatMaya } from "@/lib/utils/coin-format";

function ProfileContent() {
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userReviews, setUserReviews] = useState<ReviewCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"about" | "sessions" | "wallet" | "reviews">("about");

  const avgRating =
    userReviews.length > 0
      ? userReviews.reduce((acc, r) => acc + r.rating, 0) / userReviews.length
      : 0;

  // Handle URL parameters for tab navigation
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['about', 'sessions', 'wallet', 'reviews'].includes(tab)) {
      setActiveTab(tab as 'about' | 'sessions' | 'wallet' | 'reviews');
    }
  }, [searchParams]);


  useEffect(() => {
    const fetchUserData = async () => {
      // Wait for Clerk to load
      if (!isLoaded) {
        return;
      }

      // Check if user is signed in
      if (!isSignedIn) {
        setError('Please sign in to view your profile');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Get token and set it for API calls
        const token = await getToken();
        if (token) {
          setAuthToken(token);
          console.log('Token set for API calls:', token);
        }
        
        // Fetch current user data and reviews in parallel
        const [userData, reviewsResponse] = await Promise.all([
          usersApi.getCurrentUser(),
          reviewsApi.getReviews({ userId: 'me' }) // Get reviews for current user
        ]);
        
        setCurrentUser(userData.user);
        setUserReviews(reviewsResponse.reviews || []);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [isLoaded, isSignedIn, getToken]);

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 pb-20 md:pb-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Initializing...</span>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 pb-20 md:pb-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading profile...</span>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !currentUser) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 pb-20 md:pb-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">
              {error || "Failed to load profile"}
            </h1>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32">
                <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                <AvatarFallback className="text-2xl sm:text-4xl">
                  {currentUser.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold">{currentUser.name}</h1>
                    <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                      @{currentUser.username || currentUser.email.split('@')[0]}
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mt-3">
                      <div className="flex items-center justify-center sm:justify-start">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <span className="ml-1 font-medium">
                          {avgRating.toFixed(1)}
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">
                          ({userReviews.length} reviews)
                        </span>
                      </div>

                      <div className="flex items-center justify-center sm:justify-start">
                        <Coins className="h-5 w-5 text-yellow-600" />
                        <span className="ml-1 font-medium">
                          {formatMaya(currentUser.coins)} <span className="text-xs">m</span>AYA
                        </span>
                      </div>

                      {currentUser.hourlyRate && (
                        <div className="flex items-center justify-center sm:justify-start">
                          <Coins className="h-5 w-5 text-green-600" />
                          <span className="ml-1 font-medium">
                            {formatMaya(currentUser.hourlyRate)} <span className="text-xs">m</span>AYA/hr
                          </span>
                        </div>
                      )}

                    </div>
                  </div>

                  <Button 
                    className="w-full sm:w-auto"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Edit Profile</span>
                    <span className="sm:hidden">Edit</span>
                  </Button>
                </div>

                {currentUser.bio && (
                  <p className="mt-4 text-muted-foreground text-center sm:text-left">{currentUser.bio}</p>
                )}
                
                {(currentUser.location || currentUser.school) && (
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground text-center sm:text-left">
                    {currentUser.location && (
                      <span className="flex items-center gap-1">
                        📍 {currentUser.location}
                      </span>
                    )}
                    {currentUser.school && (
                      <span className="flex items-center gap-1">
                        🎓 {currentUser.school}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger active={activeTab === "about"} onClick={() => setActiveTab("about")}>
              About
            </TabsTrigger>
            <TabsTrigger active={activeTab === "sessions"} onClick={() => setActiveTab("sessions")}>
              Sessions
            </TabsTrigger>
            <TabsTrigger active={activeTab === "wallet"} onClick={() => setActiveTab("wallet")}>
              Wallet
            </TabsTrigger>
            <TabsTrigger active={activeTab === "reviews"} onClick={() => setActiveTab("reviews")}>
              Reviews
            </TabsTrigger>
          </TabsList>

          {/* About Tab */}
          {activeTab === "about" && <TabsContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Skills & Interests */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>I can teach</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditModalOpen(true)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {!currentUser.hasSkills || currentUser.hasSkills.length === 0 ? (
                          <p className="text-muted-foreground text-sm">
                            No skills added yet
                          </p>
                        ) : (
                          currentUser.hasSkills.map((skillName, index) => (
                            <Badge key={index} variant="default" className="text-xs">
                              {skillName}
                            </Badge>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>I want to learn</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditModalOpen(true)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {!currentUser.wantSkills || currentUser.wantSkills.length === 0 ? (
                          <p className="text-muted-foreground text-sm">
                            No learning interests added yet
                          </p>
                        ) : (
                          currentUser.wantSkills.map((skillName, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {skillName}
                            </Badge>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Reviews Summary & Streak */}
                <div className="space-y-6">
                  <UserReviewStats userId={currentUser.id} showTitle={true} />

                  <StreakTracker
                    currentStreak={7}
                    longestStreak={14}
                  />
                </div>
              </div>

              {/* Achievement Showcase */}
              <div className="mt-6">
                <AchievementShowcase achievements={MOCK_ACHIEVEMENTS} />
              </div>
            </div>
          </TabsContent>}

          {/* Sessions Tab */}
          {activeTab === "sessions" && <TabsContent>
            <SessionsTab userId={currentUser.id} isLoading={loading} />
          </TabsContent>}

          {/* Wallet Tab */}
          {activeTab === "wallet" && <TabsContent>
            <WalletTab
              coins={typeof currentUser.coins === 'number' ? currentUser.coins : undefined}
              hourlyRate={typeof currentUser.hourlyRate === 'number' ? currentUser.hourlyRate : undefined}
              isLoading={loading}
            />
          </TabsContent>}

          {/* Reviews Tab */}
          {activeTab === "reviews" && <TabsContent>
            <div className="space-y-6">
              <UserReviewStats userId={currentUser.id} showTitle={true} />

              {/* All Reviews */}
              <div>
                <h3 className="text-lg font-semibold mb-4">All Reviews</h3>
                <div className="space-y-4">
                  {userReviews.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6 text-center text-muted-foreground">
                        <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium mb-1">No reviews yet</p>
                        <p className="text-sm">Complete sessions to receive reviews</p>
                      </CardContent>
                    </Card>
                  ) : (
                    userReviews.map((review) => (
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
              </div>
            </div>
          </TabsContent>}
        </Tabs>
      </main>

      <Footer />

      {/* Edit Profile Modal */}
      {currentUser && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={currentUser}
          onUserUpdate={setCurrentUser}
        />
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
