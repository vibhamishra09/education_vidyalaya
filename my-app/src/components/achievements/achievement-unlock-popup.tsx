"use client";

import { Achievement, AchievementRarity } from "@/types/achievements.types";
import { cn } from "@/lib/utils";
import { formatPoints } from "@/lib/utils/coin-format";
import { X, Sparkles, Trophy, Star, Crown, Medal, Gem } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

interface AchievementUnlockPopupProps {
  achievement: Achievement;
  onClose: () => void;
}

const rarityConfig: Record<
  AchievementRarity,
  {
    gradient: string;
    border: string;
    glow: string;
    icon: React.ElementType;
    label: string;
    cta: string;
  }
> = {
  common: {
    gradient: "from-slate-500/20 via-slate-400/10 to-slate-500/20",
    border: "border-slate-400/50",
    glow: "shadow-slate-400/30",
    icon: Medal,
    label: "Common NFT",
    cta: "Stored in vault",
  },
  rare: {
    gradient: "from-sky-500/20 via-cyan-400/10 to-sky-500/20",
    border: "border-sky-400/50",
    glow: "shadow-sky-400/30",
    icon: Star,
    label: "Rare NFT",
    cta: "Rare drop secured",
  },
  epic: {
    gradient: "from-violet-500/20 via-fuchsia-400/10 to-violet-500/20",
    border: "border-violet-400/50",
    glow: "shadow-violet-400/30",
    icon: Trophy,
    label: "Epic NFT",
    cta: "Epic mint complete",
  },
  legendary: {
    gradient: "from-amber-500/20 via-yellow-400/10 to-amber-500/20",
    border: "border-amber-400/50",
    glow: "shadow-amber-400/30",
    icon: Crown,
    label: "Legendary NFT",
    cta: "Legendary mint complete",
  },
};

export function AchievementUnlockPopup({
  achievement,
  onClose,
}: AchievementUnlockPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const config = rarityConfig[achievement.rarity];
  const RarityIcon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);

    if (achievement.rarity === "epic" || achievement.rarity === "legendary") {
      const colors =
        achievement.rarity === "legendary"
          ? ["#fbbf24", "#f59e0b", "#d97706"]
          : ["#a855f7", "#9333ea", "#7c3aed"];

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
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0",
        )}
        onClick={handleClose}
      />

      <div
        className={cn(
          "relative w-full max-w-md transform transition-all duration-300",
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-[2rem] border bg-background shadow-2xl",
            config.border,
            config.glow,
          )}
        >
          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-70", config.gradient)} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.15),transparent_28%)]" />

          <div className="absolute inset-0 overflow-hidden">
            <Sparkles className="absolute left-4 top-4 h-6 w-6 animate-pulse text-yellow-400" />
            <Sparkles className="absolute right-8 top-8 h-4 w-4 animate-pulse text-yellow-400 delay-100" />
            <Sparkles className="absolute bottom-12 left-8 h-5 w-5 animate-pulse text-yellow-400 delay-200" />
            <Sparkles className="absolute bottom-8 right-4 h-6 w-6 animate-pulse text-yellow-400 delay-300" />
          </div>

          <button
            onClick={handleClose}
            aria-label="Close achievement popup"
            className="absolute right-4 top-4 z-10 rounded-full bg-background/80 p-1.5 transition-colors hover:bg-background"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="relative px-6 py-8 text-center">
            <div className="mb-4">
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                  achievement.rarity === "legendary" && "bg-amber-500/20 text-amber-600 dark:text-amber-400",
                  achievement.rarity === "epic" && "bg-violet-500/20 text-violet-600 dark:text-violet-400",
                  achievement.rarity === "rare" && "bg-sky-500/20 text-sky-600 dark:text-sky-400",
                  achievement.rarity === "common" && "bg-slate-500/20 text-slate-600 dark:text-slate-400",
                )}
              >
                <RarityIcon className="h-3.5 w-3.5" />
                {config.label}
              </div>
            </div>

            <div className="relative mb-5">
              <div
                className={cn(
                  "mx-auto flex h-28 w-24 items-center justify-center rounded-[1.6rem] border bg-gradient-to-br from-background to-muted text-5xl shadow-lg",
                  config.border,
                )}
              >
                {achievement.icon}
              </div>
              <div className="absolute -right-1 left-1/2 top-3 mx-auto w-fit -translate-x-1/2 rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                NFT
              </div>
            </div>

            <h2 className="mb-2 text-2xl font-bold text-foreground">
              NFT Minted
            </h2>

            <h3
              className={cn(
                "mb-3 text-xl font-semibold",
                achievement.rarity === "legendary" && "text-amber-600 dark:text-amber-400",
                achievement.rarity === "epic" && "text-violet-600 dark:text-violet-400",
                achievement.rarity === "rare" && "text-sky-600 dark:text-sky-400",
                achievement.rarity === "common" && "text-slate-600 dark:text-slate-400",
              )}
            >
              {achievement.title}
            </h3>

            <p className="mb-6 text-sm text-muted-foreground">
              {achievement.description}
            </p>

            {achievement.pointReward && achievement.pointReward > 0 ? (
              <div className="mb-6 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 p-4">
                <div className="flex items-center justify-center gap-2">
                  <Gem className="h-5 w-5 text-amber-500" />
                  <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    +{formatPoints(achievement.pointReward)} Points
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Added as collectible progression value, not wallet coins
                </p>
              </div>
            ) : null}

            <Button
              onClick={handleClose}
              className={cn(
                "w-full",
                achievement.rarity === "legendary" && "bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-600 hover:to-yellow-600",
                achievement.rarity === "epic" && "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600",
                achievement.rarity === "rare" && "bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600",
                achievement.rarity === "common" && "",
              )}
            >
              {config.cta}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
