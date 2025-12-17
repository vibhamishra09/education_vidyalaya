"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { PeerCardComponent } from "@/components/cards/peer-card";
import { StudyRoomCardBrowse } from "@/components/cards/study-room-card-browse";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, Loader2 } from "lucide-react";
import { BrowsePeer, StudyRoomCard, Skill, BrowseFilters } from "@/types/api.types";
import { browseApi, skillsApi } from "@/lib/api";

type BrowseTab = "peers" | "studyRooms";

export function BrowseClient() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<BrowseTab>("peers");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [allPeers, setAllPeers] = useState<BrowsePeer[]>([]);
  const [allStudyRooms, setAllStudyRooms] = useState<StudyRoomCard[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [peerCount, setPeerCount] = useState<number>(0);
  const [studyRoomCount, setStudyRoomCount] = useState<number>(0);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);

  // Initialize search query from URL parameters
  useEffect(() => {
    const searchParam = searchParams.get("search");
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [searchParams]);

  // Fetch skills on mount
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        setSkillsLoading(true);
        const response = await skillsApi.getAllSkills(undefined, undefined, 20);
        setSkills(response.skills || []);
      } catch (error) {
        console.error("Failed to fetch skills:", error);
      } finally {
        setSkillsLoading(false);
      }
    };
    fetchSkills();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    setAllPeers([]);
    setAllStudyRooms([]);
  }, [activeTab, searchQuery, selectedSkills]);

  // Fetch browse data from API
  useEffect(() => {
    const fetchBrowseData = async () => {
      try {
        setBrowseLoading(true);
        setBrowseError(null);

        const browseFilters: BrowseFilters = {
          tab: activeTab,
          page: currentPage,
          limit: 20,
        };
        
        if (searchQuery && searchQuery.trim()) {
          browseFilters.search = searchQuery.trim();
        }
        
        if (selectedSkills.length > 0) {
          browseFilters.skills = selectedSkills.map(s => s.name);
        }

        const browseData = await browseApi.getBrowseData(browseFilters);

        // Update counts from API response
        if (browseData.counts) {
          setPeerCount(browseData.counts.peers);
          setStudyRoomCount(browseData.counts.studyRooms);
        }

        if (activeTab === "peers") {
          if (currentPage === 1) {
            setAllPeers(browseData.peers);
          } else {
            setAllPeers((prev) => [...prev, ...browseData.peers]);
          }
          setHasMore(browseData.pagination.hasMore);
        } else {
          if (currentPage === 1) {
            setAllStudyRooms(browseData.studyRooms);
          } else {
            setAllStudyRooms((prev) => [...prev, ...browseData.studyRooms]);
          }
          setHasMore(browseData.pagination.hasMore);
        }
      } catch (error: any) {
        console.error("Failed to fetch browse data:", error);
        setBrowseError(error.message || "Failed to load data");
      } finally {
        setBrowseLoading(false);
      }
    };

    fetchBrowseData();
  }, [activeTab, searchQuery, selectedSkills, currentPage]);

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

  const loadMore = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const peers = allPeers;
  const studyRooms = allStudyRooms;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Browse</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Discover peers and study rooms to learn and grow together
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by name or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>

        {/* Skill Filters */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {skillsLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-6 w-16" />
              ))
            ) : (
              skills.slice(0, 6).map((skill) => (
                <Badge
                  key={skill.id}
                  variant={
                    selectedSkills.find((s) => s.id === skill.id)
                      ? "default"
                      : "outline"
                  }
                  className="cursor-pointer text-xs"
                  onClick={() => toggleSkill(skill)}
                >
                  {skill.name}
                </Badge>
              ))
            )}
          </div>

          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground">
                Active filters:
              </span>
              {selectedSkills.map((skill) => (
                <Badge
                  key={skill.id}
                  variant="secondary"
                  className="cursor-pointer text-xs"
                  onClick={() => removeSkill(skill.id)}
                >
                  {skill.name}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              active={activeTab === "peers"}
              onClick={() => setActiveTab("peers")}
              className="text-sm sm:text-base flex items-center gap-2"
            >
              <span>Peers</span>
              {(searchQuery || selectedSkills.length > 0) && peerCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {peerCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              active={activeTab === "studyRooms"}
              onClick={() => setActiveTab("studyRooms")}
              className="text-sm sm:text-base flex items-center gap-2"
            >
              <span>Study Rooms</span>
              {(searchQuery || selectedSkills.length > 0) && studyRoomCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {studyRoomCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-6">
            {browseLoading && currentPage === 1 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
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
                  {browseError}
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="w-full sm:w-auto"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <>
                {activeTab === "peers" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {peers.map((peer) => (
                        <PeerCardComponent key={peer.id} peer={peer} />
                      ))}
                      {peers.length === 0 && !browseLoading && (
                        <div className="col-span-full text-center py-12 text-muted-foreground text-sm sm:text-base">
                          No peers found matching your criteria
                        </div>
                      )}
                    </div>
                    {hasMore && (
                      <div className="mt-6 flex justify-center">
                        <Button
                          onClick={loadMore}
                          disabled={browseLoading}
                          variant="outline"
                        >
                          {browseLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            "Load More"
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {activeTab === "studyRooms" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {studyRooms.map((room) => (
                        <StudyRoomCardBrowse key={room.id} studyRoom={room} />
                      ))}
                      {studyRooms.length === 0 && !browseLoading && (
                        <div className="col-span-full text-center py-12 text-muted-foreground text-sm sm:text-base">
                          No study rooms found matching your criteria
                        </div>
                      )}
                    </div>
                    {hasMore && (
                      <div className="mt-6 flex justify-center">
                        <Button
                          onClick={loadMore}
                          disabled={browseLoading}
                          variant="outline"
                        >
                          {browseLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            "Load More"
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
