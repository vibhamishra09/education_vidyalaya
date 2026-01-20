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
    <Card className={`overflow-hidden transition-all hover:shadow-sm ${isUnlocked ? "border-primary/40 bg-primary/5" : "border-border/60"}`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Badge */}
          <div className="flex-shrink-0 scale-90 -ml-1">
             <AchievementBadge achievement={achievement} size="sm" showProgress={false} />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 py-0.5">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="min-w-0">
                <h4 className="font-semibold text-sm leading-tight truncate pr-2">{achievement.title}</h4>
                {showDetails && achievement.description && (
                  <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1 mt-0.5">
                    {achievement.description}
                  </p>
                )}
              </div>
              {achievement.coins && (
                <div className="inline-flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <span className="text-yellow-600 dark:text-yellow-400 text-[10px] font-bold leading-none">
                    +{formatCoins(achievement.coins)}
                  </span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {hasProgress ? (
              <div className="space-y-1 mt-1.5">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                  <span>{achievement.progress}/{achievement.maxProgress}</span>
                  <span className={isUnlocked ? "text-primary font-medium" : ""}>{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-1.5 w-full" />
              </div>
            ) : isUnlocked && achievement.unlockedAt ? (
                <p className="text-[10px] text-primary/80 font-medium mt-1">
                 Unlocked {new Date(achievement.unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
