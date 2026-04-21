"use client";

import { Check, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  Achievement,
  AchievementCategory,
  AchievementRarity,
} from "@/types/achievements.types";

interface AchievementArtworkProps {
  achievement: Achievement;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
}

type ArtworkTheme = {
  frameClass: string;
  shellClass: string;
  tokenClass: string;
  footerClass: string;
  rarityClass: string;
  accentClass: string;
  gradientStart: string;
  gradientEnd: string;
  spotlight: string;
  outfit: string;
  outfitAccent: string;
  accessory: string;
  accessoryAlt: string;
};

const sizeClasses = {
  sm: {
    shell: "w-32 rounded-[1.45rem]",
    image: "h-28 rounded-[1.1rem]",
    pad: "p-1.5",
    topText: "text-[9px]",
    token: "text-[10px]",
    footer: "px-3 py-2.5",
    rarity: "text-[10px] px-2.5 py-1",
  },
  md: {
    shell: "w-40 rounded-[1.7rem]",
    image: "h-36 rounded-[1.3rem]",
    pad: "p-2",
    topText: "text-[10px]",
    token: "text-[11px]",
    footer: "px-3.5 py-3",
    rarity: "text-[11px] px-3 py-1",
  },
  lg: {
    shell: "w-48 rounded-[1.9rem]",
    image: "h-40 rounded-[1.45rem]",
    pad: "p-2",
    topText: "text-[10px]",
    token: "text-[11px]",
    footer: "px-4 py-3.5",
    rarity: "text-[11px] px-3 py-1",
  },
} as const;

const rarityThemes: Record<
  AchievementRarity,
  Omit<
    ArtworkTheme,
    | "gradientStart"
    | "gradientEnd"
    | "spotlight"
    | "outfit"
    | "outfitAccent"
    | "accessory"
    | "accessoryAlt"
  >
> = {
  common: {
    frameClass:
      "border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[0_22px_60px_-38px_rgba(100,116,139,0.35)]",
    shellClass: "border-slate-300/90",
    tokenClass: "bg-white/90 text-slate-700",
    footerClass: "bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]",
    rarityClass: "bg-slate-900 text-white",
    accentClass: "text-slate-700",
  },
  rare: {
    frameClass:
      "border-sky-200 bg-[linear-gradient(180deg,#fdfefe_0%,#f0f8ff_100%)] shadow-[0_24px_70px_-40px_rgba(59,130,246,0.45)]",
    shellClass: "border-sky-300/90",
    tokenClass: "bg-white/90 text-sky-700",
    footerClass: "bg-[linear-gradient(180deg,#ffffff_0%,#eff6ff_100%)]",
    rarityClass: "bg-sky-500 text-white",
    accentClass: "text-sky-700",
  },
  epic: {
    frameClass:
      "border-violet-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7f1ff_100%)] shadow-[0_26px_80px_-42px_rgba(139,92,246,0.5)]",
    shellClass: "border-violet-300/90",
    tokenClass: "bg-white/90 text-violet-700",
    footerClass: "bg-[linear-gradient(180deg,#ffffff_0%,#f5f3ff_100%)]",
    rarityClass: "bg-violet-600 text-white",
    accentClass: "text-violet-700",
  },
  legendary: {
    frameClass:
      "border-amber-200 bg-[linear-gradient(180deg,#fffef8_0%,#fff5da_100%)] shadow-[0_30px_90px_-44px_rgba(245,158,11,0.58)]",
    shellClass: "border-amber-300/90",
    tokenClass: "bg-white/90 text-amber-700",
    footerClass: "bg-[linear-gradient(180deg,#ffffff_0%,#fffbeb_100%)]",
    rarityClass: "bg-amber-400 text-amber-950",
    accentClass: "text-amber-700",
  },
};

const categoryThemes: Record<
  AchievementCategory,
  Omit<
    ArtworkTheme,
    "frameClass" | "shellClass" | "tokenClass" | "footerClass" | "rarityClass" | "accentClass"
  >
> = {
  learning: {
    gradientStart: "#d9f0ff",
    gradientEnd: "#97d8ff",
    spotlight: "#ffffff",
    outfit: "#1f4b6f",
    outfitAccent: "#f59e0b",
    accessory: "#22c55e",
    accessoryAlt: "#fef3c7",
  },
  teaching: {
    gradientStart: "#dbeafe",
    gradientEnd: "#9aa5ff",
    spotlight: "#fef9c3",
    outfit: "#5b3cc4",
    outfitAccent: "#f472b6",
    accessory: "#1d4ed8",
    accessoryAlt: "#fde68a",
  },
  social: {
    gradientStart: "#ffe1f2",
    gradientEnd: "#f9c57f",
    spotlight: "#ffffff",
    outfit: "#be185d",
    outfitAccent: "#facc15",
    accessory: "#7c3aed",
    accessoryAlt: "#f9a8d4",
  },
  milestone: {
    gradientStart: "#dcfce7",
    gradientEnd: "#99f6a8",
    spotlight: "#fef3c7",
    outfit: "#166534",
    outfitAccent: "#facc15",
    accessory: "#f59e0b",
    accessoryAlt: "#fef9c3",
  },
  streak: {
    gradientStart: "#ffe2df",
    gradientEnd: "#fb7185",
    spotlight: "#fde68a",
    outfit: "#7f1d1d",
    outfitAccent: "#fb923c",
    accessory: "#f97316",
    accessoryAlt: "#fde68a",
  },
};

const skinTones = ["#f9d7bd", "#edc5a1", "#d7a47d", "#8a5a3b"];

function hashValue(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function pick<T>(items: T[], seed: number, offset = 0) {
  return items[(seed + offset) % items.length];
}

function getTokenNumber(achievement: Achievement, seed: number) {
  const explicitProgress = achievement.maxProgress ?? achievement.progress ?? 0;
  const seededNumber = (seed % 8888) + 1 + explicitProgress * 7;

  return String(seededNumber).padStart(4, "0");
}

function getCollectionLabel(category: AchievementCategory) {
  if (category === "learning") return "Study Drop";
  if (category === "teaching") return "Mentor Mint";
  if (category === "social") return "Circle Pass";
  if (category === "milestone") return "Quest Relic";
  return "Streak Club";
}

function getTheme(achievement: Achievement): ArtworkTheme {
  return {
    ...rarityThemes[achievement.rarity],
    ...categoryThemes[achievement.category],
  };
}

function renderAccessory(
  category: AchievementCategory,
  theme: ArtworkTheme,
  seed: number,
) {
  if (category === "learning") {
    const bookColor = pick(["#34d399", "#22c55e", "#14b8a6"], seed);

    return (
      <>
        <path d="M25 39C30 27 70 27 75 39L68 41C64 33 36 33 32 41Z" fill={theme.accessory} />
        <rect x="20" y="65" width="19" height="13" rx="3" fill={bookColor} />
        <rect x="22.5" y="66.5" width="6.5" height="8" rx="1.2" fill="#fef3c7" />
        <rect x="40.5" y="64.5" width="13" height="10.5" rx="2.2" fill="#60a5fa" />
      </>
    );
  }

  if (category === "teaching") {
    return (
      <>
        <path d="M21 35L50 21L79 35L50 47Z" fill={theme.accessory} />
        <path d="M29 36.5H71V41C66 47 34 47 29 41Z" fill="#312e81" opacity="0.92" />
        <path d="M74 35.5V49.5" stroke={theme.accessoryAlt} strokeWidth="3" strokeLinecap="round" />
        <circle cx="74" cy="51.5" r="3" fill={theme.accessoryAlt} />
      </>
    );
  }

  if (category === "social") {
    return (
      <>
        <path d="M27 34C36 29 64 29 73 34L69 42C61 38 39 38 31 42Z" fill={theme.accessory} />
        <circle cx="41" cy="48" r="6" fill="none" stroke={theme.accessoryAlt} strokeWidth="3" />
        <circle cx="59" cy="48" r="6" fill="none" stroke={theme.accessoryAlt} strokeWidth="3" />
        <path d="M47 48H53" stroke={theme.accessoryAlt} strokeWidth="3" strokeLinecap="round" />
      </>
    );
  }

  if (category === "milestone") {
    return (
      <>
        <path d="M31 32L38 22L46 30L50 20L54 30L62 22L69 32V37H31Z" fill={theme.accessory} />
        <circle cx="40" cy="31" r="2.4" fill={theme.accessoryAlt} />
        <circle cx="50" cy="28" r="2.4" fill={theme.accessoryAlt} />
        <circle cx="60" cy="31" r="2.4" fill={theme.accessoryAlt} />
      </>
    );
  }

  return (
    <>
      <path d="M50 18C45 24 48 28 42 35C36 42 39 50 50 50C61 50 64 42 58 35C52 28 55 24 50 18Z" fill={theme.accessory} />
      <path d="M50 24C47 29 49 31 45 36C42 40 43 45 50 45C57 45 58 40 55 36C51 31 53 29 50 24Z" fill={theme.accessoryAlt} />
    </>
  );
}

function renderOutfitDetail(category: AchievementCategory, theme: ArtworkTheme) {
  if (category === "learning") {
    return (
      <>
        <rect x="41" y="70" width="18" height="18" rx="5" fill={theme.outfitAccent} />
        <path d="M50 70V88" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      </>
    );
  }

  if (category === "teaching") {
    return (
      <>
        <path d="M41 68H59L55 88H45Z" fill={theme.outfitAccent} />
        <circle cx="50" cy="74.5" r="2" fill="#ffffff" />
      </>
    );
  }

  if (category === "social") {
    return (
      <>
        <path d="M34 72C39 67 61 67 66 72" stroke={theme.outfitAccent} strokeWidth="4" strokeLinecap="round" />
        <circle cx="50" cy="76.5" r="5" fill={theme.outfitAccent} />
      </>
    );
  }

  if (category === "milestone") {
    return (
      <>
        <circle cx="50" cy="78" r="7" fill={theme.outfitAccent} />
        <path d="M50 72V88" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      </>
    );
  }

  return (
    <>
      <path d="M42 70L50 79L58 70" fill={theme.outfitAccent} />
      <path d="M50 79V88" stroke={theme.outfitAccent} strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

function renderBackground(theme: ArtworkTheme, seed: number) {
  const bubbleOffset = seed % 8;

  return (
    <>
      <defs>
        <linearGradient id={`bg-${seed}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={theme.gradientStart} />
          <stop offset="100%" stopColor={theme.gradientEnd} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill={`url(#bg-${seed})`} />
      <circle cx={22 + bubbleOffset} cy="18" r="16" fill={theme.spotlight} opacity="0.24" />
      <circle cx={80 - bubbleOffset} cy="23" r="12" fill="#ffffff" opacity="0.16" />
      <circle cx={79} cy={67 - bubbleOffset} r="20" fill="#ffffff" opacity="0.13" />
      <path d="M0 78C18 68 31 68 50 78C69 88 82 88 100 78V100H0Z" fill="#ffffff" opacity="0.14" />
    </>
  );
}

function renderAvatar(achievement: Achievement, theme: ArtworkTheme, seed: number) {
  const skin = pick(skinTones, seed);
  const hair = pick(["#1f2937", "#4b5563", "#7c2d12", "#6d28d9"], seed, 1);
  const eyeTilt = pick([-1, 0, 1], seed, 2);

  return (
    <>
      {renderAccessory(achievement.category, theme, seed)}
      <path d="M28 89C30 73 39 66 50 66C61 66 70 73 72 89Z" fill={theme.outfit} />
      {renderOutfitDetail(achievement.category, theme)}
      <rect x="44" y="57" width="12" height="11" rx="5" fill={skin} />
      <circle cx="50" cy="46" r="18" fill={skin} />
      <path d="M33 43C35 31 43 27 50 27C57 27 65 31 67 43V46H33Z" fill={hair} />
      <circle cx="43" cy="46" r="2.5" fill="#111827" />
      <circle cx="57" cy="46" r="2.5" fill="#111827" />
      <circle cx={43.6 + eyeTilt * 0.35} cy="45.4" r="0.8" fill="#ffffff" />
      <circle cx={57.6 + eyeTilt * 0.35} cy="45.4" r="0.8" fill="#ffffff" />
      <path d="M44 55C47 58 53 58 56 55" stroke="#7c2d12" strokeWidth="2.3" strokeLinecap="round" />
      <circle cx="35" cy="50" r="3.1" fill={skin} />
      <circle cx="65" cy="50" r="3.1" fill={skin} />
    </>
  );
}

export function AchievementArtwork({
  achievement,
  size = "md",
  showProgress = true,
}: AchievementArtworkProps) {
  const seed = hashValue(`${achievement.id}:${achievement.title}:${achievement.category}`);
  const theme = getTheme(achievement);
  const isUnlocked = Boolean(achievement.unlockedAt);
  const hasProgress =
    typeof achievement.progress === "number" &&
    typeof achievement.maxProgress === "number" &&
    achievement.maxProgress > 0;
  const progressPercentage = hasProgress
    ? Math.min((achievement.progress! / achievement.maxProgress!) * 100, 100)
    : 0;
  const tokenNumber = getTokenNumber(achievement, seed);
  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        "overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        sizes.shell,
        sizes.pad,
        theme.frameClass,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden border bg-white/60",
          sizes.image,
          theme.shellClass,
        )}
      >
        <svg
          viewBox="0 0 100 100"
          className={cn("h-full w-full", !isUnlocked && "saturate-[0.88]")}
          aria-hidden="true"
        >
          {renderBackground(theme, seed)}
          {renderAvatar(achievement, theme, seed)}
        </svg>

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2.5">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 font-semibold uppercase tracking-[0.18em] shadow-sm",
              sizes.topText,
              theme.tokenClass,
            )}
          >
            {getCollectionLabel(achievement.category)}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-1 font-semibold shadow-sm",
              sizes.token,
              theme.tokenClass,
            )}
          >
            #{tokenNumber}
          </span>
        </div>

        <div className="absolute right-2.5 top-11">
          <span
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/85 shadow-md backdrop-blur",
              theme.accentClass,
            )}
          >
            {isUnlocked ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Lock className="h-4 w-4 text-slate-500" />
            )}
          </span>
        </div>

        {showProgress && hasProgress && !isUnlocked ? (
          <div className="absolute inset-x-3 bottom-3 h-1.5 overflow-hidden rounded-full bg-white/45">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-2.5 rounded-[1.1rem] border border-white/70 shadow-sm",
          sizes.footer,
          theme.footerClass,
        )}
      >
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            We vault
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">
            {achievement.category} collectible
          </p>
        </div>
        <div className="mt-2.5">
          <p className="break-words text-[1rem] font-semibold leading-[1.35] text-slate-900">
            {achievement.title}
          </p>
        </div>
        <div className="mt-2 flex justify-start">
          <span
            className={cn(
              "inline-flex rounded-full font-semibold uppercase tracking-[0.22em] shadow-sm",
              sizes.rarity,
              theme.rarityClass,
            )}
          >
            {achievement.rarity}
          </span>
        </div>
      </div>

      {achievement.pointReward ? (
        <div className="mt-2 flex items-center justify-end gap-1.5 pr-1 text-[11px] font-semibold text-amber-600">
          <Sparkles className="h-3.5 w-3.5" />
          <span>+{achievement.pointReward}</span>
        </div>
      ) : null}
    </div>
  );
}
