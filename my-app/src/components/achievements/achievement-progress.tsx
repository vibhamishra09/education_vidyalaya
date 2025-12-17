"use client";

import { Achievement } from "@/types/achievements.types";
import { Progress } from "@/components/ui/progress";
import { AchievementBadge } from "./achievement-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCoins } from "@/lib/utils/coin-format";

interface AchievementProgressProps {
  achievement: Achievement;
  showDetails?: boolean;
}

export function AchievementProgress({
  achievement,
  showDetails = true,
}: AchievementProgressProps) {
  const hasProgress = achievement.progress !== undefined && achievement.maxProgress !== undefined;
  const progressPercentage = hasProgress
    ? (achievement.progress! / achievement.maxProgress!) * 100
    : 0;
  const isUnlocked = !!achievement.unlockedAt;

  return (
    <Card className={isUnlocked ? "border-primary/50" : ""}>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Badge */}
          <AchievementBadge achievement={achievement} size="md" showProgress={false} />

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between mb-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm break-words">{achievement.title}</h4>
                {showDetails && achievement.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 break-words">
                    {achievement.description}
                  </p>
                )}
              </div>
              {achievement.coins && (
                <div className="inline-flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-full flex-shrink-0 text-nowrap">
                  <span className="text-yellow-600 dark:text-yellow-400 text-[11px] font-semibold leading-none">
                    +{formatCoins(achievement.coins)}
                  </span>
                  <span className="text-[9px] text-yellow-600/70 dark:text-yellow-400/70 leading-none">
                    AYA
                  </span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {hasProgress && (
              <div className="space-y-1">
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {achievement.progress} / {achievement.maxProgress}
                  </span>
                  <span className="text-xs font-medium text-primary">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
              </div>
            )}

            {/* Unlocked Date */}
            {isUnlocked && achievement.unlockedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Unlocked{' '}
                {new Date(achievement.unlockedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
