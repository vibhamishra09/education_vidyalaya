"use client";

import { useAchievements } from "@/hooks/use-achievements";
import { AchievementShowcase } from "./achievement-showcase";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Achievement as LocalAchievement } from "@/types/achievements.types";
import type { Achievement as ApiAchievement } from "@/types/api.types";

export function AchievementShowcaseConnected({ showProgress = true }: { showProgress?: boolean }) {
  const { data, isLoading } = useAchievements();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // Convert API Achievement to local Achievement type
  const convertAchievement = (apiAchievement: ApiAchievement): LocalAchievement => ({
    id: apiAchievement.id,
    title: apiAchievement.title,
    description: apiAchievement.description,
    icon: apiAchievement.icon,
    category: apiAchievement.category.toLowerCase() as LocalAchievement['category'],
    rarity: apiAchievement.rarity.toLowerCase() as LocalAchievement['rarity'],
    unlockedAt: apiAchievement.unlocked ? apiAchievement.unlockedAt : undefined,
    progress: apiAchievement.progress,
    maxProgress: apiAchievement.maxProgress,
    coins: apiAchievement.coinReward,
  });

  // Combine all achievements
  const allAchievements: LocalAchievement[] = [
    ...data.unlocked.map(convertAchievement),
    ...data.inProgress.map(convertAchievement),
    ...data.locked.map(convertAchievement),
  ];

  return <AchievementShowcase achievements={allAchievements} showProgress={showProgress} />;
}
