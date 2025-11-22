"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer } from "./chart-container";
import { Skeleton } from "@/components/ui/skeleton";

interface SessionDataPoint {
  date: string;
  learned: number;
  taught: number;
}

interface SessionsChartProps {
  data?: SessionDataPoint[];
  isLoading?: boolean;
  chartType?: "line" | "area";
}

export function SessionsChart({ data, isLoading = false, chartType = "area" }: SessionsChartProps) {
  // Generate mock data if none provided
  const chartData = useMemo(() => {
    if (data) return data;

    // Generate last 30 days of mock data
    const mockData: SessionDataPoint[] = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      mockData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        learned: Math.floor(Math.random() * 5),
        taught: Math.floor(Math.random() * 3),
      });
    }

    return mockData;
  }, [data]);

  if (isLoading) {
    return (
      <ChartContainer title="Session Activity">
        <Skeleton className="h-[300px] w-full" />
      </ChartContainer>
    );
  }

  const Chart = chartType === "line" ? LineChart : AreaChart;

  return (
    <ChartContainer
      title="Session Activity"
      description="Your learning and teaching sessions over the last 30 days"
    >
      <ResponsiveContainer width="100%" height={300}>
        <Chart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            fontSize={12}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="circle"
          />
          {chartType === "line" ? (
            <>
              <Line
                type="monotone"
                dataKey="learned"
                name="Sessions Learned"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="taught"
                name="Sessions Taught"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </>
          ) : (
            <>
              <Area
                type="monotone"
                dataKey="learned"
                name="Sessions Learned"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="taught"
                name="Sessions Taught"
                stroke="hsl(var(--chart-2))"
                fill="hsl(var(--chart-2))"
                fillOpacity={0.6}
              />
            </>
          )}
        </Chart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
