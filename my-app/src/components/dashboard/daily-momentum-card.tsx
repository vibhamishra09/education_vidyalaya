"use client";

import Link from "next/link";
import { CheckCircle2, Coins, Flame, Lock, Sparkles, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function MissionCard({ mission }: { mission: DashboardMission }) {
  const Icon = missionIcon(mission.id);

  return (
    <div className="flex h-full min-h-[320px] flex-col overflow-hidden rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-4 text-slate-900 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="rounded-2xl bg-slate-900 p-2 text-white shadow-sm">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="!text-lg !font-semibold !leading-tight !text-slate-900">
              {mission.title}
            </p>
            <p className="!text-xs !text-slate-500">{mission.progressLabel}</p>
          </div>
        </div>
        <Badge className={cn("shrink-0 border", missionStatusStyles(mission.status))}>
          {mission.status}
        </Badge>
      </div>

      <p className="min-h-[112px] flex-1 !text-sm !leading-7 !text-slate-600">
        {mission.description}
      </p>

      <div className="mt-5 grid gap-3 border-t border-slate-200 pt-4">
        <div className="inline-flex items-center gap-1 self-start rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
          +{formatCoins(mission.rewardPoints)} Points
        </div>
        <Button
          asChild
          size="sm"
          variant={mission.status === "locked" ? "outline" : "default"}
          className={cn(
            "!flex h-auto min-h-11 w-full min-w-0 !shrink justify-center whitespace-normal rounded-full px-4 py-3 text-center text-sm leading-5",
            mission.status === "locked"
              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              : "border border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
          )}
        >
          <Link href={mission.actionHref} className="w-full min-w-0">
            {mission.actionLabel}
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
    return null;
  }

  if (!engagement) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.22),_transparent_28%),linear-gradient(135deg,#0f172a_0%,#111827_48%,#052e2b_100%)] text-white shadow-[0_30px_100px_-45px_rgba(15,23,42,1)]">
      <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-amber-300/10 blur-3xl" />
      <CardContent className="relative p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-white/10 text-white hover:bg-white/10">
                Daily habit loop
              </Badge>
              <Badge className="border-0 bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/20">
                {engagement.completedCount}/{engagement.totalCount} missions wrapped
              </Badge>
            </div>

            <div className="mt-4 max-w-2xl">
              <p className="!m-0 !text-2xl !font-semibold !leading-tight !tracking-tight !text-white md:!text-3xl">
                {engagement.headline}
              </p>
              <p className="mt-2 !text-sm !leading-6 !text-slate-200 md:!text-base">
                {engagement.subtitle}
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:max-w-2xl">
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">
                  Weekly Points
                </p>
                <p className="mt-1 text-2xl font-semibold text-amber-300">
                  +{formatCoins(engagement.weeklyPoints)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">
                  Total Points
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {formatCoins(engagement.totalPoints)}
                </p>
              </div>
              <p className="sm:col-span-2 text-sm text-emerald-200">
                Points are tracked separately from your wallet coins.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {engagement.missions.map((mission) => (
                <MissionCard key={mission.id} mission={mission} />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Fresh points activity</p>
                <p className="mt-1 text-sm text-slate-300">
                  Short-cycle point rewards that landed recently.
                </p>
              </div>
              <div className="rounded-full bg-white/10 p-2">
                <Sparkles className="h-4 w-4 text-amber-300" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {engagement.recentRewards.length > 0 ? (
                engagement.recentRewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="rounded-2xl border border-white/10 bg-black/10 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{reward.title}</p>
                        <p className="mt-1 text-sm text-slate-300">
                          {reward.description || "Bonus points awarded"}
                        </p>
                      </div>
                      <div className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-200">
                        +{formatCoins(reward.pointsAmount)} pts
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                      {new Date(reward.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-black/10 p-5 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                    <Lock className="h-4 w-4 text-slate-300" />
                  </div>
                  <p className="font-medium text-white">No points activity yet</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Complete one mission and this panel will start lighting up.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              Points land automatically. No manual claiming flow needed.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
