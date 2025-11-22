"use client";

import { Achievement } from "@/types/achievements.types";
import { AchievementBadge } from "./achievement-badge";
import { AchievementProgress } from "./achievement-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import { Trophy, Target, Lock } from "lucide-react";

interface AchievementShowcaseProps {
  achievements: Achievement[];
  showProgress?: boolean;
}

export function AchievementShowcase({
  achievements,
  showProgress = true,
}: AchievementShowcaseProps) {
  const [activeTab, setActiveTab] = useState<"all" | "unlocked" | "progress" | "locked">("all");

  // Categorize achievements
  const unlocked = achievements.filter((a) => a.unlockedAt);
  const inProgress = achievements.filter(
    (a) => !a.unlockedAt && a.progress !== undefined && a.progress > 0
  );
  const locked = achievements.filter(
    (a) => !a.unlockedAt && (!a.progress || a.progress === 0)
  );

  const getFilteredAchievements = () => {
    switch (activeTab) {
      case "unlocked":
        return unlocked;
      case "progress":
        return inProgress;
      case "locked":
        return locked;
      default:
        return achievements;
    }
  };

  const filteredAchievements = getFilteredAchievements();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Achievements
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-primary">{unlocked.length}</span>
            <span> / {achievements.length}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger
              active={activeTab === "all"}
              onClick={() => setActiveTab("all")}
            >
              All ({achievements.length})
            </TabsTrigger>
            <TabsTrigger
              active={activeTab === "unlocked"}
              onClick={() => setActiveTab("unlocked")}
            >
              <Trophy className="h-3 w-3 mr-1" />
              {unlocked.length}
            </TabsTrigger>
            <TabsTrigger
              active={activeTab === "progress"}
              onClick={() => setActiveTab("progress")}
            >
              <Target className="h-3 w-3 mr-1" />
              {inProgress.length}
            </TabsTrigger>
            <TabsTrigger
              active={activeTab === "locked"}
              onClick={() => setActiveTab("locked")}
            >
              <Lock className="h-3 w-3 mr-1" />
              {locked.length}
            </TabsTrigger>
          </TabsList>

          {activeTab === "all" && (
            <TabsContent>
              {showProgress ? (
                <div className="space-y-4">
                  {filteredAchievements.map((achievement) => (
                    <AchievementProgress key={achievement.id} achievement={achievement} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {filteredAchievements.map((achievement) => (
                    <div key={achievement.id} className="flex justify-center">
                      <AchievementBadge achievement={achievement} />
                    </div>
                  ))}
                </div>
              )}
              {filteredAchievements.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-1">No achievements yet</p>
                  <p className="text-sm">Complete sessions to start earning achievements!</p>
                </div>
              )}
            </TabsContent>
          )}

          {activeTab === "unlocked" && (
            <TabsContent>
              {showProgress ? (
                <div className="space-y-4">
                  {filteredAchievements.map((achievement) => (
                    <AchievementProgress key={achievement.id} achievement={achievement} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {filteredAchievements.map((achievement) => (
                    <div key={achievement.id} className="flex justify-center">
                      <AchievementBadge achievement={achievement} />
                    </div>
                  ))}
                </div>
              )}
              {filteredAchievements.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-1">No unlocked achievements</p>
                  <p className="text-sm">Keep learning to unlock your first achievement!</p>
                </div>
              )}
            </TabsContent>
          )}

          {activeTab === "progress" && (
            <TabsContent>
              <div className="space-y-4">
                {filteredAchievements.map((achievement) => (
                  <AchievementProgress key={achievement.id} achievement={achievement} />
                ))}
              </div>
              {filteredAchievements.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-1">No achievements in progress</p>
                  <p className="text-sm">Start working towards new achievements!</p>
                </div>
              )}
            </TabsContent>
          )}

          {activeTab === "locked" && (
            <TabsContent>
              {showProgress ? (
                <div className="space-y-4">
                  {filteredAchievements.map((achievement) => (
                    <AchievementProgress key={achievement.id} achievement={achievement} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {filteredAchievements.map((achievement) => (
                    <div key={achievement.id} className="flex justify-center">
                      <AchievementBadge achievement={achievement} />
                    </div>
                  ))}
                </div>
              )}
              {filteredAchievements.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-1">All achievements unlocked!</p>
                  <p className="text-sm">Amazing work! 🎉</p>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
