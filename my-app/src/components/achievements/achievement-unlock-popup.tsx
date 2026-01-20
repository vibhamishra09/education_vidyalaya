"use client";

import { Achievement, AchievementRarity } from "@/types/achievements.types";
import { cn } from "@/lib/utils";
import { formatCoins } from "@/lib/utils/coin-format";
import { X, Sparkles, Trophy, Star, Crown, Medal } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

interface AchievementUnlockPopupProps {
  achievement: Achievement;
  onClose: () => void;
}

const rarityConfig: Record<AchievementRarity, { 
  gradient: string; 
  border: string; 
  glow: string;
  icon: React.ElementType;
  label: string;
}> = {
  common: {
    gradient: "from-gray-500/20 via-gray-400/10 to-gray-500/20",
    border: "border-gray-400/50",
    glow: "shadow-gray-400/30",
    icon: Medal,
    label: "Common Achievement",
  },
  rare: {
    gradient: "from-blue-500/20 via-blue-400/10 to-blue-500/20",
    border: "border-blue-400/50",
    glow: "shadow-blue-400/30",
    icon: Star,
    label: "Rare Achievement",
  },
  epic: {
    gradient: "from-purple-500/20 via-purple-400/10 to-purple-500/20",
    border: "border-purple-400/50",
    glow: "shadow-purple-400/30",
    icon: Trophy,
    label: "Epic Achievement",
  },
  legendary: {
    gradient: "from-yellow-500/20 via-amber-400/10 to-yellow-500/20",
    border: "border-yellow-400/50",
    glow: "shadow-yellow-400/30",
    icon: Crown,
    label: "Legendary Achievement",
  },
};

export function AchievementUnlockPopup({ achievement, onClose }: AchievementUnlockPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const config = rarityConfig[achievement.rarity];
  const RarityIcon = config.icon;

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 50);
    
    // Trigger confetti for epic and legendary achievements
    if (achievement.rarity === 'epic' || achievement.rarity === 'legendary') {
      const colors = achievement.rarity === 'legendary' 
        ? ['#fbbf24', '#f59e0b', '#d97706']
        : ['#a855f7', '#9333ea', '#7c3aed'];
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors,
      });
    }

    return () => clearTimeout(timer);
  }, [achievement.rarity]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
      />

      {/* Popup */}
      <div
        className={cn(
          "relative w-full max-w-sm transform transition-all duration-300",
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border-2 bg-background shadow-2xl",
            config.border,
            config.glow
          )}
        >
          {/* Gradient Background */}
          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", config.gradient)} />
          
          {/* Animated Particles */}
          <div className="absolute inset-0 overflow-hidden">
            <Sparkles className="absolute top-4 left-4 h-6 w-6 text-yellow-400 animate-pulse" />
            <Sparkles className="absolute top-8 right-8 h-4 w-4 text-yellow-400 animate-pulse delay-100" />
            <Sparkles className="absolute bottom-12 left-8 h-5 w-5 text-yellow-400 animate-pulse delay-200" />
            <Sparkles className="absolute bottom-8 right-4 h-6 w-6 text-yellow-400 animate-pulse delay-300" />
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            aria-label="Close achievement popup"
            className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Content */}
          <div className="relative px-6 py-8 text-center">
            {/* Header */}
            <div className="mb-4">
              <div className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                achievement.rarity === 'legendary' && "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
                achievement.rarity === 'epic' && "bg-purple-500/20 text-purple-600 dark:text-purple-400",
                achievement.rarity === 'rare' && "bg-blue-500/20 text-blue-600 dark:text-blue-400",
                achievement.rarity === 'common' && "bg-gray-500/20 text-gray-600 dark:text-gray-400",
              )}>
                <RarityIcon className="h-3.5 w-3.5" />
                {config.label}
              </div>
            </div>

            {/* Achievement Icon */}
            <div className="relative mb-4">
              <div className={cn(
                "mx-auto w-24 h-24 rounded-full flex items-center justify-center text-5xl",
                "bg-gradient-to-br from-background to-muted border-2",
                config.border,
                "shadow-lg animate-bounce"
              )} style={{ animationDuration: "2s" }}>
                {achievement.icon}
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Achievement Unlocked!
            </h2>

            {/* Achievement Name */}
            <h3 className={cn(
              "text-xl font-semibold mb-3",
              achievement.rarity === 'legendary' && "text-yellow-600 dark:text-yellow-400",
              achievement.rarity === 'epic' && "text-purple-600 dark:text-purple-400",
              achievement.rarity === 'rare' && "text-blue-600 dark:text-blue-400",
              achievement.rarity === 'common' && "text-gray-600 dark:text-gray-400",
            )}>
              {achievement.title}
            </h3>

            {/* Description */}
            <p className="text-muted-foreground text-sm mb-6">
              {achievement.description}
            </p>

            {/* Reward */}
            {achievement.coins && achievement.coins > 0 && (
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">🪙</span>
                  <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                    +{formatCoins(achievement.coins)} Webya
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Reward added to your wallet</p>
              </div>
            )}

            {/* Action Button */}
            <Button
              onClick={handleClose}
              className={cn(
                "w-full",
                achievement.rarity === 'legendary' && "bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black",
                achievement.rarity === 'epic' && "bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600",
                achievement.rarity === 'rare' && "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600",
                achievement.rarity === 'common' && ""
              )}
            >
              Awesome!
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
