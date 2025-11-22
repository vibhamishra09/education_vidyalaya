"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakDay {
  date: Date;
  hasActivity: boolean;
  activityCount?: number;
}

interface StreakTrackerProps {
  currentStreak: number;
  longestStreak: number;
  streakDays?: StreakDay[];
}

export function StreakTracker({
  currentStreak,
  longestStreak,
  streakDays,
}: StreakTrackerProps) {
  // Generate last 14 days if no data provided
  const days = streakDays || generateMockStreakDays();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Learning Streak
          </CardTitle>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            <Flame className="h-4 w-4 mr-1 text-orange-500" />
            {currentStreak} days
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Streak Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {currentStreak}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Current Streak</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {longestStreak}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Longest Streak</p>
          </div>
        </div>

        {/* Streak Calendar */}
        <div>
          <h4 className="text-sm font-medium mb-3">Last 14 Days</h4>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              const isToday = isDateToday(day.date);
              return (
                <div
                  key={index}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={cn(
                      "w-full aspect-square rounded-lg border-2 transition-all relative",
                      day.hasActivity
                        ? "bg-primary border-primary shadow-sm"
                        : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                      isToday && "ring-2 ring-orange-500 ring-offset-2"
                    )}
                  >
                    {day.hasActivity && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Flame className="h-4 w-4 text-white" />
                      </div>
                    )}
                    {isToday && !day.hasActivity && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {day.date.toLocaleDateString('en-US', { weekday: 'short' })[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Motivation Message */}
        <div className="text-center p-4 rounded-lg bg-muted/50">
          {currentStreak === 0 ? (
            <p className="text-sm text-muted-foreground">
              Start your streak today! Complete a session to begin. 💪
            </p>
          ) : currentStreak < 7 ? (
            <p className="text-sm text-muted-foreground">
              Keep going! You&apos;re building a great habit. 🎯
            </p>
          ) : currentStreak < 30 ? (
            <p className="text-sm text-muted-foreground">
              Amazing! You&apos;re on fire! 🔥
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Incredible dedication! You&apos;re unstoppable! 🚀
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function isDateToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function generateMockStreakDays(): StreakDay[] {
  const days: StreakDay[] = [];
  const today = new Date();

  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Mock: 70% chance of activity
    const hasActivity = Math.random() > 0.3;

    days.push({
      date,
      hasActivity,
      activityCount: hasActivity ? Math.floor(Math.random() * 3) + 1 : 0,
    });
  }

  return days;
}
