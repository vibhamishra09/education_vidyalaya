"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dashboardApi, SessionActivityDataPoint } from "@/lib/api/dashboard.api";
import { setAuthToken } from "@/lib/api-client";
import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, BookOpen, GraduationCap, Minus } from "lucide-react";

interface SessionsChartProps {
  className?: string;
}

// Dynamic import of the chart component wrapper to avoid SSR issues
const ChartComponent = dynamic<{ data: SessionActivityDataPoint[] | undefined }>(
  () => import("./sessions-chart-component").then((mod) => mod.SessionsChartComponent),
  { 
    ssr: false,
    loading: () => <div className="h-[300px] w-full animate-pulse bg-muted rounded" />
  }
);

const TIME_RANGES = [
  { label: "7D", days: 7 },
  { label: "14D", days: 14 },
  { label: "30D", days: 30 },
] as const;

export function SessionsChart({ className }: SessionsChartProps) {
  const { getToken, isLoaded } = useAuth();
  const [selectedRange, setSelectedRange] = useState<number>(30);
  const [mounted, setMounted] = useState(false);

  // Ensure client-side only rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: activityData, isLoading } = useQuery({
    queryKey: ["session-activity", selectedRange],
    queryFn: async () => {
      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }
      return dashboardApi.getSessionActivity(selectedRange);
    },
    enabled: isLoaded,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate summary stats
  const stats = activityData?.reduce(
    (acc, day) => ({
      totalLearned: acc.totalLearned + day.learned,
      totalTaught: acc.totalTaught + day.taught,
    }),
    { totalLearned: 0, totalTaught: 0 }
  ) ?? { totalLearned: 0, totalTaught: 0 };

  const totalSessions = stats.totalLearned + stats.totalTaught;

  // Calculate trend (compare first half vs second half)
  const midPoint = Math.floor((activityData?.length ?? 0) / 2);
  const firstHalf = activityData?.slice(0, midPoint) ?? [];
  const secondHalf = activityData?.slice(midPoint) ?? [];
  
  const firstHalfTotal = firstHalf.reduce(
    (sum, d) => sum + d.learned + d.taught,
    0
  );
  const secondHalfTotal = secondHalf.reduce(
    (sum, d) => sum + d.learned + d.taught,
    0
  );
  
  const trend = firstHalfTotal === 0 
    ? secondHalfTotal > 0 ? 100 : 0
    : Math.round(((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100);

  if (isLoading || !mounted) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-violet-600 bg-clip-text text-transparent">
              Session Activity
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Your learning journey over the last {selectedRange} days
            </p>
          </div>
          <div className="flex items-center gap-2">
            {TIME_RANGES.map((range) => (
              <Button
                key={range.days}
                variant={selectedRange === range.days ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRange(range.days)}
                className={
                  selectedRange === range.days
                    ? "bg-gradient-to-r from-emerald-600 to-violet-600 border-0 text-white"
                    : ""
                }
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-lg p-3 border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground">Learned</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.totalLearned}</p>
          </div>
          <div className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 rounded-lg p-3 border border-violet-500/20">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-violet-600" />
              <span className="text-xs text-muted-foreground">Taught</span>
            </div>
            <p className="text-2xl font-bold text-violet-600 mt-1">{stats.totalTaught}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-500/10 to-slate-500/5 rounded-lg p-3 border border-slate-500/20">
            <div className="flex items-center gap-2">
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              ) : trend < 0 ? (
                <TrendingDown className="h-4 w-4 text-rose-600" />
              ) : (
                <Minus className="h-4 w-4 text-slate-600" />
              )}
              <span className="text-xs text-muted-foreground">Trend</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <p className="text-2xl font-bold">{totalSessions}</p>
              <Badge
                variant="secondary"
                className={`text-xs ${
                  trend > 0
                    ? "bg-emerald-500/10 text-emerald-600"
                    : trend < 0
                    ? "bg-rose-500/10 text-rose-600"
                    : "bg-slate-500/10 text-slate-600"
                }`}
              >
                {trend > 0 ? "+" : ""}{trend}%
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div style={{ width: "100%", height: 280 }}>
          {mounted && <ChartComponent data={activityData} />}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-sm text-muted-foreground">Sessions Learned</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-violet-500" />
            <span className="text-sm text-muted-foreground">Sessions Taught</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
