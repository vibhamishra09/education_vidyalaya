import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Clock, Star, CheckCircle, Calendar, MessageSquare } from 'lucide-react-native';

const SESSIONS_STATS = [
    { label: "Total Sessions", value: "45", icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-200 dark:border-blue-800" },
    { label: "Hours Completed", value: "32.5", icon: Clock, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-200 dark:border-purple-800" },
    { label: "Avg. Rating", value: "4.9", icon: Star, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-200 dark:border-amber-800" },
    { label: "Completion Rate", value: "98%", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", border: "border-emerald-200 dark:border-emerald-800" },
];

const MOCK_REQUESTS = [
    { id: '1', user: "Sarah Chen", topic: "React Native Performance", date: "Today, 4:00 PM", duration: "60 min", price: "50 Coins" },
    { id: '2', user: "Mike Ross", topic: "Redux State Management", date: "Tomorrow, 2:00 PM", duration: "45 min", price: "40 Coins" },
];

const MOCK_SESSIONS = [
    { id: '3', topic: "React Hooks Deep Dive", status: "Upcoming", date: "Jan 15, 2024", duration: "60 min", with: "Alex Johnson", role: "Tutor" },
    { id: '4', topic: "Intro to Python", status: "Completed", date: "Jan 10, 2024", duration: "45 min", with: "Emma Davis", role: "Learner" },
    { id: '5', topic: "Advanced TypeScript", status: "Completed", date: "Jan 05, 2024", duration: "90 min", with: "Chris Lee", role: "Tutor" },
];

export function SessionsTab() {
  const [activeSegment, setActiveSegment] = useState<'requests' | 'upcoming' | 'past'>('requests');

  const renderStatCard = (stat: typeof SESSIONS_STATS[0], index: number) => {
      const Icon = stat.icon;
      return (
        <View key={index} className={`flex-1 p-3 rounded-2xl border ${stat.bg} ${stat.border} items-center justify-center gap-2 min-w-[45%]`}>
            <Icon size={20} className={stat.color} />
            <Text className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</Text>
            <Text className="text-xs text-slate-500 font-medium text-center">{stat.label}</Text>
        </View>
      );
  };

  return (
    <View className="px-4 pb-20">
      {/* Stats Grid */}
      <View className="flex-row flex-wrap gap-3 mb-6">
        {SESSIONS_STATS.map(renderStatCard)}
      </View>

      {/* Requests Section */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-slate-900 dark:text-white mb-3">Session Requests</Text>
        {MOCK_REQUESTS.map((request) => (
            <View key={request.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-3 shadow-sm">
                <View className="flex-row justify-between items-start mb-2">
                    <View>
                        <Text className="font-bold text-slate-900 dark:text-white text-base">{request.topic}</Text>
                        <Text className="text-slate-500 text-sm">with {request.user}</Text>
                    </View>
                    <View className="bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <Text className="text-emerald-700 dark:text-emerald-400 font-bold text-xs">{request.price}</Text>
                    </View>
                </View>
                <View className="flex-row items-center gap-4 mt-2">
                     <View className="flex-row items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        <Text className="text-slate-600 dark:text-slate-300 text-xs">{request.date}</Text>
                     </View>
                     <View className="flex-row items-center gap-1.5">
                        <Clock size={14} className="text-slate-400" />
                        <Text className="text-slate-600 dark:text-slate-300 text-xs">{request.duration}</Text>
                     </View>
                </View>
                <View className="flex-row gap-2 mt-4">
                    <TouchableOpacity className="flex-1 bg-slate-100 dark:bg-slate-800 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                        <Text className="text-center font-semibold text-slate-700 dark:text-slate-300">Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-1 bg-slate-900 dark:bg-white py-2 rounded-xl">
                        <Text className="text-center font-semibold text-white dark:text-slate-900">Accept</Text>
                    </TouchableOpacity>
                </View>
            </View>
        ))}
      </View>

      {/* My Sessions Section */}
      <View>
          <Text className="text-lg font-bold text-slate-900 dark:text-white mb-3">My Sessions</Text>
          {MOCK_SESSIONS.map((session) => (
            <View key={session.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-3 shadow-sm flex-row items-center justify-between">
                <View className="flex-1">
                     <Text className="font-bold text-slate-900 dark:text-white text-base mb-1">{session.topic}</Text>
                     <Text className="text-slate-500 text-sm mb-2">{session.role} • with {session.with}</Text>
                     <View className="flex-row items-center gap-3">
                        <Text className="text-xs text-slate-400">{session.date}</Text>
                        <Text className="text-xs text-slate-400">•</Text>
                        <Text className="text-xs text-slate-400">{session.duration}</Text>
                     </View>
                </View>
                <View className={`px-2 py-1 rounded-full border ${
                    session.status === 'Upcoming' 
                        ? 'bg-blue-50 border-blue-100 text-blue-600' 
                        : 'bg-slate-50 border-slate-100 text-slate-500'
                }`}>
                    <Text className={`text-xs font-semibold ${
                        session.status === 'Upcoming' ? 'text-blue-600' : 'text-slate-500'
                    }`}>
                        {session.status}
                    </Text>
                </View>
            </View>
          ))}
      </View>
    </View>
  );
}
