"use client";

import { useAchievements } from "@/hooks/use-achievements";
import { AchievementShowcase } from "./achievement-showcase";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAchievementNotification } from "@/contexts/achievement-notification-context";
import { useEffect, useRef, useMemo } from "react";
import type { Achievement as LocalAchievement } from "@/types/achievements.types";
import type { Achievement as ApiAchievement } from "@/types/api.types";

export function AchievementShowcaseConnected({ showProgress = true }: { showProgress?: boolean }) {
  const { data, isLoading } = useAchievements();
  const { checkForNewUnlocks } = useAchievementNotification();
  const previousUnlockCountRef = useRef<number>(0);

  // Mock Frontend Engineer Persona Achievements
  const mockAchievements = useMemo<LocalAchievement[]>(() => [
    {
      id: "fe-1",
      title: "UI Artisan",
      description: "Crafted pixel-perfect user interfaces",
      icon: "🎨",
      category: "learning",
      rarity: "rare",
      unlockedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      progress: 100,
      maxProgress: 100,
      coins: 50,
    },
    {
      id: "fe-2",
      title: "Component Master",
      description: "Built reusable React components",
      icon: "⚛️",
      category: "learning",
      rarity: "common",
      unlockedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      progress: 1,
      maxProgress: 1,
      coins: 20,
    },
    {
        id: "fe-3",
        title: "Accessibility Pro",
        description: "Made the web accessible for everyone",
        icon: "♿",
        category: "social",
        rarity: "epic",
        unlockedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        progress: 1,
        maxProgress: 1,
        coins: 100
    },
    {
       id: "fe-4",
       title: "State Manager",
       description: "Mastered complex state logic",
       icon: "🔄",
       category: "learning",
       rarity: "legendary",
       progress: 3,
       maxProgress: 5,
       coins: 150
    }
  ], []);

  // Convert API Achievement to local Achievement type
  const convertAchievement = (apiAchievement: ApiAchievement): LocalAchievement => {
    return {
      id: apiAchievement.id,
      title: apiAchievement.title,
      description: apiAchievement.description,
      icon: apiAchievement.icon,
      category: apiAchievement.category.toLowerCase() as LocalAchievement['category'],
      rarity: apiAchievement.rarity.toLowerCase() as LocalAchievement['rarity'],
      unlockedAt: apiAchievement.unlockedAt || undefined,
      progress: apiAchievement.progress,
      maxProgress: apiAchievement.maxProgress,
      coins: apiAchievement.coinReward,
    };
  };

  // Check for new achievement unlocks when data changes
  useEffect(() => {
    if (data && !isLoading) {
      const allAchievements: LocalAchievement[] = [
        ...data.unlocked.map(convertAchievement),
        ...data.inProgress.map(convertAchievement),
        ...data.locked.map(convertAchievement),
      ];

      const currentUnlockCount = data.unlocked.length;
      
      // Only check for new unlocks if this isn't the first load
      if (previousUnlockCountRef.current > 0 && currentUnlockCount > previousUnlockCountRef.current) {
        checkForNewUnlocks(allAchievements, previousUnlockCountRef.current);
      }
      
      previousUnlockCountRef.current = currentUnlockCount;
    }
  }, [data, isLoading, checkForNewUnlocks]);

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
    // Fallback to mocks if no data available
    return <AchievementShowcase achievements={mockAchievements} showProgress={showProgress} />;
  }

  // Combine all achievements
  let allAchievements: LocalAchievement[] = [
    ...data.unlocked.map(convertAchievement),
    ...data.inProgress.map(convertAchievement),
    ...data.locked.map(convertAchievement),
  ];
  
  // Inject mock "Frontend Engineer" achievements if user has 0 unlocked achievements
  // This ensures the "Frontend Engineer" persona is visible even for new users
  if (data.unlocked.length === 0) {
    allAchievements = [...mockAchievements, ...allAchievements];
  }

  return <AchievementShowcase achievements={allAchievements} showProgress={showProgress} />;
}
