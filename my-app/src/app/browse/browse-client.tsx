"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { PeerCardComponent } from "@/components/cards/peer-card";
import { StudyRoomCard as StudyRoomCardComponent } from "@/components/cards/study-room-card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Sparkles, ArrowLeft, Swords } from "lucide-react";
import { useBrowse, useBrowseRecommendations, usePeerMatches } from "@/hooks/use-browse";
import { useSkills } from "@/hooks/use-skills";
import { useCurrentUser } from "@/hooks/use-users";
import {
  Skill,
  BrowseFilters,
  SessionStatus,
  type StudyRoomCard,
} from "@/types/api.types";
import { useTabPersistence, useLocalStorage } from "@/hooks/use-local-storage";
import { cn } from "@/lib/utils";
import { studyRoomCardDisplayLive } from "@/lib/utils/study-room-edit";

const BROWSE_TABS = ["peers", "studyRooms"] as const;
type BrowseTab = typeof BROWSE_TABS[number];

function studyRoomSkillNames(
  skills: StudyRoomCard["skills"] | undefined,
): string[] {
  if (!skills?.length) return [];
  return skills
    .map((s) => {
      if (typeof s === "string") return s;
      if (s && typeof s === "object") {
        if ("name" in s && typeof (s as { name?: string }).name === "string") {
          return (s as { name: string }).name;
        }
        const nested = (s as { skill?: { name?: string } }).skill?.name;
        if (nested) return nested;
      }
      return undefined;
    })
    .filter((n): n is string => Boolean(n));
}

/** First skill label for card badge; API may omit `skills`. */
function studyRoomCategoryLabel(
  skills: StudyRoomCard["skills"] | undefined | null,
): string {
  const first = skills?.[0];
  if (first == null) return "General";
  if (typeof first === "string") return first;
  // `in` only on objects — primitives throw (e.g. malformed API data).
  if (typeof first === "object" && first !== null) {
    if ("name" in first && typeof (first as { name?: string }).name === "string") {
      return (first as { name: string }).name;
    }
    const nested = (first as { skill?: { name?: string } }).skill?.name;
    if (nested) return nested;
  }
  return "General";
}

function studyRoomCardHost(room: {
  createdBy?: StudyRoomCard["createdBy"] | null;
}): { id?: string; name: string; avatar?: string } {
  const cb = room.createdBy;
  if (!cb?.name) {
    return { name: "Host" };
  }
  return {
    id: cb.id,
    name: cb.name,
    avatar: cb.avatar,
  };
}

function BrowsePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Persist active tab to localStorage
  const [activeTab, setActiveTab] = useTabPersistence<BrowseTab>(
    "browse_tab",
    "peers",
    BROWSE_TABS
  );
  
  // Persist search query to localStorage
  const [searchQuery, setSearchQuery] = useLocalStorage<string>(
    "browse_search",
    "",
    { expiresIn: 60 * 60 * 1000 } // 1 hour
  );
  
  // Persist selected skills to localStorage
  const [selectedSkills, setSelectedSkills] = useLocalStorage<Skill[]>(
    "browse_skills",
    [],
    { expiresIn: 60 * 60 * 1000 } // 1 hour
  );
  
  const [currentPage, setCurrentPage] = useState(1);
  const [peerCount, setPeerCount] = useState<number>(0);
  const [studyRoomCount, setStudyRoomCount] = useState<number>(0);
  const [peerHasSocialLinks, setPeerHasSocialLinks] = useState<"all" | "withSocial">("all");
  const [studyStatus, setStudyStatus] = useState<
    "all" | SessionStatus.UPCOMING | SessionStatus.ONGOING
  >("all");
  const [studyFreeOnly, setStudyFreeOnly] = useState<"all" | "free">("all");

  // Get current user for recommendations
  const { data: currentUserData } = useCurrentUser();
  const userWantSkills = currentUserData?.user?.wantSkills || [];

  // Initialize search query and active tab from URL parameters (overrides localStorage)
  useEffect(() => {
    const searchParam = searchParams.get("search");
    if (searchParam) {
      setSearchQuery(searchParam);
    }

    const tabParam = searchParams.get("tab");
    if (tabParam === "peers" || tabParam === "studyRooms") {
      setActiveTab(tabParam);
    }
  }, [searchParams, setSearchQuery, setActiveTab]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeTab,
    searchQuery,
    selectedSkills,
    peerHasSocialLinks,
    studyStatus,
    studyFreeOnly,
  ]);

  // Fetch data from API
  const browseFilters: BrowseFilters = {
    tab: activeTab,
    page: currentPage,
    limit: 20,
  };
  
  if (searchQuery && searchQuery.trim()) {
    browseFilters.search = searchQuery.trim();
  }
  
  if (selectedSkills.length > 0) {
    browseFilters.skills = selectedSkills.map((s) => s.name);
  }

  if (activeTab === "peers" && peerHasSocialLinks === "withSocial") {
    browseFilters.peerHasSocialLinks = true;
  }

  if (activeTab === "studyRooms" && studyStatus !== "all") {
    browseFilters.studyStatus = studyStatus;
  }

  if (activeTab === "studyRooms" && studyFreeOnly === "free") {
    browseFilters.studyFreeOnly = true;
  }

  if (
    activeTab === "studyRooms" &&
    !searchQuery &&
    selectedSkills.length === 0 &&
    currentPage === 1
  ) {
    browseFilters.includeTrendingStudyRooms = true;
    browseFilters.trendingLimit = 4;
  }
  
  const { data: browseData, isLoading: browseLoading, error: browseError } = useBrowse(browseFilters);
  const { data: skillsData, isLoading: skillsLoading } = useSkills(undefined, 20);

  // Update counts from API response
  useEffect(() => {
    if (browseData) {
      if (browseData.counts) {
        setPeerCount(browseData.counts.peers);
        setStudyRoomCount(browseData.counts.studyRooms);
      }
    }
  }, [browseData]);

  const toggleSkill = (skill: Skill) => {
    setSelectedSkills((prev) =>
      prev.find((s) => s.id === skill.id)
        ? prev.filter((s) => s.id !== skill.id)
        : [...prev, skill]
    );
  };

  const removeSkill = (skillId: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s.id !== skillId));
  };

  const peers = browseData?.peers || [];
  const studyRooms = browseData?.studyRooms || [];
  const trendingStudyRooms = browseData?.trendingStudyRooms || [];
  const skills = skillsData?.skills || [];

  // Fetch recommendations based on user's "want to learn" skills
  const { data: recommendationsData, isLoading: recommendationsLoading } = useBrowseRecommendations(
    userWantSkills,
    { enabled: userWantSkills.length > 0 && !searchQuery && selectedSkills.length === 0 }
  );
  
  // New: Fetch ranked peer matches (weighted scoring)
  const { data: peerMatchesData, isLoading: peerMatchesLoading } = usePeerMatches(
    1, 4,
    { enabled: activeTab === "peers" && userWantSkills.length > 0 && !searchQuery && selectedSkills.length === 0 }
  );
  
  const recommendedPeers = peerMatchesData?.matches || recommendationsData?.peers || [];
  const recommendedRooms = recommendationsData?.studyRooms || [];
  
  const isRecLoading = activeTab === "peers" ? peerMatchesLoading : recommendationsLoading;
  const hasRecommendations = (activeTab === "peers" ? recommendedPeers.length > 0 : recommendedRooms.length > 0);
  const showRecommendations = hasRecommendations && !searchQuery && selectedSkills.length === 0;

  const handleRoomAction = (room: { slug?: string; id: string }) => {
    router.push(`/studyroom/${room.slug || room.id}`);
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/5 selection:bg-green-500/20">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
          <div className="space-y-3">
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-muted-foreground bg-muted/40 hover:bg-green-500/10 hover:text-green-700 transition-all group w-fit border border-transparent hover:border-green-500/20"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" /> 
              Back to Dashboard
            </Link>
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl text-foreground">
                 Browse Community
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed">
                Discover peers and study rooms to learn and grow together
              </p>
            </div>
          </div>
        </div>

        {/* Recommendations Section - Based on user's wantSkills */}
        {showRecommendations && (
          <div className="mb-10 rounded-3xl bg-gradient-to-br from-green-50/50 to-emerald-50/20 border border-green-100/50 p-6 dark:from-green-950/10 dark:to-emerald-950/5 dark:border-green-900/20">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-green-600 fill-green-100 dark:fill-green-900/20" />
              <h2 className="text-lg font-bold text-foreground">Recommended for You</h2>
              <Badge variant="outline" className="text-[10px] bg-white/50 border-green-200 text-green-700 dark:bg-transparent dark:border-green-800 dark:text-green-400">
                Based on your interests
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground/80 mb-6">
              {activeTab === "peers" 
                ? "Peers who can teach what you want to learn"
                : "Study rooms matching your learning interests"}
            </p>
            
            {isRecLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-full">
                    <div className="border border-border/40 rounded-2xl p-4 space-y-3 bg-background/40 backdrop-blur-sm">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {activeTab === "peers" 
                  ? recommendedPeers.slice(0, 4).map((peer) => (
                      <PeerCardComponent key={peer.id} peer={peer} />
                    ))
                  : recommendedRooms.slice(0, 4).map((room) => (
                      <StudyRoomCardComponent 
                        key={room.id}
                        roomId={room.id}
                        slug= {room.slug}
                        status={
                          studyRoomCardDisplayLive(room.sessionStatus, room.date)
                            ? "live"
                            : "scheduled"
                        }
                        title={room.title}
                        description={room.description}
                        date={room.date}
                        duration={room.duration}
                        imageUrl={room.imageUrl}
                        participants={{
                          current: room.participantCount,
                          max: room.maxParticipants
                        }}
                        host={studyRoomCardHost(room)}
                        category={studyRoomCategoryLabel(room.skills)}
                        skillNames={studyRoomSkillNames(room.skills)}
                        sessionStatus={room.sessionStatus}
                        currentUserId={currentUserData?.user?.id ?? null}
                        seriesId={room.seriesId ?? null}
                        joiningFee={room.joiningFee}
                        timezone={room.timezone ?? null}
                        actionLabel="Join Room"
                        onAction={() => router.push(`/studyroom/${room.id}`)}
                      />
                    ))
                }
              </div>
            )}
            
          </div>
        )}

        {/* Filters & Search Container */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 items-start md:items-center justify-between sticky top-0 z-30 bg-background/80 backdrop-blur-md py-4 -mx-4 px-4 border-b border-border/40">
            {/* Search Bar */}
            <div className="relative w-full md:max-w-md group">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 h-4 w-4 group-focus-within:text-green-600 transition-colors" />
                <Input
                type="text"
                placeholder="Search by name or skill..."
                value={searchQuery}
                onKeyDown={(e) => {
                  const allowedSpecialKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape', 'Home', 'End'];
                  if (allowedSpecialKeys.includes(e.key)) return;
                  if (e.key.length === 1 && !/^[a-zA-Z0-9 \-.,/']$/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const sanitized = e.target.value.replace(/[^a-zA-Z0-9 \-.,/']/g, "");
                  setSearchQuery(sanitized);
                }}
                className="pl-10 h-11 w-full rounded-2xl border-muted bg-muted/20 focus-visible:ring-green-500/20 focus-visible:border-green-500/30 transition-all"
                />
            </div>
            
            {/* Tabs */}
             <div className="grid grid-cols-2 h-12 items-center justify-center rounded-2xl bg-muted p-1 text-muted-foreground w-full md:w-auto border border-border/10">
                <button
                type="button"
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-6 py-1.5 text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2",
                    activeTab === "peers" 
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20" 
                    : "hover:bg-background/60 hover:text-foreground"
                )}
                onClick={() => setActiveTab("peers")}
                >
                <span>Peers</span>
                {(searchQuery || selectedSkills.length > 0) && peerCount > 0 && (
                    <Badge variant="secondary" className={cn("text-[10px] h-5 px-1.5 min-w-5", activeTab === "peers" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700")}>
                    {peerCount}
                    </Badge>
                )}
                </button>
                <button
                type="button"
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-6 py-1.5 text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2",
                    activeTab === "studyRooms" 
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20" 
                    : "hover:bg-background/60 hover:text-foreground"
                )}
                onClick={() => setActiveTab("studyRooms")}
                >
                <span>Study Rooms</span>
                {(searchQuery || selectedSkills.length > 0) && studyRoomCount > 0 && (
                    <Badge variant="secondary" className={cn("text-[10px] h-5 px-1.5 min-w-5", activeTab === "studyRooms" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700")}>
                    {studyRoomCount}
                    </Badge>
                )}
                </button>
            </div>
            
            {/* Debate Rooms Link */}
            <Link href="/debateroom">
              <Button 
                variant="outline" 
                className="h-11 rounded-2xl border-muted bg-muted/20 hover:bg-muted/40 text-sm font-semibold"
              >
                <Swords className="h-4 w-4 mr-2" />
                Debate Rooms
              </Button>
            </Link>
        </div>

        {/* Skill Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3 mb-4">
            {activeTab === "peers" && (
              <Select
                value={peerHasSocialLinks}
                onValueChange={(value) => setPeerHasSocialLinks(value as "all" | "withSocial")}
              >
                <SelectTrigger className="w-[210px] h-9 rounded-xl border-muted bg-muted/20">
                  <SelectValue placeholder="Peer filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All peers</SelectItem>
                  <SelectItem value="withSocial">With social links</SelectItem>
                </SelectContent>
              </Select>
            )}

            {activeTab === "studyRooms" && (
              <>
                <Select
                  value={studyStatus}
                  onValueChange={(value) =>
                    setStudyStatus(
                      value as "all" | SessionStatus.UPCOMING | SessionStatus.ONGOING
                    )
                  }
                >
                  <SelectTrigger className="w-[190px] h-9 rounded-xl border-muted bg-muted/20">
                    <SelectValue placeholder="Session status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value={SessionStatus.UPCOMING}>Upcoming</SelectItem>
                    <SelectItem value={SessionStatus.ONGOING}>Ongoing</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={studyFreeOnly}
                  onValueChange={(value) => setStudyFreeOnly(value as "all" | "free")}
                >
                  <SelectTrigger className="w-[170px] h-9 rounded-xl border-muted bg-muted/20">
                    <SelectValue placeholder="Fee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All fees</SelectItem>
                    <SelectItem value="free">Free only</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {skillsLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-20 rounded-full" />
              ))
            ) : (
              skills.slice(0, 6).map((skill) => (
                <Badge
                  key={skill.id}
                  variant="outline"
                  className={cn(
                    "cursor-pointer text-xs py-1.5 px-3 rounded-full hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all",
                    selectedSkills.find((s) => s.id === skill.id)
                      ? "bg-green-500/10 text-green-700 border-green-500/20"
                      : "bg-background text-muted-foreground border-border/50"
                  )}
                  onClick={() => toggleSkill(skill)}
                >
                  {skill.name}
                </Badge>
              ))
            )}
          </div>

          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2">
                Active:
              </span>
              {selectedSkills.map((skill) => (
                <Badge
                  key={skill.id}
                  className="cursor-pointer text-xs py-1 px-2.5 rounded-full bg-green-100 text-green-800 hover:bg-green-200 border-green-200 gap-1 pl-3"
                  onClick={() => removeSkill(skill.id)}
                >
                  {skill.name}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedSkills([])}
                className="h-6 text-[10px] text-muted-foreground hover:text-destructive px-2 ml-1"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

          {/* {activeTab === "studyRooms" &&
            trendingStudyRooms.length > 0 &&
            !searchQuery &&
            selectedSkills.length === 0 &&
            studyStatus === "all" &&
            studyFreeOnly === "all" && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-green-600" />
                  <h3 className="text-sm font-semibold text-foreground">Trending Study Rooms</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {trendingStudyRooms.map((room) => (
                    <StudyRoomCardComponent
                      key={`trending-${room.id}`}
                      roomId={room.id}
                      status={
                        studyRoomCardDisplayLive(room.sessionStatus, room.date)
                          ? "live"
                          : "scheduled"
                      }
                      title={room.title}
                      description={room.description}
                      date={room.date}
                      duration={room.duration}
                      imageUrl={room.imageUrl}
                      participants={{
                        current: room.participantCount,
                        max: room.maxParticipants,
                      }}
                      host={studyRoomCardHost(room)}
                      category={studyRoomCategoryLabel(room.skills)}
                      skillNames={studyRoomSkillNames(room.skills)}
                      sessionStatus={room.sessionStatus}
                      currentUserId={currentUserData?.user?.id ?? null}
                      seriesId={room.seriesId ?? null}
                      joiningFee={room.joiningFee}
                      timezone={room.timezone ?? null}
                      actionLabel="Join Room"
                      onAction={() => router.push(`/studyroom/${room.id}`)}
                    />
                  ))}
                </div>
              </div>
            )} */}

          <div className="mt-6">
            {browseLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="h-full">
                    <div className="border rounded-lg p-4 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : browseError ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                  Failed to load data. Please try again later.
                </p>
                <Button 
                  variant="default" 
                  onClick={() => window.location.reload()}
                  className="w-full sm:w-auto bg-green-100 text-green-800 hover:bg-green-200 border border-green-300 shadow-none"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <>
                {activeTab === "peers" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {peers.map((peer) => (
                        <PeerCardComponent key={peer.id} peer={peer} />
                      ))}
                      {peers.length === 0 && !browseLoading && (
                        <div className="col-span-full text-center py-12 text-muted-foreground text-sm sm:text-base">
                          No peers found matching your criteria
                        </div>
                      )}
                    </div>
                    {browseData?.pagination.totalPages &&
                      browseData.pagination.totalPages > 1 && (
                        <div className="mt-6 flex justify-center">
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                              disabled={currentPage === 1 || browseLoading}
                              variant="outline"
                            >
                              Previous
                            </Button>
                            <span className="text-sm text-muted-foreground px-2">
                              Page {browseData.pagination.page} of {browseData.pagination.totalPages}
                            </span>
                            <Button
                              onClick={() => setCurrentPage((p) => p + 1)}
                              disabled={!browseData.pagination.hasMore || browseLoading}
                              variant="outline"
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                  </>
                )}

                {activeTab === "studyRooms" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {studyRooms.map((room) => (
                        <StudyRoomCardComponent 
                          key={room.id}
                          roomId={room.id}
                          slug= {room.slug}
                          status={
                          studyRoomCardDisplayLive(room.sessionStatus, room.date)
                            ? "live"
                            : "scheduled"
                        }
                          title={room.title}
                          description={room.description}
                          date={room.date}
                          duration={room.duration}
                          imageUrl={room.imageUrl}
                          participants={{
                            current: room.participantCount,
                            max: room.maxParticipants
                          }}
                          host={studyRoomCardHost(room)}
                          category={studyRoomCategoryLabel(room.skills)}
                          skillNames={studyRoomSkillNames(room.skills)}
                          sessionStatus={room.sessionStatus}
                          currentUserId={currentUserData?.user?.id ?? null}
                          seriesId={room.seriesId ?? null}
                          joiningFee={room.joiningFee}
                          timezone={room.timezone ?? null}
                          actionLabel="Join Room"
                          onAction={() => handleRoomAction(room)}
                        />
                      ))}
                      {studyRooms.length === 0 && !browseLoading && (
                        <div className="col-span-full text-center py-12 text-muted-foreground text-sm sm:text-base">
                          No study rooms found matching your criteria
                        </div>
                      )}
                    </div>
                    {browseData?.pagination.totalPages &&
                      browseData.pagination.totalPages > 1 && (
                        <div className="mt-6 flex justify-center">
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                              disabled={currentPage === 1 || browseLoading}
                              variant="outline"
                            >
                              Previous
                            </Button>
                            <span className="text-sm text-muted-foreground px-2">
                              Page {browseData.pagination.page} of {browseData.pagination.totalPages}
                            </span>
                            <Button
                              onClick={() => setCurrentPage((p) => p + 1)}
                              disabled={!browseData.pagination.hasMore || browseLoading}
                              variant="outline"
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                  </>
                )}
              </>
            )}
          </div>
      </main>

      <Footer />
    </div>
  );
}

export function BrowseClient() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen bg-muted/5 selection:bg-primary/10">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
           <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
            <div className="space-y-2">
               <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground bg-muted/50 w-fit">
                  <ArrowLeft className="h-3.5 w-3.5" /> 
                  Back to Dashboard
               </div>
               <div className="space-y-1">
                 <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 pb-1">
                   Browse Community
                 </h1>
                 <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
                   Discover peers and study rooms to learn and grow together
                 </p>
               </div>
            </div>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <BrowsePageContent />
    </Suspense>
  );
}

