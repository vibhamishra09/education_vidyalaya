"use client";

import { Achievement } from "@/types/achievements.types";
import { AchievementBadge } from "./achievement-badge";
import { AchievementProgress } from "./achievement-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import {
  Trophy,
  Target,
  Lock,
  GraduationCap,
  Users,
  Sparkles,
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
  showProgress = true,
}: AchievementShowcaseProps) {
  const [activeTab, setActiveTab] = useState<"all" | "unlocked" | "progress" | "locked">("all");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");

  const unlocked = useMemo(() => achievements.filter((a) => a.unlockedAt), [achievements]);
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Achievements
          </CardTitle>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:text-sm">
            <span>
              <span className="font-semibold text-primary">{unlocked.length}</span> unlocked
            </span>
            <span>·</span>
            <span>
              <span className="font-semibold text-primary">{inProgress.length}</span> in progress
            </span>
            <span>·</span>
            <span>{achievements.length} total</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-muted/40 p-4">
            <p className="text-xs uppercase text-muted-foreground">Unlocked awards</p>
            <p className="text-2xl font-semibold">{unlocked.length}</p>
            <p className="text-xs text-muted-foreground">
              {Math.round((unlocked.length / Math.max(achievements.length, 1)) * 100)}% complete
            </p>
          </div>
          <div className="rounded-xl border bg-muted/40 p-4">
            <p className="text-xs uppercase text-muted-foreground">Active goals</p>
            <p className="text-2xl font-semibold">{inProgress.length}</p>
            <p className="text-xs text-muted-foreground">Currently tracking progress</p>
          </div>
          <div className="rounded-xl border bg-muted/40 p-4">
            <p className="text-xs uppercase text-muted-foreground">Categories</p>
            <p className="text-2xl font-semibold">
              {categoryStats.filter((stat) => stat.total > 0).length} / {categoryOrder.length}
            </p>
            <p className="text-xs text-muted-foreground">Areas with available awards</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xxl:grid-cols-3">
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
                  "rounded-xl border bg-card p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-full",
                  activeCategory === stat.category && "border-primary shadow-lg"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full p-2", config.badgeClass)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-semibold">{config.label}</p>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {stat.unlocked}/{stat.total || 0}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5">
                  <Progress value={stat.completion} />
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <span>{stat.completion}% complete</span>
                    <span className="text-muted-foreground">
                      {stat.inProgress} active ·{" "}
                      {stat.total - stat.unlocked - stat.inProgress} locked
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {activeCategory !== "all" && (
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <span>
              Showing{" "}
              <span className="font-semibold">{categoryConfig[activeCategory].label}</span> awards
            </span>
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className="text-xs font-semibold text-primary"
            >
              Clear filter
            </button>
          </div>
        )}

        <Tabs className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger
              active={activeTab === "all"}
              onClick={() => setActiveTab("all")}
            >
              All ({achievements.length})
            </TabsTrigger>
            <TabsTrigger
              active={activeTab === "unlocked"}
              onClick={() => setActiveTab("unlocked")}
            >
              <Trophy className="h-3 w-3 mr-1" />
              {unlocked.length}
            </TabsTrigger>
            <TabsTrigger
              active={activeTab === "progress"}
              onClick={() => setActiveTab("progress")}
            >
              <Target className="h-3 w-3 mr-1" />
              {inProgress.length}
            </TabsTrigger>
            <TabsTrigger
              active={activeTab === "locked"}
              onClick={() => setActiveTab("locked")}
            >
              <Lock className="h-3 w-3 mr-1" />
              {locked.length}
            </TabsTrigger>
          </TabsList>

          {activeTab === "all" && (
            <TabsContent>
              {showProgress ? (
                <div className="space-y-4">
                  {filteredAchievements.map((achievement) => (
                    <AchievementProgress key={achievement.id} achievement={achievement} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {filteredAchievements.map((achievement) => (
                    <div key={achievement.id} className="flex justify-center">
                      <AchievementBadge achievement={achievement} />
                    </div>
                  ))}
                </div>
              )}
              {filteredAchievements.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-1">No achievements yet</p>
                  <p className="text-sm">Complete sessions to start earning achievements!</p>
                </div>
              )}
            </TabsContent>
          )}

          {activeTab === "unlocked" && (
            <TabsContent>
              {showProgress ? (
                <div className="space-y-4">
                  {filteredAchievements.map((achievement) => (
                    <AchievementProgress key={achievement.id} achievement={achievement} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {filteredAchievements.map((achievement) => (
                    <div key={achievement.id} className="flex justify-center">
                      <AchievementBadge achievement={achievement} />
                    </div>
                  ))}
                </div>
              )}
              {filteredAchievements.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-1">No unlocked achievements</p>
                  <p className="text-sm">Keep learning to unlock your first achievement!</p>
                </div>
              )}
            </TabsContent>
          )}

          {activeTab === "progress" && (
            <TabsContent>
              <div className="space-y-4">
                {filteredAchievements.map((achievement) => (
                  <AchievementProgress key={achievement.id} achievement={achievement} />
                ))}
              </div>
              {filteredAchievements.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-1">No achievements in progress</p>
                  <p className="text-sm">Start working towards new achievements!</p>
                </div>
              )}
            </TabsContent>
          )}

          {activeTab === "locked" && (
            <TabsContent>
              {showProgress ? (
                <div className="space-y-4">
                  {filteredAchievements.map((achievement) => (
                    <AchievementProgress key={achievement.id} achievement={achievement} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {filteredAchievements.map((achievement) => (
                    <div key={achievement.id} className="flex justify-center">
                      <AchievementBadge achievement={achievement} />
                    </div>
                  ))}
                </div>
              )}
              {filteredAchievements.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-1">All achievements unlocked!</p>
                  <p className="text-sm">Amazing work! 🎉</p>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
