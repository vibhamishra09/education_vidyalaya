"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { Achievement } from "@/types/achievements.types";
import { AchievementUnlockPopup } from "@/components/achievements/achievement-unlock-popup";

interface AchievementNotificationContextType {
  showAchievementUnlock: (achievement: Achievement) => void;
  checkForNewUnlocks: (achievements: Achievement[], previousUnlockCount: number) => void;
}

const AchievementNotificationContext = createContext<AchievementNotificationContextType | undefined>(undefined);

// Key for localStorage to track shown achievements
const SHOWN_ACHIEVEMENTS_KEY = "shown_achievement_unlocks";

export function AchievementNotificationProvider({ children }: { children: ReactNode }) {
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const [shownAchievements, setShownAchievements] = useState<Set<string>>(new Set());

  // Load shown achievements from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(SHOWN_ACHIEVEMENTS_KEY);
      if (stored) {
        try {
          setShownAchievements(new Set(JSON.parse(stored)));
        } catch {
          // Invalid JSON, reset
          localStorage.removeItem(SHOWN_ACHIEVEMENTS_KEY);
        }
      }
    }
  }, []);

  // Save shown achievements to localStorage
  const markAsShown = useCallback((achievementId: string) => {
    setShownAchievements(prev => {
      const next = new Set(prev);
      next.add(achievementId);
      if (typeof window !== "undefined") {
        localStorage.setItem(SHOWN_ACHIEVEMENTS_KEY, JSON.stringify([...next]));
      }
      return next;
    });
  }, []);

  // Show a single achievement popup
  const showAchievementUnlock = useCallback((achievement: Achievement) => {
    if (!shownAchievements.has(achievement.id)) {
      setPendingAchievements(prev => [...prev, achievement]);
    }
  }, [shownAchievements]);

  // Check for new unlocks by comparing with previous count
  const checkForNewUnlocks = useCallback((achievements: Achievement[], previousUnlockCount: number) => {
    const unlockedAchievements = achievements.filter(a => a.unlockedAt);
    
    // If we have more unlocked than before, find the new ones
    if (unlockedAchievements.length > previousUnlockCount) {
      const newUnlocks = unlockedAchievements
        .filter(a => !shownAchievements.has(a.id))
        .sort((a, b) => {
          // Sort by unlock time, newest first
          const timeA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
          const timeB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
          return timeB - timeA;
        });

      if (newUnlocks.length > 0) {
        setPendingAchievements(prev => [...prev, ...newUnlocks]);
      }
    }
  }, [shownAchievements]);

  // Process pending achievements queue
  useEffect(() => {
    if (!currentAchievement && pendingAchievements.length > 0) {
      const [next, ...rest] = pendingAchievements;
      setCurrentAchievement(next);
      setPendingAchievements(rest);
    }
  }, [currentAchievement, pendingAchievements]);

  const handleClose = useCallback(() => {
    if (currentAchievement) {
      markAsShown(currentAchievement.id);
    }
    setCurrentAchievement(null);
  }, [currentAchievement, markAsShown]);

  return (
    <AchievementNotificationContext.Provider value={{ showAchievementUnlock, checkForNewUnlocks }}>
      {children}
      {currentAchievement && (
        <AchievementUnlockPopup
          achievement={currentAchievement}
          onClose={handleClose}
        />
      )}
    </AchievementNotificationContext.Provider>
  );
}

export function useAchievementNotification() {
  const context = useContext(AchievementNotificationContext);
  if (!context) {
    throw new Error("useAchievementNotification must be used within AchievementNotificationProvider");
  }
  return context;
}
