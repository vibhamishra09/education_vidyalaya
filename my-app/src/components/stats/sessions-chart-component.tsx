"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { SessionActivityDataPoint } from "@/lib/api/dashboard.api";
import { BookOpen, GraduationCap } from "lucide-react";

interface TooltipPayload {
  payload: SessionActivityDataPoint;
  dataKey: string;
  value: number;
  color: string;
  name: string;
}

interface SessionsChartComponentProps {
  data: SessionActivityDataPoint[] | undefined;
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = data.learned + data.taught;
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

export function SessionsChartComponent({ data }: SessionsChartComponentProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
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
      </AreaChart>
    </ResponsiveContainer>
  );
}
