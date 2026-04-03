"use client";

import { Achievement, AchievementRarity } from "@/types/achievements.types";
import { cn } from "@/lib/utils";
import { Check, Sparkles } from "lucide-react";
import { formatPoints } from "@/lib/utils/coin-format";
import { AchievementArtwork } from "./achievement-artwork";

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
}

const rarityColors: Record<AchievementRarity, { progress: string }> = {
  common: {
    progress: "bg-slate-500",
  },
  rare: {
    progress: "bg-sky-500",
  },
  epic: {
    progress: "bg-violet-500",
  },
  legendary: {
    progress: "bg-amber-500",
  },
};

export function AchievementBadge({
  achievement,
  size = "md",
  showProgress = true,
}: AchievementBadgeProps) {
  const isUnlocked = !!achievement.unlockedAt;
  const hasProgress =
    achievement.progress !== undefined && achievement.maxProgress !== undefined;
  const progressPercentage =
    hasProgress && achievement.maxProgress
      ? (achievement.progress! / achievement.maxProgress!) * 100
      : 0;

  const colors = rarityColors[achievement.rarity];

  return (
    <div className="group relative z-10">
      <AchievementArtwork
        achievement={achievement}
        size={size}
        showProgress={showProgress}
      />

      <div className="pointer-events-none absolute bottom-full left-1/2 z-[70] mb-3 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover:opacity-100">
        <div className="relative min-w-[210px] max-w-[260px] rounded-2xl border border-white/60 bg-[linear-gradient(155deg,rgba(255,255,255,0.96),rgba(248,250,252,0.95))] px-4 py-3 text-sm text-popover-foreground shadow-2xl backdrop-blur">
          <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-white/60 bg-white" />

          <div className="relative">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold uppercase text-slate-700">
                {achievement.rarity.slice(0, 2)}
              </span>
              <p className="leading-tight font-semibold text-foreground">
                {achievement.title}
              </p>
            </div>
            <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
              {achievement.description}
            </p>

            {showProgress && hasProgress ? (
              <div className="mb-2">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">Mint progress</span>
                  <span className="font-medium text-foreground">
                    {achievement.progress}/{achievement.maxProgress}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", colors.progress)}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            ) : null}

            {achievement.pointReward ? (
              <div className="flex items-center gap-1.5 border-t border-border pt-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  +{formatPoints(achievement.pointReward)} points
                </span>
              </div>
            ) : null}

            {isUnlocked && achievement.unlockedAt ? (
              <div className="mt-2 flex items-center gap-1.5 border-t border-border pt-2">
                <Check className="h-3 w-3 text-emerald-500" />
                <span className="text-xs text-muted-foreground">
                  Minted {new Date(achievement.unlockedAt).toLocaleDateString()}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
