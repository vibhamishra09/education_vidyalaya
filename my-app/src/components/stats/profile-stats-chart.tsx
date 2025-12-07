"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Award, TrendingUp, Users } from "lucide-react";

// Dynamic import for recharts to avoid SSR issues
const PieChart = dynamic(
  () => import("recharts").then((mod) => mod.PieChart),
  { ssr: false }
);
const Pie = dynamic(
  () => import("recharts").then((mod) => mod.Pie),
  { ssr: false }
);
const BarChart = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
  { ssr: false }
);
const Bar = dynamic(
  () => import("recharts").then((mod) => mod.Bar),
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
const Tooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip),
  { ssr: false }
);
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);
const Cell = dynamic(
  () => import("recharts").then((mod) => mod.Cell),
  { ssr: false }
);

interface Review {
  id: string;
  rating: number;
  review: string;
  reviewer: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface ProfileStatsChartProps {
  reviews: Review[];
  avgRating: number;
  sessionsTaught?: number;
  sessionsAttended?: number;
  className?: string;
}

const RATING_COLORS = {
  5: "#10b981", // emerald
  4: "#22c55e", // green
  3: "#f59e0b", // amber
  2: "#f97316", // orange
  1: "#ef4444", // red
};

const RATING_LABELS = {
  5: "Excellent",
  4: "Great",
  3: "Good",
  2: "Fair",
  1: "Poor",
};

export function ProfileStatsChart({
  reviews,
  avgRating,
  sessionsTaught = 0,
  sessionsAttended = 0,
  className,
}: ProfileStatsChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate rating distribution
  const ratingDistribution = useMemo(() => {
    const distribution = [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: reviews.filter((r) => r.rating === rating).length,
      percentage: reviews.length > 0 
        ? Math.round((reviews.filter((r) => r.rating === rating).length / reviews.length) * 100)
        : 0,
      color: RATING_COLORS[rating as keyof typeof RATING_COLORS],
      label: RATING_LABELS[rating as keyof typeof RATING_LABELS],
    }));
    return distribution;
  }, [reviews]);

  // Data for pie chart (only non-zero ratings)
  const pieData = ratingDistribution.filter((d) => d.count > 0);

  // Session distribution for bar chart
  const sessionData = [
    { name: "Taught", value: sessionsTaught, color: "#8b5cf6" },
    { name: "Attended", value: sessionsAttended, color: "#10b981" },
  ];

  const totalSessions = sessionsTaught + sessionsAttended;

  const CustomPieTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: typeof ratingDistribution[0] }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-xl">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-medium">{data.rating} Stars</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {data.count} reviews ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Get rating description based on average
  const getRatingDescription = (rating: number) => {
    if (rating >= 4.5) return { text: "Outstanding", color: "text-emerald-600" };
    if (rating >= 4) return { text: "Excellent", color: "text-green-600" };
    if (rating >= 3.5) return { text: "Very Good", color: "text-lime-600" };
    if (rating >= 3) return { text: "Good", color: "text-amber-600" };
    if (rating >= 2) return { text: "Fair", color: "text-orange-600" };
    return { text: "Needs Improvement", color: "text-red-600" };
  };

  const ratingDesc = getRatingDescription(avgRating);

  if (!mounted) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-[150px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Review Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Star className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No reviews yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Complete sessions to receive reviews
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-500" />
          Performance Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Main Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-lg p-3 border border-amber-500/20 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <span className="text-2xl font-bold text-amber-600">{avgRating.toFixed(1)}</span>
            </div>
            <p className={`text-xs font-medium ${ratingDesc.color}`}>{ratingDesc.text}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg p-3 border border-blue-500/20 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold text-blue-600">{reviews.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total Reviews</p>
          </div>
          <div className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 rounded-lg p-3 border border-violet-500/20 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Award className="h-5 w-5 text-violet-600" />
              <span className="text-2xl font-bold text-violet-600">{sessionsTaught}</span>
            </div>
            <p className="text-xs text-muted-foreground">Sessions Taught</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-lg p-3 border border-emerald-500/20 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-5 w-5 text-emerald-600" />
              <span className="text-2xl font-bold text-emerald-600">{sessionsAttended}</span>
            </div>
            <p className="text-xs text-muted-foreground">Sessions Attended</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rating Distribution Pie Chart */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-center">Rating Distribution</h4>
            <div className="flex items-center gap-4">
              <div style={{ width: 128, height: 128 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="count"
                      nameKey="rating"
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={50}
                      strokeWidth={2}
                      stroke="#ffffff"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {ratingDistribution.map((item) => (
                  <div key={item.rating} className="flex items-center gap-2">
                    <div className="flex items-center gap-1 w-12">
                      <span className="text-xs font-medium">{item.rating}</span>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </div>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[10px] w-12 justify-center"
                      style={{ 
                        backgroundColor: `${item.color}15`,
                        color: item.color,
                      }}
                    >
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Session Distribution Bar Chart */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-center">Session Breakdown</h4>
            <div style={{ width: "100%", height: 128 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sessionData}
                  layout="vertical"
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    width={70}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-xl">
                            <p className="font-medium">{data.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {data.value} sessions (
                              {totalSessions > 0
                                ? Math.round((data.value / totalSessions) * 100)
                                : 0}
                              %)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                    {sessionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {sessionData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                  <span className="text-xs font-medium">({item.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
