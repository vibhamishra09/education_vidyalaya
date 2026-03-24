import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Trophy, GraduationCap, Users, Medal, Flame, Lock } from 'lucide-react-native';

interface Achievement {
  id: string;
  title: string;
  description: string;
  category: "learning" | "teaching" | "social" | "milestone" | "streak";
  icon: string;
  unlockedAt?: string | null;
  progress: number;
  maxProgress: number;
  reward: number; // Coins
}

const CATEGORY_CONFIG = {
  learning: {
    label: "Learning",
    icon: GraduationCap,
    color: "text-emerald-600",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    border: "border-emerald-200 dark:border-emerald-800"
  },
  teaching: {
    label: "Teaching",
    icon: Trophy,
    color: "text-sky-600",
    bg: "bg-sky-100 dark:bg-sky-900/30",
    border: "border-sky-200 dark:border-sky-800"
  },
  social: {
    label: "Community",
    icon: Users,
    color: "text-pink-600",
    bg: "bg-pink-100 dark:bg-pink-900/30",
    border: "border-pink-200 dark:border-pink-800"
  },
  milestone: {
    label: "Milestones",
    icon: Medal,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    border: "border-amber-200 dark:border-amber-800"
  },
  streak: {
    label: "Streaks",
    icon: Flame,
    color: "text-orange-600",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    border: "border-orange-200 dark:border-orange-800"
  },
};

// Mock Achievements as per user prompt
const MOCK_ACHIEVEMENTS: Achievement[] = [
    { id: '1', title: 'Getting Started', description: 'Complete your profile setup', category: 'milestone', icon: 'Medal', progress: 1, maxProgress: 1, unlockedAt: '2024-01-01', reward: 25 },
    { id: '2', title: 'First Teach', description: 'Complete your first teaching session', category: 'teaching', icon: 'Trophy', progress: 1, maxProgress: 1, unlockedAt: '2024-01-10', reward: 15 },
    { id: '3', title: 'First Session', description: 'Attend your first learning session', category: 'learning', icon: 'GraduationCap', progress: 1, maxProgress: 1, unlockedAt: '2024-01-05', reward: 10 },
    { id: '4', title: 'First Step', description: 'Join the community', category: 'social', icon: 'Users', progress: 1, maxProgress: 1, unlockedAt: '2024-01-01', reward: 5 },
    { id: '5', title: 'Building Momentum', description: 'Maintain a 3-day streak', category: 'streak', icon: 'Flame', progress: 3, maxProgress: 3, unlockedAt: '2024-01-15', reward: 15 },
    // Locked examples
    { id: '6', title: 'Master Tutor', description: 'Teach 50 sessions', category: 'teaching', icon: 'Trophy', progress: 5, maxProgress: 50, unlockedAt: null, reward: 100 },
    { id: '7', title: 'Social Butterfly', description: 'Connect with 20 peers', category: 'social', icon: 'Users', progress: 5, maxProgress: 20, unlockedAt: null, reward: 50 },
];

const CATEGORY_TABS = [
    { id: 'all', label: 'All' },
    { id: 'learning', label: 'Learning' },
    { id: 'teaching', label: 'Teaching' },
    { id: 'social', label: 'Community' },
    { id: 'milestone', label: 'Milestones' },
    { id: 'streak', label: 'Streaks' },
];

interface AchievementShowcaseProps {
  achievements?: Achievement[]; // Optional, will use mock if not provided
}

export function AchievementShowcase({ achievements = MOCK_ACHIEVEMENTS }: AchievementShowcaseProps) {
  const [activeTab, setActiveTab] = useState('all');

  const filteredAchievements = achievements.filter(a => 
    activeTab === 'all' ? true : a.category === activeTab
  );

  return (
    <View className="my-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4 px-1">
        <View className="flex-row items-center gap-2">
            <Trophy size={20} className="text-amber-500" />
            <Text className="text-lg font-bold text-slate-900 dark:text-white">Achievements</Text>
        </View>
        <Text className="text-sm font-medium text-slate-500">
            {achievements.filter(a => a.unlockedAt).length} / {achievements.length} Unlocked
        </Text>
      </View>
      
      {/* Category Tabs */}
      <View className="mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
              {CATEGORY_TABS.map((tab) => (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id)}
                    className={`mr-2 px-4 py-2 rounded-full border ${
                        activeTab === tab.id 
                        ? 'bg-slate-900 border-slate-900 dark:bg-white dark:border-white' 
                        : 'bg-transparent border-slate-200 dark:border-slate-800'
                    }`}
                  >
                      <Text className={`text-xs font-bold ${
                          activeTab === tab.id 
                          ? 'text-white dark:text-slate-900' 
                          : 'text-slate-600 dark:text-slate-400'
                      }`}>
                          {tab.label}
                      </Text>
                  </TouchableOpacity>
              ))}
          </ScrollView>
      </View>

      {/* Achievements List */}
      <View className="space-y-3">
            {filteredAchievements.map((achievement) => {
                const config = CATEGORY_CONFIG[achievement.category] || CATEGORY_CONFIG.milestone;
                const IconComponent = config.icon;
                const isUnlocked = !!achievement.unlockedAt;
                const progressPercent = Math.min(100, Math.round((achievement.progress / achievement.maxProgress) * 100));

                return (
                    <View 
                        key={achievement.id} 
                        className={`flex-row items-center p-3 rounded-2xl border ${isUnlocked ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-80'}`}
                    >
                        <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${isUnlocked ? config.bg : 'bg-slate-200 dark:bg-slate-800'}`}>
                            {isUnlocked ? (
                                <IconComponent size={24} className={config.color} />
                            ) : (
                                <Lock size={20} className="text-slate-400" />
                            )}
                        </View>
                        
                        <View className="flex-1 mr-2">
                             <View className="flex-row justify-between items-start">
                                 <Text className={`font-bold text-base mb-0.5 ${isUnlocked ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                                     {achievement.title}
                                 </Text>
                                 {isUnlocked && (
                                     <View className="bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded text-xs border border-amber-100 dark:border-amber-800">
                                         <Text className="text-amber-600 dark:text-amber-500 text-[10px] font-bold">+{achievement.reward} Coins</Text>
                                     </View>
                                 )}
                             </View>
                             
                             <Text className="text-xs text-slate-500 dark:text-slate-400 mb-2" numberOfLines={2}>
                                 {achievement.description}
                             </Text>
                             
                             {/* Progress Bar */}
                             {!isUnlocked && (
                                 <View>
                                     <View className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                         <View className="h-full bg-slate-400 rounded-full" style={{ width: `${progressPercent}%` }} />
                                     </View>
                                     <Text className="text-[10px] text-slate-400 mt-1 text-right">{achievement.progress}/{achievement.maxProgress}</Text>
                                 </View>
                             )}
                             
                             {isUnlocked && (
                                 <Text className="text-[10px] text-emerald-600 font-medium">Unlocked on {achievement.unlockedAt}</Text>
                             )}
                        </View>
                    </View>
                );
            })}
      </View>
    </View>
  );
}
