"use client";

import { Achievement, AchievementRarity } from "@/types/achievements.types";
import { cn } from "@/lib/utils";
import { Lock, Check } from "lucide-react";

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
}

const rarityColors: Record<AchievementRarity, { bg: string; border: string; glow: string }> = {
  common: {
    bg: "bg-gray-100 dark:bg-gray-800",
    border: "border-gray-300 dark:border-gray-600",
    glow: "shadow-gray-200",
  },
  rare: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-400 dark:border-blue-600",
    glow: "shadow-blue-200",
  },
  epic: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    border: "border-purple-400 dark:border-purple-600",
    glow: "shadow-purple-200",
  },
  legendary: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    border: "border-yellow-400 dark:border-yellow-600",
    glow: "shadow-yellow-200 animate-pulse",
  },
};

const sizeClasses = {
  sm: {
    container: "w-16 h-16",
    icon: "text-2xl",
    badge: "text-[10px] px-1.5 py-0.5",
  },
  md: {
    container: "w-20 h-20",
    icon: "text-3xl",
    badge: "text-xs px-2 py-0.5",
  },
  lg: {
    container: "w-24 h-24",
    icon: "text-4xl",
    badge: "text-sm px-2 py-1",
  },
};

export function AchievementBadge({
  achievement,
  size = "md",
  showProgress = true,
}: AchievementBadgeProps) {
  const isUnlocked = !!achievement.unlockedAt;
  const hasProgress = achievement.progress !== undefined && achievement.maxProgress !== undefined;
  const progressPercentage = hasProgress
    ? (achievement.progress! / achievement.maxProgress!) * 100
    : 0;

  const colors = rarityColors[achievement.rarity];
  const sizes = sizeClasses[size];

  return (
    <div className="relative group">
      {/* Badge Container */}
      <div
        className={cn(
          "relative rounded-full border-2 flex items-center justify-center transition-all duration-300",
          sizes.container,
          isUnlocked
            ? cn(colors.bg, colors.border, colors.glow, "shadow-lg")
            : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-60"
        )}
      >
        {/* Icon */}
        <span className={cn(sizes.icon, !isUnlocked && "grayscale")}>
          {achievement.icon}
        </span>

        {/* Lock Overlay for Locked Achievements */}
        {!isUnlocked && !hasProgress && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
            <Lock className="h-6 w-6 text-gray-600" />
          </div>
        )}

        {/* Check Mark for Unlocked */}
        {isUnlocked && (
          <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
            <Check className="h-3 w-3 text-white" />
          </div>
        )}

        {/* Progress Ring for In-Progress Achievements */}
        {hasProgress && !isUnlocked && (
          <svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={`${progressPercentage * 3.01} 301`}
              className={cn(
                "transition-all duration-500",
                achievement.rarity === 'legendary' && "text-yellow-500",
                achievement.rarity === 'epic' && "text-purple-500",
                achievement.rarity === 'rare' && "text-blue-500",
                achievement.rarity === 'common' && "text-gray-500"
              )}
            />
          </svg>
        )}
      </div>

      {/* Rarity Badge */}
      <div
        className={cn(
          "absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full font-medium uppercase tracking-wide whitespace-nowrap",
          sizes.badge,
          achievement.rarity === 'legendary' && "bg-yellow-500 text-yellow-900",
          achievement.rarity === 'epic' && "bg-purple-500 text-white",
          achievement.rarity === 'rare' && "bg-blue-500 text-white",
          achievement.rarity === 'common' && "bg-gray-500 text-white"
        )}
      >
        {achievement.rarity}
      </div>

      {/* Tooltip on Hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 max-w-xs whitespace-normal shadow-xl">
          <p className="font-semibold mb-1">{achievement.title}</p>
          <p className="text-gray-300 mb-2">{achievement.description}</p>
          {showProgress && hasProgress && (
            <p className="text-gray-400 text-[10px]">
              Progress: {achievement.progress}/{achievement.maxProgress}
            </p>
          )}
          {achievement.coins && (
            <p className="text-yellow-400 text-[10px] mt-1">
              Reward: {achievement.coins} coins
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
