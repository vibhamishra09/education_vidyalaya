"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AchievementBadge } from "./achievement-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPoints } from "@/lib/utils/coin-format";
import { cn } from "@/lib/utils";
import { Gem, Sparkles } from "lucide-react";
import type { Achievement } from "@/types/achievements.types";

interface AchievementProgressProps {
  achievement: Achievement;
  showDetails?: boolean;
}

function getRemainingLabel(achievement: Achievement, remaining: number) {
  const descriptor = `${achievement.title} ${achievement.description}`.toLowerCase();

  if (remaining <= 0) {
    return "NFT ready to mint";
  }

  if (
    descriptor.includes("review") ||
    descriptor.includes("rating") ||
    descriptor.includes("star")
  ) {
    return `${remaining} more review${remaining === 1 ? "" : "s"} needed`;
  }

  if (achievement.category === "streak") {
    return `${remaining}-day streak away`;
  }

  if (achievement.category === "social" || descriptor.includes("connect")) {
    return `${remaining} more connection${remaining === 1 ? "" : "s"} needed`;
  }

  if (achievement.category === "teaching" || descriptor.includes("teach")) {
    return `${remaining} more teaching session${remaining === 1 ? "" : "s"}`;
  }

  return `${remaining} more session${remaining === 1 ? "" : "s"} to mint`;
}

function rarityGlow(rarity: Achievement["rarity"]) {
  if (rarity === "legendary") {
    return "border-amber-300/70 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_35%),linear-gradient(135deg,rgba(255,251,235,0.98),rgba(254,243,199,0.92))] shadow-[0_24px_70px_-40px_rgba(245,158,11,0.75)]";
  }
  if (rarity === "epic") {
    return "border-violet-300/60 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.16),transparent_35%),linear-gradient(135deg,rgba(250,245,255,0.98),rgba(237,233,254,0.92))] shadow-[0_24px_70px_-40px_rgba(139,92,246,0.55)]";
  }
  if (rarity === "rare") {
    return "border-sky-300/60 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_35%),linear-gradient(135deg,rgba(239,246,255,0.98),rgba(219,234,254,0.92))] shadow-[0_24px_70px_-40px_rgba(14,165,233,0.45)]";
  }

  return "border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] shadow-[0_20px_60px_-42px_rgba(148,163,184,0.4)]";
}

export function AchievementProgress({
  achievement,
  showDetails = true,
}: AchievementProgressProps) {
  const hasProgress =
    achievement.progress !== undefined && achievement.maxProgress !== undefined;
  const progressValue = achievement.progress ?? 0;
  const maxProgress = achievement.maxProgress ?? 0;
  const progressPercentage =
    hasProgress && maxProgress > 0
      ? Math.min((progressValue / maxProgress) * 100, 100)
      : 0;
  const isUnlocked = !!achievement.unlockedAt;
  const remaining = hasProgress ? Math.max(maxProgress - progressValue, 0) : null;
  const remainingLabel =
    remaining !== null ? getRemainingLabel(achievement, remaining) : null;
  const isCompleteToday = !isUnlocked && remaining === 1;

  return (
    <Card className={cn("overflow-visible border transition-all", rarityGlow(achievement.rarity))}>
      <CardContent className="p-5">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex shrink-0 justify-center sm:block">
            <AchievementBadge
              achievement={achievement}
              size="lg"
              showProgress={false}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="truncate text-lg font-semibold leading-tight text-slate-900">
                    {achievement.title}
                  </h4>
                  <Badge className="border-0 bg-slate-900 text-white hover:bg-slate-900">
                    {isUnlocked ? "Minted" : "Collectible"}
                  </Badge>
                  {isCompleteToday ? (
                    <Badge className="border-0 bg-amber-100 text-amber-700 hover:bg-amber-100">
                      Mint today
                    </Badge>
                  ) : null}
                </div>
                {showDetails && achievement.description ? (
                  <p className="mt-1.5 text-sm leading-snug text-slate-600">
                    {achievement.description}
                  </p>
                ) : null}
              </div>

              {achievement.pointReward ? (
                <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  +{formatPoints(achievement.pointReward)} Points
                </div>
              ) : null}
            </div>

            {hasProgress ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Gem className="h-3.5 w-3.5 text-slate-400" />
                    Mint progress
                  </span>
                  <span className={isUnlocked ? "font-semibold text-emerald-600" : "font-medium text-slate-700"}>
                    {progressValue}/{maxProgress} - {Math.round(progressPercentage)}%
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2.5 w-full" />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className={isUnlocked ? "font-medium text-emerald-600" : "text-slate-500"}>
                    {isUnlocked && achievement.unlockedAt
                      ? `Minted ${new Date(achievement.unlockedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}`
                      : remainingLabel}
                  </span>
                  {!isUnlocked && remaining !== null && remaining <= 3 ? (
                    <span className="font-medium text-violet-600">Near mint</span>
                  ) : null}
                </div>
              </div>
            ) : isUnlocked && achievement.unlockedAt ? (
              <p className="text-xs font-medium text-emerald-600">
                Minted{" "}
                {new Date(achievement.unlockedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
