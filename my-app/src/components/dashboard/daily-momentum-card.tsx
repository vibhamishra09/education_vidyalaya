"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Coins,
  Flame,
  Lock,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCoins } from "@/lib/utils/coin-format";
import type { DashboardEngagementSummary, DashboardMission } from "@/types/api.types";

interface DailyMomentumCardProps {
  engagement?: DashboardEngagementSummary;
  isLoading?: boolean;
}

function missionIcon(id: string) {
  if (id.includes("teach")) {
    return Trophy;
  }
  if (id.includes("review")) {
    return Coins;
  }
  return Flame;
}

function missionStatusStyles(status: DashboardMission["status"]) {
  if (status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "locked") {
    return "border-slate-200 bg-slate-100 text-slate-500";
  }
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function missionStatusLabel(status: DashboardMission["status"]) {
  if (status === "completed") {
    return "Completed";
  }
  if (status === "locked") {
    return "Locked";
  }
  return "Ready";
}

function missionTone(id: string) {
  if (id.includes("teach")) {
    return {
      iconShell: "border-sky-200 bg-sky-50 text-sky-700",
      reward: "border-sky-200 bg-sky-50 text-sky-700",
      button:
        "border-sky-200 bg-sky-100 text-sky-800 hover:bg-sky-200 hover:border-sky-300",
    };
  }

  if (id.includes("review")) {
    return {
      iconShell: "border-amber-200 bg-amber-50 text-amber-700",
      reward: "border-amber-200 bg-amber-50 text-amber-700",
      button:
        "border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-200 hover:border-amber-300",
    };
  }

  return {
    iconShell: "border-emerald-200 bg-emerald-50 text-emerald-700",
    reward: "border-emerald-200 bg-emerald-50 text-emerald-700",
    button:
      "border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 hover:border-emerald-300",
  };
}

function formatRewardTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function MissionCard({ mission }: { mission: DashboardMission }) {
  const Icon = missionIcon(mission.id);
  const tone = missionTone(mission.id);

  return (
    <div className="flex h-full min-h-[320px] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.94))] p-5 text-slate-900 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div
          className={cn(
            "rounded-2xl border p-2.5 shadow-sm shrink-0",
            tone.iconShell,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <Badge className={cn("shrink-0 border", missionStatusStyles(mission.status))}>
          {missionStatusLabel(mission.status)}
        </Badge>
      </div>

      <div className="mb-3">
        <p className="!text-lg !font-semibold !leading-tight !text-slate-900 break-words">
          {mission.title}
        </p>
        <p className="mt-1.5 !text-xs !font-medium !text-slate-500">{mission.progressLabel}</p>
      </div>

      <p className="min-h-[100px] flex-1 !text-sm !leading-7 !text-slate-600">
        {mission.description}
      </p>

      <div className="mt-5 grid gap-3 border-t border-slate-200/80 pt-4">
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm",
            tone.reward,
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          +{formatCoins(mission.rewardPoints)} Points
        </div>
        <Button
          asChild
          size="sm"
          variant={mission.status === "locked" ? "outline" : "default"}
          className={cn(
            "!flex h-auto min-h-11 w-full min-w-0 !shrink justify-center whitespace-normal rounded-2xl px-4 py-3 text-center text-sm leading-5",
            mission.status === "locked"
              ? "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
              : tone.button,
          )}
        >
          <Link
            href={mission.actionHref}
            className="flex w-full min-w-0 items-center justify-center gap-2"
          >
            <span>{mission.actionLabel}</span>
            {mission.status !== "locked" ? <ArrowRight className="h-4 w-4" /> : null}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function DailyMomentumCard({
  engagement,
  isLoading = false,
}: DailyMomentumCardProps) {
  if (isLoading && !engagement) {
    return (
      <Card className="relative overflow-hidden rounded-[34px] border border-emerald-200/40 bg-white/40 p-6 sm:p-7 shadow-[0_34px_90px_-48px_rgba(34,197,94,0.15)]">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-6 w-48 rounded-full" />
            </div>
            <div className="mt-4">
              <Skeleton className="h-8 w-3/4 rounded-lg" />
              <Skeleton className="mt-2 h-4 w-2/3 rounded-lg" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:max-w-2xl">
              <Skeleton className="h-24 rounded-[24px]" />
              <Skeleton className="h-24 rounded-[24px]" />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Skeleton className="h-[320px] rounded-[28px]" />
              <Skeleton className="h-[320px] rounded-[28px]" />
              <Skeleton className="h-[320px] rounded-[28px]" />
            </div>
          </div>
          <div className="rounded-[30px] border border-emerald-100/50 bg-slate-50/50 p-5">
            <Skeleton className="h-5 w-40 rounded-lg" />
            <Skeleton className="mt-2 h-4 w-56 rounded-lg" />
            <div className="mt-5 space-y-3">
              <Skeleton className="h-24 rounded-[24px]" />
              <Skeleton className="h-24 rounded-[24px]" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (!engagement) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden rounded-[34px] border border-emerald-200/70 bg-[radial-gradient(circle_at_top_left,rgba(0,220,110,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(0,140,210,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.14),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] text-slate-900 shadow-[0_34px_90px_-48px_rgba(34,197,94,0.35)]">
      <div className="absolute -left-10 top-0 h-44 w-44 rounded-full bg-emerald-300/25 blur-3xl" />
      <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-sky-200/35 blur-3xl" />
      <div className="absolute bottom-0 right-20 h-28 w-28 rounded-full bg-amber-200/35 blur-3xl" />
      <CardContent className="relative p-6 sm:p-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                Daily momentum
              </Badge>
              <Badge className="border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50">
                {engagement.completedCount}/{engagement.totalCount} missions completed
              </Badge>
            </div>

            <div className="mt-4 max-w-2xl">
              <p className="!m-0 !text-2xl !font-semibold !leading-tight !tracking-tight !text-slate-950 md:!text-3xl">
                {engagement.headline}
              </p>
              <p className="mt-2 !text-sm !leading-6 !text-slate-600 md:!text-base">
                {engagement.subtitle}
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:max-w-2xl">
              <div className="rounded-[24px] border border-white/80 bg-white/85 px-4 py-4 shadow-sm backdrop-blur">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Weekly Points
                </p>
                <p className="mt-1 text-2xl font-semibold text-emerald-700">
                  +{formatCoins(engagement.weeklyPoints)}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/85 px-4 py-4 shadow-sm backdrop-blur">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Total Points
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {formatCoins(engagement.totalPoints)}
                </p>
              </div>
              <p className="sm:col-span-2 text-sm font-medium text-slate-600">
                Points are tracked separately from your wallet coins.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {engagement.missions.map((mission) => (
                <MissionCard key={mission.id} mission={mission} />
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-emerald-200/70 bg-[linear-gradient(180deg,rgba(240,253,244,0.88),rgba(248,250,252,0.82))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Fresh points activity</p>
                <p className="mt-1 text-sm text-slate-600">
                  Short-cycle point rewards that landed recently.
                </p>
              </div>
              <div className="rounded-full border border-emerald-200 bg-white/80 p-2 shadow-sm">
                <Sparkles className="h-4 w-4 text-emerald-600" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {engagement.recentRewards.length > 0 ? (
                engagement.recentRewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{reward.title}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {reward.description || "Bonus points awarded"}
                        </p>
                      </div>
                      <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        +{formatCoins(reward.pointsAmount)} pts
                      </div>
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-400">
                      {formatRewardTime(reward.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-emerald-200 bg-white/70 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
                    <Lock className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="font-medium text-slate-900">No points activity yet</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Complete one mission and this panel will start lighting up.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Points land automatically. No manual claiming flow needed.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
