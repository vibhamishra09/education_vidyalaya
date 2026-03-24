import React from 'react';
import { View, Text } from 'react-native';

interface StatData {
  label: string;
  value: number;
  fullMark: number;
}

interface ProfileStatsChartProps {
  stats: StatData[];
}

export function ProfileStatsChart({ stats }: ProfileStatsChartProps) {
  const maxValue = Math.max(...stats.map(s => s.value), 10); // Avoid division by zero, default max

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 my-4">
      <Text className="text-lg font-bold text-slate-800 dark:text-white mb-4">Performance Stats</Text>
      
      <View className="flex-row items-end justify-between h-32 px-2 gap-2">
        {stats.map((stat, index) => {
          const heightPercentage = Math.min((stat.value / maxValue) * 100, 100);
          
          return (
            <View key={index} className="flex-1 items-center gap-2">
               <View className="items-center justify-end w-full h-full"> 
                  <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{stat.value}</Text>
                  <View 
                    className="w-full bg-emerald-500 rounded-t-md opacity-80"
                    style={{ height: `${heightPercentage}%`, minHeight: 4 }}
                  />
               </View>
               <Text className="text-[10px] text-center text-slate-500 font-medium" numberOfLines={1}>
                  {stat.label}
               </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
