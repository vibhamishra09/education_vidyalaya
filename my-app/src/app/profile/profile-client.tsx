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
import { WalletTab } from "@/components/profile/wallet-tab";
import { SessionsTab } from "@/components/profile/sessions-tab";
import { AvailabilitySettings } from "@/components/profile/availability-settings";
import { AchievementShowcaseConnected } from "@/components/achievements/achievement-showcase-connected";
import { ProfileStatsChart } from "@/components/stats/profile-stats-chart";
import { Edit, Star, Coins, Loader2, Users, LogOut } from "lucide-react";
import { SocialLinksDisplay } from "@/components/ui/social-links-display";
import { useProfileData } from "@/hooks/use-profile-data";
import { useTabPersistence } from "@/hooks/use-local-storage";
import { formatMaya } from "@/lib/utils/coin-format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TabKey = "about" | "sessions" | "wallet" | "reviews";

const TAB_OPTIONS: { label: string; value: TabKey }[] = [
  { label: "About", value: "about" },
  { label: "Sessions", value: "sessions" },
  { label: "Wallet", value: "wallet" },
  { label: "Reviews", value: "reviews" },
];

const PROFILE_TABS = ["about", "sessions", "wallet", "reviews"] as const;

const isTabKey = (value: string): value is TabKey =>
  TAB_OPTIONS.some((tab) => tab.value === value);

function ProfileContent() {
  const searchParams = useSearchParams();
  const { isLoaded, signOut } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Use tab persistence hook for localStorage sync
  const [activeTab, setActiveTab] = useTabPersistence<TabKey>(
    "profile_tab",
    "about",
    PROFILE_TABS
  );

  // Use React Query hook for optimized data fetching
  const {
    data: profileData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useProfileData();

  const currentUser = profileData?.user || null;
  const userReviews = profileData?.reviews || [];
  const avgRating = currentUser?.publicStats?.avgRating ?? profileData?.avgRating ?? 0;
  const reviewCount = currentUser?.publicStats?.reviewCount ?? userReviews.length;
  const sessionsTaught = currentUser?.publicStats?.sessionsTaught ?? 0;
  const sessionsAttendedAsLearner = currentUser?.publicStats?.sessionsAttendedAsLearner ?? 0;
  const totalSessions = sessionsTaught + sessionsAttendedAsLearner;
  const error = queryError ? 'Failed to load profile data' : null;

  // Handle URL parameters for tab navigation (URL takes priority over localStorage)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && isTabKey(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams, setActiveTab]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
  };

  // Update current user after editing profile
  const handleUserUpdate = () => {
    refetch();
  };

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

      <main className="flex-1 container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-8">
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32">
                <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                <AvatarFallback className="text-2xl sm:text-4xl">
                  {currentUser.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

                <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-6">
                  <div className="flex-1 text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start gap-3 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-bold">{currentUser.name}</h1>
                      <SocialLinksDisplay socialLinks={currentUser.socialLinks} size="lg" />
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">
                      @{currentUser.username || currentUser.email.split('@')[0]}
                    </p>

                    <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3 md:gap-4 mt-3">
                      <div className="flex items-center justify-center md:justify-start gap-1">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">
                          {avgRating.toFixed(1)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({reviewCount} reviews)
                        </span>
                      </div>

                      <div className="flex items-center justify-center md:justify-start gap-1 text-muted-foreground">
                        <Users className="h-5 w-5" />
                        <span className="font-medium text-foreground">
                          {totalSessions}
                        </span>
                        <span className="text-sm">sessions</span>
                      </div>

                      <div className="flex items-center justify-center md:justify-start">
                        <Coins className="h-5 w-5 text-yellow-600" />
                        <span className="ml-1 font-medium">
                          {formatMaya(currentUser.coins)} <span className="text-xs">m</span>AYA
                        </span>
                      </div>

                      {currentUser.hourlyRate && (
                        <div className="flex items-center justify-center md:justify-start">
                          <Coins className="h-5 w-5 text-green-600" />
                          <span className="ml-1 font-medium">
                            {formatMaya(currentUser.hourlyRate)} <span className="text-xs">m</span>AYA/hr
                          </span>
                        </div>
                      )}

                    </div>
                  </div>

                  <Button
                    className="w-full md:w-auto"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    <span className="hidden md:inline">Edit Profile</span>
                    <span className="md:hidden">Edit</span>
                  </Button>
                </div>

                {currentUser.bio && (
                  <p className="mt-4 text-muted-foreground text-center lg:text-left">{currentUser.bio}</p>
                )}
                
                {(currentUser.location || currentUser.school) && (
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground justify-center lg:justify-start text-center lg:text-left">
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
          <div className="mb-4 md:hidden">
            <Select
              value={activeTab}
              onValueChange={(value) => handleTabChange(value as TabKey)}
            >
              <SelectTrigger className="w-full justify-between">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {TAB_OPTIONS.map((tab) => (
                  <SelectItem key={tab.value} value={tab.value}>
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TabsList className="hidden w-full grid-cols-4 gap-2 rounded-xl bg-muted/60 p-1 md:grid mb-6">
            {TAB_OPTIONS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                active={activeTab === tab.value}
                onClick={() => handleTabChange(tab.value)}
                className="w-full rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-background/70"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* About Tab */}
          {activeTab === "about" && <TabsContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">
                {/* Skills & Interests */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

                  {/* Achievement Showcase */}
                  <div className="rounded-2xl border bg-background/60 p-1 shadow-sm">
                    <AchievementShowcaseConnected />
                  </div>
                </div>

                {/* Availability Settings */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle>Availability</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Keep your weekly slots current so learners know when to book you.
                      </p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <AvailabilitySettings userId={currentUser.id} isOwnProfile={true} />
                    </CardContent>
                  </Card>
                </div>
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
              coins={currentUser.coins}
              hourlyRate={currentUser.hourlyRate}
              isLoading={loading}
            />
          </TabsContent>}

          {/* Reviews Tab */}
          {activeTab === "reviews" && <TabsContent>
            <div className="space-y-6">
              {/* Beautiful Profile Stats Chart - Connected to Backend */}
              <ProfileStatsChart
                reviews={userReviews}
                avgRating={avgRating}
                sessionsTaught={sessionsTaught}
                sessionsAttended={sessionsAttendedAsLearner}
              />

              {/* All Reviews */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500" />
                    All Reviews ({userReviews.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userReviews.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium mb-1">No reviews yet</p>
                        <p className="text-sm">Complete sessions to receive reviews</p>
                      </div>
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
                </CardContent>
              </Card>
            </div>
          </TabsContent>}
        </Tabs>

        {/* Mobile Logout Button */}
        <div className="md:hidden mt-8 pt-6 border-t">
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </main>

      <Footer />

      {/* Edit Profile Modal */}
      {currentUser && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={currentUser}
          onUserUpdate={handleUserUpdate}
        />
      )}
    </div>
  );
}

export function ProfileClient() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileContent />
    </Suspense>
  );
}

