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
import { formatCoins } from "@/lib/utils/coin-format";
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
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
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
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
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
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navigation />

      <main className="flex-1 container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
        {/* Profile Header */}
        <Card className="mb-8 shadow-sm border-border/60">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-10">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-sky-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Avatar className="h-28 w-28 sm:h-40 sm:w-40 border-4 border-background shadow-xl relative">
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} className="object-cover" />
                  <AvatarFallback className="text-3xl sm:text-5xl bg-emerald-100 text-emerald-700">
                    {currentUser.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>

                <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-6">
                  <div className="flex-1 text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start gap-3 flex-wrap">
                      <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
                        {currentUser.name}
                      </h1>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 border-0">
                         Student
                      </Badge>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-center lg:justify-start gap-2 text-muted-foreground my-2">
                       <span className="text-base font-medium">@{currentUser.username || currentUser.email.split('@')[0]}</span>
                       <SocialLinksDisplay socialLinks={currentUser.socialLinks} size="sm" />
                    </div>

                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 md:gap-4 mt-4">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-amber-900 shadow-sm">
                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                        <span className="font-bold">{avgRating.toFixed(1)}</span>
                        <span className="text-xs opacity-70">({reviewCount} reviews)</span>
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-700 shadow-sm">
                        <Users className="h-4 w-4 text-slate-500" />
                        <span className="font-bold">{totalSessions}</span>
                        <span className="text-xs opacity-70">sessions</span>
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 shadow-sm">
                        <Coins className="h-4 w-4 text-emerald-600" />
                        <span className="font-bold">{formatCoins(currentUser.coins)}</span>
                        <span className="text-xs opacity-70">Webya</span>
                      </div>

                      {currentUser.hourlyRate && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-100 text-sky-700 shadow-sm">
                          <Coins className="h-4 w-4 text-sky-600" />
                          <span className="font-bold">{formatCoins(currentUser.hourlyRate)}</span>
                          <span className="text-xs opacity-70">Webya/hr</span>
                        </div>
                      )}

                    </div>
                  </div>

                  <Button
                    className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 transition-all rounded-xl"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    <span className="hidden md:inline">Edit Profile</span>
                    <span className="md:hidden">Edit</span>
                  </Button>
                </div>

                {currentUser.bio && (
                  <p className="mt-6 text-muted-foreground text-center lg:text-left leading-relaxed max-w-3xl border-l-2 border-emerald-500/20 pl-4">
                    {currentUser.bio}
                  </p>
                )}
                
                {(currentUser.location || currentUser.school) && (
                  <div className="mt-5 flex flex-wrap gap-6 text-sm font-medium text-muted-foreground justify-center lg:justify-start text-center lg:text-left">
                    {currentUser.location && (
                      <span className="flex items-center gap-2">
                         <span className="bg-slate-100 p-1 rounded-md">📍</span> {currentUser.location}
                      </span>
                    )}
                    {currentUser.school && (
                      <span className="flex items-center gap-2">
                        <span className="bg-slate-100 p-1 rounded-md">🎓</span> {currentUser.school}
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
              <SelectTrigger className="w-full justify-between bg-background/60 backdrop-blur-sm border-border/40 h-12 rounded-xl">
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

          <TabsList className="hidden w-full grid-cols-4 gap-2 rounded-2xl bg-background/60 backdrop-blur-sm p-1.5 md:grid mb-8 border border-border/40 shadow-sm h-auto">
            {TAB_OPTIONS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                active={activeTab === tab.value}
                onClick={() => handleTabChange(tab.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-white/50 data-[state=active]:hover:bg-emerald-700"
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
                  <Card className="border-none shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden">
                    <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                    <CardHeader>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="text-lg font-bold">I can teach</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground hover:bg-black/5"
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
                          <div className="w-full py-6 flex flex-col items-center justify-center text-center border-2 border-dashed border-muted rounded-xl bg-muted/30">
                            <p className="text-muted-foreground text-sm mb-2">No skills added yet</p>
                            <Button variant="link" size="sm" onClick={() => setIsEditModalOpen(true)} className="text-emerald-600 font-medium">Add Skills</Button>
                          </div>
                        ) : (
                          currentUser.hasSkills.map((skillName, index) => (
                            <Badge key={index} variant="secondary" className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100/80">
                              {skillName}
                            </Badge>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden">
                    <div className="h-1 w-full bg-gradient-to-r from-sky-500 to-indigo-500" />
                    <CardHeader>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="text-lg font-bold">I want to learn</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground hover:bg-black/5"
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
                           <div className="w-full py-6 flex flex-col items-center justify-center text-center border-2 border-dashed border-muted rounded-xl bg-muted/30">
                             <p className="text-muted-foreground text-sm mb-2">No interests added yet</p>
                             <Button variant="link" size="sm" onClick={() => setIsEditModalOpen(true)} className="text-sky-600 font-medium">Add Interests</Button>
                           </div>
                        ) : (
                          currentUser.wantSkills.map((skillName, index) => (
                            <Badge key={index} variant="secondary" className="px-3 py-1 bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100/80">
                              {skillName}
                            </Badge>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Achievement Showcase */}
                  <div className="rounded-2xl border-none shadow-md overflow-hidden bg-gradient-to-br from-indigo-50/50 via-purple-50/50 to-pink-50/50 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-pink-950/20">
                    <AchievementShowcaseConnected />
                  </div>
                </div>

                {/* Availability Settings */}
                <div className="space-y-6">
                  <Card className="border-none shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden h-full">
                    <CardHeader className="pb-4 border-b border-border/40">
                      <CardTitle className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
                          <Users className="h-4 w-4" />
                        </div>
                        Availability
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Manage your weekly schedule for peer sessions.
                      </p>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <AvailabilitySettings userId={currentUser.id} isOwnProfile={true} />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>}

          {/* Sessions Tab */}
          {activeTab === "sessions" && <TabsContent>
            <SessionsTab publicStats={currentUser?.publicStats} isLoading={loading} />
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
              <div className="rounded-2xl border-none shadow-sm bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm p-1">
                 <ProfileStatsChart
                  reviews={userReviews}
                  avgRating={avgRating}
                  sessionsTaught={sessionsTaught}
                  sessionsAttended={sessionsAttendedAsLearner}
                />
              </div>

              {/* All Reviews */}
              <Card className="border-none shadow-sm bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-bold">
                    <div className="bg-amber-100 p-1.5 rounded-lg">
                      <Star className="h-5 w-5 text-amber-600 fill-amber-600" />
                    </div>
                    All Reviews <span className="text-muted-foreground font-normal ml-1 text-base">({userReviews.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userReviews.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground bg-white/40 rounded-xl border border-dashed border-slate-200">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                           <Star className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="font-medium text-lg text-slate-900 mb-1">No reviews yet</p>
                        <p className="text-sm">Complete sessions to receive reviews and build your reputation</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {userReviews.map((review) => (
                          <div key={review.id} className="bg-white/80 p-4 rounded-xl shadow-sm border border-slate-100">
                             <ReviewCardComponent
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
                          </div>
                        ))}
                      </div>
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

