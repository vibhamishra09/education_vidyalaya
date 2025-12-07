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
import { TrendingUp, TrendingDown, BookOpen, GraduationCap, Users, Minus } from "lucide-react";

// Dynamic import for recharts to avoid SSR issues
const AreaChart = dynamic(
  () => import("recharts").then((mod) => mod.AreaChart),
  { ssr: false }
);
const Area = dynamic(
  () => import("recharts").then((mod) => mod.Area),
  { ssr: false }
);
const XAxis = dynamic(
  () => import("recharts").then((mod) => mod.XAxis),
  { ssr: false }
);
const YAxis = dynamic(
  () => import("recharts").then((mod) => mod.YAxis),
  { ssr: false }
);
const CartesianGrid = dynamic(
  () => import("recharts").then((mod) => mod.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip),
  { ssr: false }
);
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);

interface SessionsChartProps {
  className?: string;
}

interface TooltipPayload {
  payload: SessionActivityDataPoint;
  dataKey: string;
  value: number;
  color: string;
  name: string;
}

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
      totalStudyRooms: acc.totalStudyRooms + day.studyRooms,
    }),
    { totalLearned: 0, totalTaught: 0, totalStudyRooms: 0 }
  ) ?? { totalLearned: 0, totalTaught: 0, totalStudyRooms: 0 };

  const totalSessions = stats.totalLearned + stats.totalTaught + stats.totalStudyRooms;

  // Calculate trend (compare first half vs second half)
  const midPoint = Math.floor((activityData?.length ?? 0) / 2);
  const firstHalf = activityData?.slice(0, midPoint) ?? [];
  const secondHalf = activityData?.slice(midPoint) ?? [];
  
  const firstHalfTotal = firstHalf.reduce(
    (sum, d) => sum + d.learned + d.taught + d.studyRooms,
    0
  );
  const secondHalfTotal = secondHalf.reduce(
    (sum, d) => sum + d.learned + d.taught + d.studyRooms,
    0
  );
  
  const trend = firstHalfTotal === 0 
    ? secondHalfTotal > 0 ? 100 : 0
    : Math.round(((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: TooltipPayload[];
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = data.learned + data.taught + data.studyRooms;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-xl">
          <p className="font-semibold text-sm mb-3 text-foreground">{data.date}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                Learned
              </span>
              <span className="font-semibold text-emerald-600">{data.learned}</span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                <GraduationCap className="h-3.5 w-3.5 text-violet-600" />
                Taught
              </span>
              <span className="font-semibold text-violet-600">{data.taught}</span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <Users className="h-3.5 w-3.5 text-amber-600" />
                Study Rooms
              </span>
              <span className="font-semibold text-amber-600">{data.studyRooms}</span>
            </div>
            <div className="border-t border-border/50 pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-bold">{total}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
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
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-lg p-3 border border-amber-500/20">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Study Rooms</span>
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.totalStudyRooms}</p>
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
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={activityData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="learnedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="taughtGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="studyRoomsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7280" }}
                interval="preserveStartEnd"
                tickMargin={8}
              />
              <YAxis
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7280" }}
                allowDecimals={false}
                tickMargin={8}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="learned"
                name="Sessions Learned"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#learnedGradient)"
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="taught"
                name="Sessions Taught"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fill="url(#taughtGradient)"
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="studyRooms"
                name="Study Rooms"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fill="url(#studyRoomsGradient)"
                stackId="1"
              />
            </AreaChart>
          </ResponsiveContainer>
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
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-sm text-muted-foreground">Study Rooms</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
