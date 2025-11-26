"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer } from "./chart-container";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMaya } from "@/lib/utils/coin-format";

interface WalletDataPoint {
  month: string;
  earned: number;
  spent: number;
  net: number;
}

interface WalletChartProps {
  data?: WalletDataPoint[];
  isLoading?: boolean;
}

interface TooltipPayload {
  payload: WalletDataPoint;
}

export function WalletChart({ data, isLoading = false }: WalletChartProps) {
  // Generate mock data if none provided
  const chartData = useMemo(() => {
    if (data) return data;

    // Generate last 6 months of mock data
    const mockData: WalletDataPoint[] = [];
    const today = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      const monthName = months[date.getMonth()];

      const earned = Math.floor(Math.random() * 500) + 100;
      const spent = Math.floor(Math.random() * 300) + 50;

      mockData.push({
        month: monthName,
        earned,
        spent,
        net: earned - spent,
      });
    }

    return mockData;
  }, [data]);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{payload[0].payload.month}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                Earned:
              </span>
              <span className="font-medium text-green-600">
                +{formatMaya(payload[0].payload.earned)} <span className="text-[10px]">m</span>AYA
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                Spent:
              </span>
              <span className="font-medium text-red-600">
                -{formatMaya(payload[0].payload.spent)} <span className="text-[10px]">m</span>AYA
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1 border-t">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                Net:
              </span>
              <span className={`font-medium ${payload[0].payload.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {payload[0].payload.net >= 0 ? '+' : ''}{formatMaya(payload[0].payload.net)} <span className="text-[10px]">m</span>AYA
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <ChartContainer title="Wallet Activity">
        <Skeleton className="h-[300px] w-full" />
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title="Wallet Activity"
      description="Your mAYA tokens earned and spent over the last 6 months"
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="month"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatMaya(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="circle"
          />
          <Bar
            dataKey="earned"
            name="Earned"
            fill="hsl(var(--chart-1))"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="spent"
            name="Spent"
            fill="hsl(var(--chart-3))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
