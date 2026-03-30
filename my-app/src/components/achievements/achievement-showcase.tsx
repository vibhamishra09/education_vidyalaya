"use client";

import { Achievement } from "@/types/achievements.types";
import { AchievementBadge as _AchievementBadge } from "./achievement-badge";
import { AchievementProgress } from "./achievement-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs as _Tabs, TabsList as _TabsList, TabsTrigger as _TabsTrigger, TabsContent as _TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import {
  Trophy,
  Target,
  Lock as _Lock,
  GraduationCap,
  Users,
  Medal,
  Flame,
  type LucideIcon,
} from "lucide-react";

interface AchievementShowcaseProps {
  achievements: Achievement[];
  showProgress?: boolean;
}

const categoryOrder: Achievement["category"][] = [
  "learning",
  "teaching",
  "social",
  "milestone",
  "streak",
];

type CategoryFilter = Achievement["category"] | "all";

type CategoryConfig = {
  label: string;
  description: string;
  icon: LucideIcon;
  badgeClass: string;
};

const categoryConfig: Record<Achievement["category"], CategoryConfig> = {
  learning: {
    label: "Learning",
    description: "Complete learner milestones",
    icon: GraduationCap,
    badgeClass: "bg-emerald-100 text-emerald-700",
  },
  teaching: {
    label: "Teaching",
    description: "Level up your mentorship",
    icon: Trophy,
    badgeClass: "bg-sky-100 text-sky-600",
  },
  social: {
    label: "Community",
    description: "Grow your peer network",
    icon: Users,
    badgeClass: "bg-pink-100 text-pink-600",
  },
  milestone: {
    label: "Milestones",
    description: "Hit big goals & streaks",
    icon: Medal,
    badgeClass: "bg-amber-100 text-amber-600",
  },
  streak: {
    label: "Streaks",
    description: "Maintain consistent habits",
    icon: Flame,
    badgeClass: "bg-orange-100 text-orange-600",
  },
};

export function AchievementShowcase({
  achievements,
  showProgress,
}: AchievementShowcaseProps) {
  const [activeTab, setActiveTab] = useState<"all" | "unlocked" | "progress" | "locked">("all");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [showAll, setShowAll] = useState(false);

  const unlocked = useMemo(() => {
    const result = achievements.filter((a) => a.unlockedAt);
    console.log('[AchievementShowcase] Filtering unlocked:', {
      totalAchievements: achievements.length,
      unlockedCount: result.length,
      sampleAchievements: achievements.slice(0, 3).map(a => ({
        id: a.id,
        title: a.title,
        unlockedAt: a.unlockedAt,
        hasUnlockedAt: !!a.unlockedAt,
      })),
    });
    return result;
  }, [achievements]);
  
  const inProgress = useMemo(
    () => achievements.filter((a) => !a.unlockedAt && a.progress !== undefined && a.progress > 0),
    [achievements]
  );
  const locked = useMemo(
    () => achievements.filter((a) => !a.unlockedAt && (!a.progress || a.progress === 0)),
    [achievements]
  );

  const categoryStats = useMemo(() => {
    return categoryOrder.map((category) => {
      const categoryAchievements = achievements.filter((a) => a.category === category);
      const unlockedCount = categoryAchievements.filter((a) => a.unlockedAt).length;
      const inProgressCount = categoryAchievements.filter(
        (a) => !a.unlockedAt && a.progress && a.progress > 0
      ).length;

      return {
        category,
        total: categoryAchievements.length,
        unlocked: unlockedCount,
        inProgress: inProgressCount,
        completion: categoryAchievements.length
          ? Math.round((unlockedCount / categoryAchievements.length) * 100)
          : 0,
      };
    });
  }, [achievements]);

  const getStatusFilteredAchievements = () => {
    switch (activeTab) {
      case "unlocked":
        return unlocked;
      case "progress":
        return inProgress;
      case "locked":
        return locked;
      default:
        return achievements;
    }
  };

  const statusFilteredAchievements = getStatusFilteredAchievements();

  const filteredAchievements =
    activeCategory === "all"
      ? statusFilteredAchievements
      : statusFilteredAchievements.filter((achievement) => achievement.category === activeCategory);

  // Sort to prioritize unlocked, then in-progress, then locked
  const sortedAchievements = useMemo(() => {
    return [...filteredAchievements].sort((a, b) => {
      // Unlocked first
      if (a.unlockedAt && !b.unlockedAt) return -1;
      if (!a.unlockedAt && b.unlockedAt) return 1;
      
      // Then in-progress
      const aInProgress = !a.unlockedAt && a.progress && a.progress > 0;
      const bInProgress = !b.unlockedAt && b.progress && b.progress > 0;
      if (aInProgress && !bInProgress) return -1;
      if (!aInProgress && bInProgress) return 1;
      
      return 0;
    });
  }, [filteredAchievements]);

  // Show top 5 by default (prioritizing completed), or all if showAll is true
  const displayedAchievements = showAll ? sortedAchievements : sortedAchievements.slice(0, 5);
  const hasMore = sortedAchievements.length > 5;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Achievements
          </CardTitle>
          <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
             <span className="flex items-center gap-1"><Medal className="h-3 w-3" /> {unlocked.length}</span>
             <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {inProgress.length}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Compact Summary */}
        <div className="grid grid-cols-3 gap-3 mb-2">
          <div className="rounded-lg border bg-muted/40 p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Unlocked</p>
            <p className="text-2xl font-bold leading-none mt-1.5">{unlocked.length}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Tracking</p>
            <p className="text-2xl font-bold leading-none mt-1.5">{inProgress.length}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Categories</p>
            <p className="text-2xl font-bold leading-none mt-1.5">
              {categoryStats.filter((stat) => stat.total > 0).length}/{categoryOrder.length}
            </p>
          </div>
        </div>

        {/* Categories - Grid Layout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {categoryStats.map((stat) => {
            const config = categoryConfig[stat.category];
            const Icon = config.icon;

            return (
              <button
                key={stat.category}
                type="button"
                onClick={() =>
                  setActiveCategory((prev) => (prev === stat.category ? "all" : stat.category))
                }
                className={cn(
                  "flex flex-col rounded-xl border bg-card p-4 text-left transition-all hover:bg-muted/50 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary h-auto min-h-[100px] justify-between",
                  activeCategory === stat.category && "border-primary shadow-md bg-primary/5 ring-1 ring-primary/20"
                )}
              >
                <div className="flex items-start justify-between w-full mb-3">
                   <div className={cn("rounded-lg p-2 shink-0", config.badgeClass)}>
                      <Icon className="h-5 w-5" />
                   </div>
                   <div className="text-right">
                     <span className="text-lg font-bold block leading-none">{stat.unlocked}<span className="text-muted-foreground/60 text-sm font-normal">/{stat.total}</span></span>
                   </div>
                </div>
                <div>
                  <span className="text-sm font-semibold truncate block mb-2">{config.label}</span>
                  <Progress value={stat.completion} className="h-2 w-full" />
                </div>
              </button>
            );
          })}
        </div>
        
        <div className="flex-1 flex flex-col min-h-0">
            {activeCategory !== "all" && (
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm mb-3">
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">Filtering by:</span>
                  <span className="font-semibold">{categoryConfig[activeCategory].label}</span>
                </span>
                <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className="font-medium text-primary hover:underline"
                >
                Clear Filter
                </button>
            </div>
            )}

            <div className="flex-1 flex flex-col min-h-0">
              <div className="grid w-full grid-cols-4 h-9 mb-3 bg-muted p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={cn(
                      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      activeTab === "all" ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 text-muted-foreground"
                    )}
                  >
                    All <span className="ml-1.5 opacity-60 text-[10px]">{achievements.length}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("unlocked")}
                    className={cn(
                      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      activeTab === "unlocked" ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 text-muted-foreground"
                    )}
                  >
                    Won <span className="ml-1.5 opacity-60 text-[10px]">{unlocked.length}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("progress")}
                    className={cn(
                      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      activeTab === "progress" ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 text-muted-foreground"
                    )}
                  >
                    Active <span className="ml-1.5 opacity-60 text-[10px]">{inProgress.length}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("locked")}
                    className={cn(
                      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      activeTab === "locked" ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 text-muted-foreground"
                    )}
                  >
                    Locked <span className="ml-1.5 opacity-60 text-[10px]">{locked.length}</span>
                  </button>
              </div>
            
              <div className="flex-1 overflow-y-auto pr-1 -mr-1 min-h-[300px] max-h-[500px]">
                  <div className="space-y-3 pb-2">
                       {/* Simplified List Rendering logic */}
                      {(activeTab === "all" ? displayedAchievements : filteredAchievements).length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                              <p className="text-sm">No achievements found</p>
                          </div>
                      ) : (
                          (activeTab === "all" ? displayedAchievements : filteredAchievements).map((achievement) => (
                           <div key={achievement.id}>
                               <AchievementProgress achievement={achievement} />
                           </div>
                          ))
                      )}
                      
                     {activeTab === "all" && hasMore && !showAll && (
                      <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAll(true)}
                          className="w-full text-xs h-9"
                      >
                          Show {sortedAchievements.length - displayedAchievements.length} more
                      </Button>
                     )}
                     {activeTab === "all" && showAll && hasMore && (
                      <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAll(false)}
                          className="w-full text-xs h-9"
                      >
                          Collapse
                      </Button>
                     )}
                  </div>
              </div>
            </div>
        </div>

      </CardContent>
    </Card>
  );
}
