"use client";

import { useCurrentStreak, useStreakHistory } from "@/hooks/use-streaks";
import { StreakTracker } from "./streak-tracker";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function StreakTrackerConnected() {
  const { data: streakData, isLoading: streakLoading } = useCurrentStreak();
  const { data: historyData, isLoading: historyLoading } = useStreakHistory(14);

  if (streakLoading || historyLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!streakData) {
    return null;
  }

  // Convert API data to component format
  const streakDays = historyData?.days?.map((day) => ({
    date: new Date(day.date),
    hasActivity: day.hasActivity,
    activityCount: day.sessionCount,
  })) || [];

  return (
    <StreakTracker
      currentStreak={streakData.currentStreak}
      longestStreak={streakData.longestStreak}
      streakDays={streakDays}
    />
  );
}
