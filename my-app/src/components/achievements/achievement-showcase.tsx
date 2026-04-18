"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Flame, Gem, GraduationCap, Lock, Medal, Sparkles, Target, Trophy, Users, Zap, type LucideIcon } from "lucide-react";
import { AchievementProgress } from "./achievement-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPoints } from "@/lib/utils/coin-format";
import type { Achievement } from "@/types/achievements.types";

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
  actionLabel: string;
  actionHref: string;
  icon: LucideIcon;
  badgeClass: string;
};

const categoryConfig: Record<Achievement["category"], CategoryConfig> = {
  learning: {
    label: "Learning",
    description: "Earn collectibles from learning.",
    actionLabel: "Explore",
    actionHref: "/browse",
    icon: GraduationCap,
    badgeClass: "bg-emerald-100 text-emerald-700",
  },
  teaching: {
    label: "Teaching",
    description: "Unlock rewards by hosting.",
    actionLabel: "Host",
    actionHref: "/create-study-room",
    icon: Trophy,
    badgeClass: "bg-sky-100 text-sky-700",
  },
  social: {
    label: "Community",
    description: "Grow your circle for drops.",
    actionLabel: "Invite",
    actionHref: "/browse?tab=peers",
    icon: Users,
    badgeClass: "bg-pink-100 text-pink-700",
  },
  milestone: {
    label: "Milestones",
    description: "Track major platform wins.",
    actionLabel: "Goals",
    actionHref: "/dashboard",
    icon: Medal,
    badgeClass: "bg-amber-100 text-amber-700",
  },
  streak: {
    label: "Streaks",
    description: "Keep streaks alive for timed rewards.",
    actionLabel: "Streak",
    actionHref: "/dashboard",
    icon: Flame,
    badgeClass: "bg-orange-100 text-orange-700",
  },
};

type EnrichedAchievement = Achievement & {
  progressValue: number;
  maxValue: number;
  completion: number;
  remaining: number;
};

function enrichAchievement(achievement: Achievement): EnrichedAchievement {
  const progressValue = achievement.progress ?? 0;
  const maxValue = achievement.maxProgress ?? 1;
  const safeMaxValue = maxValue <= 0 ? 1 : maxValue;
  const remaining = Math.max(safeMaxValue - progressValue, 0);

  return {
    ...achievement,
    progressValue,
    maxValue: safeMaxValue,
    completion: Math.min((progressValue / safeMaxValue) * 100, 100),
    remaining,
  };
}

export function AchievementShowcase({
  achievements,
}: AchievementShowcaseProps) {
  const [activeTab, setActiveTab] = useState<
    "all" | "unlocked" | "progress" | "locked"
  >("all");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [activeSlide, setActiveSlide] = useState(0);

  const enrichedAchievements = useMemo(
    () => achievements.map(enrichAchievement),
    [achievements],
  );

  const unlocked = useMemo(
    () => enrichedAchievements.filter((achievement) => achievement.unlockedAt),
    [enrichedAchievements],
  );
  const inProgress = useMemo(
    () =>
      enrichedAchievements.filter(
        (achievement) => !achievement.unlockedAt && achievement.progressValue > 0,
      ),
    [enrichedAchievements],
  );
  const locked = useMemo(
    () =>
      enrichedAchievements.filter(
        (achievement) => !achievement.unlockedAt && achievement.progressValue === 0,
      ),
    [enrichedAchievements],
  );

  const nextUnlock = useMemo(() => {
    return [...inProgress, ...locked]
      .sort((a, b) => {
        if (a.remaining !== b.remaining) {
          return a.remaining - b.remaining;
        }

        return b.completion - a.completion;
      })[0];
  }, [inProgress, locked]);

  const almostThere = useMemo(
    () =>
      inProgress
        .filter((achievement) => achievement.completion >= 60)
        .sort((a, b) => b.completion - a.completion)
        .slice(0, 3),
    [inProgress],
  );

  const categoryStats = useMemo(() => {
    return categoryOrder.map((category) => {
      const items = enrichedAchievements.filter(
        (achievement) => achievement.category === category,
      );
      const unlockedCount = items.filter((achievement) => achievement.unlockedAt).length;

      return {
        category,
        total: items.length,
        unlocked: unlockedCount,
        inProgress: items.filter(
          (achievement) => !achievement.unlockedAt && achievement.progressValue > 0,
        ).length,
        completion: items.length
          ? Math.round((unlockedCount / items.length) * 100)
          : 0,
      };
    });
  }, [enrichedAchievements]);

  const statusFilteredAchievements = useMemo(() => {
    switch (activeTab) {
      case "unlocked":
        return unlocked;
      case "progress":
        return inProgress;
      case "locked":
        return locked;
      default:
        return enrichedAchievements;
    }
  }, [activeTab, enrichedAchievements, inProgress, locked, unlocked]);

  const filteredAchievements = useMemo(() => {
    if (activeCategory === "all") {
      return statusFilteredAchievements;
    }

    return statusFilteredAchievements.filter(
      (achievement) => achievement.category === activeCategory,
    );
  }, [activeCategory, statusFilteredAchievements]);

  const sortedAchievements = useMemo(() => {
    return [...filteredAchievements].sort((a, b) => {
      if (a.unlockedAt && !b.unlockedAt) return -1;
      if (!a.unlockedAt && b.unlockedAt) return 1;
      if (a.remaining !== b.remaining) return a.remaining - b.remaining;
      return b.completion - a.completion;
    });
  }, [filteredAchievements]);

  const completeTodayCount = inProgress.filter(
    (achievement) => achievement.remaining <= 1,
  ).length;
  const currentAchievement = sortedAchievements[activeSlide] ?? null;
  const canGoPrevious = activeSlide > 0;
  const canGoNext = activeSlide < sortedAchievements.length - 1;

  useEffect(() => {
    setActiveSlide(0);
  }, [activeCategory, activeTab]);

  useEffect(() => {
    setActiveSlide((current) =>
      Math.min(current, Math.max(sortedAchievements.length - 1, 0)),
    );
  }, [sortedAchievements.length]);

  return (
    <Card className="h-full overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_26%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_24%),linear-gradient(145deg,#ffffff_0%,#f8fafc_45%,#ecfeff_100%)] shadow-[0_28px_90px_-42px_rgba(15,23,42,0.22)]">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Gem className="h-5 w-5 text-violet-500" />
              NFT Achievement Vault
            </CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete learning tasks, stack points, and mint collectible milestone NFTs into your vault.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge className="border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              Won {unlocked.length}
            </Badge>
            <Badge className="border-0 bg-sky-100 text-sky-700 hover:bg-sky-100">
              Tracking {inProgress.length}
            </Badge>
            <Badge className="border-0 bg-amber-100 text-amber-700 hover:bg-amber-100">
              Complete today {completeTodayCount}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {nextUnlock ? (
          <div className="relative overflow-hidden rounded-3xl border border-violet-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.2),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.18),_transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(245,243,255,0.96))] p-5 shadow-[0_24px_70px_-36px_rgba(139,92,246,0.45)]">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-violet-200/30 blur-3xl" />
            <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-0 bg-slate-900 text-white hover:bg-slate-900">
                    Next NFT to mint
                  </Badge>
                  {nextUnlock.remaining <= 1 ? (
                    <Badge className="border-0 bg-amber-100 text-amber-700 hover:bg-amber-100">
                      Mint today
                    </Badge>
                  ) : null}
                </div>

                <div>
                  <h3 className="text-2xl font-semibold tracking-tight">
                    {nextUnlock.title}
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    {nextUnlock.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700">
                    <Sparkles className="h-4 w-4" />
                    Reward +{formatPoints(nextUnlock.pointReward ?? 0)} Points
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-slate-700 shadow-sm">
                    <Target className="h-4 w-4 text-violet-600" />
                    {nextUnlock.remaining === 0
                      ? "Ready to mint"
                      : `${nextUnlock.remaining} more to go`}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span className="font-semibold text-violet-700">
                      {Math.round(nextUnlock.completion)}%
                    </span>
                  </div>
                  <Progress value={nextUnlock.completion} className="h-2.5" />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link href={categoryConfig[nextUnlock.category].actionHref}>
                    <Button className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
                      {categoryConfig[nextUnlock.category].actionLabel}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    Best next move for your next collectible in {categoryConfig[nextUnlock.category].label.toLowerCase()}.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {(almostThere.length > 0 ? almostThere : inProgress.slice(0, 3)).map((achievement) => (
                  <div
                    key={achievement.id}
                    className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          categoryConfig[achievement.category].badgeClass,
                        )}
                      >
                        {categoryConfig[achievement.category].label}
                      </span>
                      <span className="text-xs font-semibold text-emerald-700">
                        {Math.round(achievement.completion)}%
                      </span>
                    </div>
                    <p className="text-sm font-semibold">{achievement.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {achievement.remaining <= 1
                        ? "One more action can mint this today."
                        : `${achievement.remaining} more steps to mint.`}
                    </p>
                    <Progress value={achievement.completion} className="mt-3 h-2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/60 p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
              <Zap className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold">Your NFT vault starts here</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Join a session, teach once, or leave a review to start minting collectible achievement NFTs and earning points.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Link href="/browse">
                <Button className="rounded-full border border-emerald-800 bg-emerald-700 font-semibold text-white shadow-[0_10px_24px_-12px_rgba(4,120,87,0.85)] hover:bg-emerald-800">
                  Find a session
                </Button>
              </Link>
              <Link href="/create-study-room">
                <Button variant="outline" className="rounded-full">
                  Teach today
                </Button>
              </Link>
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/80 bg-white/80 p-4 text-center shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Minted
            </p>
            <p className="mt-2 text-3xl font-bold">{unlocked.length}</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 p-4 text-center shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Mint Queue
            </p>
            <p className="mt-2 text-3xl font-bold">
              {inProgress.length > 0 ? inProgress.length : "Guided"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 p-4 text-center shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Collections
            </p>
            <p className="mt-2 text-3xl font-bold">
              {categoryStats.filter((stat) => stat.total > 0).length}/{categoryOrder.length}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categoryStats.map((stat) => {
            const config = categoryConfig[stat.category];
            const Icon = config.icon;

            return (
              <button
                key={stat.category}
                type="button"
                onClick={() =>
                  setActiveCategory((current) =>
                    current === stat.category ? "all" : stat.category,
                  )
                }
                className={cn(
                  "rounded-2xl border bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(248,250,252,0.9))] p-4 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg",
                  activeCategory === stat.category &&
                  "border-violet-300 bg-violet-50/80 ring-1 ring-violet-200",
                )}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className={cn("rounded-2xl p-3", config.badgeClass)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold leading-none">
                      {stat.unlocked}
                      <span className="ml-1 text-sm font-medium text-muted-foreground">
                        /{stat.total}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {stat.inProgress} active
                    </p>
                  </div>
                </div>
                <p className="text-base font-semibold">{config.label}</p>
                <Progress value={stat.completion} className="mt-3 h-2" />
                <div className="mt-3 flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">{config.actionLabel}</span>
                  <span className="text-violet-600">Open collection</span>
                </div>
              </button>
            );
          })}
        </div>

        {activeCategory !== "all" ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">
                Focused on {categoryConfig[activeCategory].label}
              </p>
              <p className="text-muted-foreground">
                {categoryConfig[activeCategory].description}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={categoryConfig[activeCategory].actionHref}>
                <Button variant="outline" size="sm" className="rounded-full">
                  {categoryConfig[activeCategory].actionLabel}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={() => setActiveCategory("all")}
              >
                Clear filter
              </Button>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/80 bg-white/80 p-2 shadow-sm">
          <div className="grid grid-cols-4 rounded-xl bg-muted/60 p-1">
            {[
              { key: "all", label: "All", count: enrichedAchievements.length },
              { key: "unlocked", label: "Minted", count: unlocked.length },
              { key: "progress", label: "Active", count: inProgress.length },
              { key: "locked", label: "Locked", count: locked.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() =>
                  setActiveTab(tab.key as "all" | "unlocked" | "progress" | "locked")
                }
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-medium transition-all",
                  activeTab === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background/70",
                )}
              >
                {tab.label}
                <span className="ml-1.5 text-[10px] opacity-60">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/80 bg-white/85 p-3 shadow-sm sm:p-4">
          {sortedAchievements.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-white/70 py-12 text-center text-muted-foreground">
              <Lock className="mx-auto mb-3 h-5 w-5" />
              <p className="text-sm">No NFT collectibles match this filter yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-2xl bg-slate-50/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Achievement {activeSlide + 1} of {sortedAchievements.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    One collectible per slide so the full card stays visible.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() => setActiveSlide((current) => Math.max(current - 1, 0))}
                    disabled={!canGoPrevious}
                    aria-label="Show previous achievement"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() =>
                      setActiveSlide((current) =>
                        Math.min(current + 1, sortedAchievements.length - 1),
                      )
                    }
                    disabled={!canGoNext}
                    aria-label="Show next achievement"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {currentAchievement ? (
                <div className="px-1 sm:px-2 lg:px-3">
                  <AchievementProgress
                    key={currentAchievement.id}
                    achievement={currentAchievement}
                  />
                </div>
              ) : null}

              {sortedAchievements.length > 1 ? (
                <div className="flex flex-wrap items-center justify-center gap-2 px-1">
                  {sortedAchievements.map((achievement, index) => {
                    const isActive = index === activeSlide;

                    return (
                      <button
                        key={achievement.id}
                        type="button"
                        onClick={() => setActiveSlide(index)}
                        aria-label={`Show achievement ${index + 1}`}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                          "h-2.5 rounded-full transition-all",
                          isActive
                            ? "w-8 bg-violet-600"
                            : "w-2.5 bg-slate-300 hover:bg-slate-400",
                        )}
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
