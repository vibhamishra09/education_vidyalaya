"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { dashboardApi, WalletActivityDataPoint } from "@/lib/api/dashboard.api";
import { setAuthToken } from "@/lib/api-client";
import { formatCoins } from "@/lib/utils/coin-format";
import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

// Dynamic import for recharts to avoid SSR issues
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
const Cell = dynamic(
  () => import("recharts").then((mod) => mod.Cell),
  { ssr: false }
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReferenceLine = dynamic<any>(
  () => import("recharts").then((mod) => mod.ReferenceLine),
  { ssr: false }
);

interface WalletChartProps {
  className?: string;
}

interface TooltipPayload {
  payload: WalletActivityDataPoint;
}

export function WalletChart({ className }: WalletChartProps) {
  const { getToken, isLoaded } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: walletData, isLoading } = useQuery({
    queryKey: ["wallet-activity"],
    queryFn: async () => {
      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }
      return dashboardApi.getWalletActivity(6);
    },
    enabled: isLoaded,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate summary stats
  const stats = walletData?.reduce(
    (acc, month) => ({
      totalEarned: acc.totalEarned + month.earned,
      totalSpent: acc.totalSpent + month.spent,
      totalNet: acc.totalNet + month.net,
    }),
    { totalEarned: 0, totalSpent: 0, totalNet: 0 }
  ) ?? { totalEarned: 0, totalSpent: 0, totalNet: 0 };

  // Calculate trend (compare last 3 months vs first 3 months)
  const firstHalf = walletData?.slice(0, 3) ?? [];
  const secondHalf = walletData?.slice(3) ?? [];
  
  const firstHalfNet = firstHalf.reduce((sum, m) => sum + m.net, 0);
  const secondHalfNet = secondHalf.reduce((sum, m) => sum + m.net, 0);
  
  const trend = firstHalfNet === 0 
    ? secondHalfNet > 0 ? 100 : secondHalfNet < 0 ? -100 : 0
    : Math.round(((secondHalfNet - firstHalfNet) / Math.abs(firstHalfNet)) * 100);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-xl min-w-[180px]">
          <p className="font-semibold text-sm mb-3 text-foreground">{data.month}</p>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                Earned
              </span>
              <span className="font-semibold text-emerald-600">
                +{formatCoins(data.earned)} WEBYA
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" />
                Spent
              </span>
              <span className="font-semibold text-rose-600">
                -{formatCoins(data.spent)} WEBYA
              </span>
            </div>
            <div className="border-t border-border/50 pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Net</span>
                <span className={`font-bold ${data.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {data.net >= 0 ? "+" : ""}{formatCoins(data.net)} WEBYA
                </span>
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
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-amber-500 to-emerald-500 bg-clip-text text-transparent flex items-center gap-2">
              <Wallet className="h-5 w-5 text-amber-500" />
              Wallet Activity
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Your WEBYA flow over the last 6 months
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-lg p-3 border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground">Total Earned</span>
            </div>
            <p className="text-xl font-bold text-emerald-600 mt-1">
              +{formatCoins(stats.totalEarned)} WEBYA
            </p>
          </div>
          <div className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 rounded-lg p-3 border border-rose-500/20">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-rose-600" />
              <span className="text-xs text-muted-foreground">Total Spent</span>
            </div>
            <p className="text-xl font-bold text-rose-600 mt-1">
              -{formatCoins(stats.totalSpent)} WEBYA
            </p>
          </div>
          <div className={`bg-gradient-to-br ${stats.totalNet >= 0 ? "from-blue-500/10 to-blue-500/5 border-blue-500/20" : "from-orange-500/10 to-orange-500/5 border-orange-500/20"} rounded-lg p-3 border`}>
            <div className="flex items-center gap-2">
              <Wallet className={`h-4 w-4 ${stats.totalNet >= 0 ? "text-blue-600" : "text-orange-600"}`} />
              <span className="text-xs text-muted-foreground">Net Balance</span>
            </div>
            <p className={`text-xl font-bold mt-1 ${stats.totalNet >= 0 ? "text-blue-600" : "text-orange-600"}`}>
              {stats.totalNet >= 0 ? "+" : ""}{formatCoins(stats.totalNet)} WEBYA
            </p>
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
              <Badge
                variant="secondary"
                className={`text-sm font-bold ${
                  trend > 0
                    ? "bg-emerald-500/10 text-emerald-600"
                    : trend < 0
                    ? "bg-rose-500/10 text-rose-600"
                    : "bg-slate-500/10 text-slate-600"
                }`}
              >
                {trend > 0 ? "+" : ""}{trend}%
              </Badge>
              <span className="text-xs text-muted-foreground">vs prior</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={walletData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              barGap={4}
            >
              <defs>
                <linearGradient id="earnedBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="spentBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                  <stop offset="100%" stopColor="#e11d48" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7280" }}
                tickMargin={8}
              />
              <YAxis
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7280" }}
                tickFormatter={(value) => formatCoins(value)}
                tickMargin={8}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#e5e7eb" />
              <Bar
                dataKey="earned"
                name="Earned"
                fill="url(#earnedBarGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="spent"
                name="Spent"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              >
                {walletData?.map((_, index) => (
                  <Cell key={`cell-${index}`} fill="url(#spentBarGradient)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-6 mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-gradient-to-b from-emerald-500 to-emerald-600" />
            <span className="text-sm text-muted-foreground">Earned</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-gradient-to-b from-rose-500 to-rose-600" />
            <span className="text-sm text-muted-foreground">Spent</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
