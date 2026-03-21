import React, { useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Edit, Star, Users, Coins, MapPin, Globe, GraduationCap, Github, Linkedin, Twitter, Calendar, Clock, DollarSign, Settings, Menu } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { clsx } from 'clsx';
import { useSidebar } from '../lib/SidebarContext';
import { EditProfileModal } from '../components/profile/edit-profile-modal';
import { AvailabilitySettings } from '../components/profile/availability-settings';
import { AchievementShowcase } from '../components/profile/achievement-showcase';
import { ProfileStatsChart } from '../components/profile/profile-stats-chart';
import { SessionsTab } from '../components/profile/sessions-tab';
import { WalletTab } from '../components/profile/wallet-tab';
import { ReviewsTab } from '../components/profile/reviews-tab';

// Mock Data
const INITIAL_USER = {
  id: "user-123",
  name: "Arghadeep",
  username: "arghadeep",
  email: "arghadeep@example.com",
  avatar: "https://github.com/shadcn.png",
  bio: "Passionate about coding and teaching. Love to explore new technologies and share knowledge.",
  role: "Student",
  coins: 1500,
  hourlyRate: 50,
  languagePreference: "English",
  location: "New York, USA",
  school: "MIT",
  socialLinks: [
    { platform: "twitter", url: "https://twitter.com/arghadeep" },
    { platform: "linkedin", url: "https://linkedin.com/in/arghadeep" },
    { platform: "github", url: "https://github.com/arghadeep" }
  ],
  publicStats: {
    avgRating: 4.8,
    reviewCount: 12,
    sessionsTaught: 5,
    sessionsAttendedAsLearner: 10
  },
  hasSkills: ["React", "JavaScript", "TypeScript", "Node.js", "Python"],
  wantSkills: ["Machine Learning", "System Design", "Rust", "Go"],
  reviews: [
    { id: '1', reviewer: "Alice Wang", rating: 5, comment: "Great session! Explained the concepts very clearly.", date: "2024-01-01", avatar: "https://i.pravatar.cc/150?u=alice" },
    { id: '2', reviewer: "Bob Smith", rating: 4, comment: "Very helpful and patient.", date: "2024-01-05", avatar: "https://i.pravatar.cc/150?u=bob" },
    { id: '3', reviewer: "Charlie Brown", rating: 5, comment: "Awesome tutor!", date: "2024-01-10", avatar: "https://i.pravatar.cc/150?u=charlie" }
  ],
  sessions: [
     { id: '1', topic: "React Hooks Deep Dive", status: "Completed", date: "Jan 15, 2024", duration: "60 min", role: "Tutor", coins: "+50" },
     { id: '2', topic: "Intro to Python", status: "Upcoming", date: "Feb 20, 2024", duration: "45 min", role: "Learner", coins: "-40" },
     { id: '3', topic: "Advanced TypeScript", status: "Completed", date: "Jan 10, 2024", duration: "90 min", role: "Learner", coins: "-80" }
  ],
  walletTransactions: [
    { id: '1', type: 'Credit', amount: 50, description: 'Session Earnings', date: 'Jan 15, 2024' },
    { id: '2', type: 'Debit', amount: 40, description: 'Session Payment', date: 'Jan 20, 2024' },
    { id: '3', type: 'Credit', amount: 100, description: 'Welcome Bonus', date: 'Jan 01, 2024' }
  ],
  achievements: [
    { id: '1', title: 'First Steps', description: 'Complete your profile', category: 'milestone', icon: 'Medal', progress: 1, maxProgress: 1, unlockedAt: '2024-01-01' },
    { id: '2', title: 'Scholar', description: 'Attend 10 sessions', category: 'learning', icon: 'GraduationCap', progress: 10, maxProgress: 10, unlockedAt: '2024-01-15' },
    { id: '3', title: 'Mentor', description: 'Teach 5 sessions', category: 'teaching', icon: 'Trophy', progress: 5, maxProgress: 10, unlockedAt: null },
    { id: '4', title: 'Social Butterfly', description: 'Connect with 5 peers', category: 'social', icon: 'Users', progress: 3, maxProgress: 5, unlockedAt: null },
    { id: '5', title: 'On Fire', description: '7 day streak', category: 'streak', icon: 'Flame', progress: 4, maxProgress: 7, unlockedAt: null },
  ]
};

const STATS_DATA = [
    { label: "Teaching", value: 35, fullMark: 100 },
    { label: "Learning", value: 80, fullMark: 100 },
    { label: "Comm.", value: 65, fullMark: 100 },
    { label: "Reliability", value: 95, fullMark: 100 },
    { label: "Activity", value: 50, fullMark: 100 },
];

type TabKey = 'about' | 'sessions' | 'wallet' | 'reviews';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'about', label: 'About' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'wallet', label: 'Wallet' },
  { key: 'reviews', label: 'Reviews' },
];

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('about');
  const [user, setUser] = useState(INITIAL_USER);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const { openSidebar } = useSidebar();
  const router = useRouter();

  const totalSessions = user.publicStats.sessionsTaught + user.publicStats.sessionsAttendedAsLearner;

  const handleUpdateUser = (updatedUser: any) => {
    setUser(prev => ({ ...prev, ...updatedUser }));
  };

  const renderHeader = () => (
      <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mx-4 mt-2 mb-6">
        <View className="flex-row items-start gap-4">
          <View className="relative">
             <View className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900 rounded-full scale-110 opacity-50" />
             <Image 
                source={{ uri: user.avatar }} 
                className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-800"
             />
          </View>
          
          <View className="flex-1">
            <View className="flex-row justify-between items-start">
              <View className="flex-1 mr-2">
                 <Text className="text-2xl font-bold text-slate-900 dark:text-white" numberOfLines={1}>{user.name}</Text>
                 <View className="flex-row items-center gap-2 mt-1">
                    <Text className="text-slate-500 dark:text-slate-400 font-medium">@{user.username}</Text>
                 </View>
              </View>
              
              <View className="bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
                <Text className="text-emerald-700 dark:text-emerald-400 font-semibold text-xs">{user.role}</Text>
              </View>
            </View>
          </View>
        </View>

         {/* Stats Row */}
         <View className="flex-row flex-wrap gap-3 mt-6">
            <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
               <Star size={14} color="#f59e0b" fill="#f59e0b" />
               <Text className="text-amber-900 dark:text-amber-400 font-bold">{user.publicStats.avgRating}</Text>
               <Text className="text-amber-700/60 dark:text-amber-500/60 text-xs">({user.publicStats.reviewCount})</Text>
            </View>

            <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
               <Users size={14} className="text-slate-500 dark:text-slate-400" />
               <Text className="text-slate-700 dark:text-slate-300 font-bold">{totalSessions}</Text>
               <Text className="text-slate-500 dark:text-slate-400 text-xs">sessions</Text>
            </View>

            <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
               <Coins size={14} color="#059669" />
               <Text className="text-emerald-700 dark:text-emerald-400 font-bold">{user.coins.toLocaleString()}</Text>
               <Text className="text-emerald-600/60 dark:text-emerald-500/60 text-xs">Coins</Text>
            </View>

            <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800">
               <Clock size={14} className="text-violet-600" />
               <Text className="text-violet-700 dark:text-violet-400 font-bold">{user.hourlyRate}</Text>
               <Text className="text-violet-600/60 dark:text-violet-500/60 text-xs">Coins/hr</Text>
            </View>
         </View>

         {/* Bio */}
         <Text className="mt-6 text-slate-600 dark:text-slate-300 leading-6 border-l-2 border-emerald-100 dark:border-emerald-800 pl-3">
            {user.bio}
         </Text>

         {/* Details */}
         <View className="flex-row flex-wrap gap-4 mt-5">
            {user.languagePreference && (
               <View className="flex-row items-center gap-1.5">
                  <Globe size={14} className="text-slate-500 dark:text-slate-400" />
                  <Text className="text-slate-600 dark:text-slate-300 text-sm">{user.languagePreference}</Text>
               </View>
            )}
            {user.location && (
               <View className="flex-row items-center gap-1.5">
                  <MapPin size={14} className="text-slate-500 dark:text-slate-400" />
                  <Text className="text-slate-600 dark:text-slate-300 text-sm">{user.location}</Text>
               </View>
            )}
            {user.school && (
               <View className="flex-row items-center gap-1.5">
                  <GraduationCap size={14} className="text-slate-500 dark:text-slate-400" />
                  <Text className="text-slate-600 dark:text-slate-300 text-sm">{user.school}</Text>
               </View>
            )}
         </View>

         {/* Edit Button */}
         <TouchableOpacity 
            className="mt-6 bg-slate-900 dark:bg-white py-3 rounded-xl flex-row items-center justify-center gap-2 active:bg-slate-800 dark:active:bg-slate-200"
            onPress={() => setIsEditModalVisible(true)}
         >
            <Edit size={16} className="text-white dark:text-slate-900" />
            <Text className="text-white dark:text-slate-900 font-semibold">Edit Profile</Text>
         </TouchableOpacity>
      </View>
  );

  const renderTabs = () => (
    <View className="px-4 mb-4">
       <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 pb-2">
          {TABS.map((tab) => (
             <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={clsx(
                   "px-5 py-2.5 rounded-full border transition-all",
                   activeTab === tab.key 
                      ? "bg-emerald-600 border-emerald-600" 
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                )}
             >
                <Text 
                   className={clsx(
                      "font-semibold",
                      activeTab === tab.key ? "text-white" : "text-slate-600 dark:text-slate-400"
                   )}
                >
                   {tab.label}
                </Text>
             </TouchableOpacity>
          ))}
       </ScrollView>
    </View>
  );

  const renderAboutTab = () => (
    <View className="px-4 gap-4 pb-20">
       {/* Skills */}
       <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <View className="flex-row justify-between items-center mb-4">
             <Text className="text-lg font-bold text-slate-800 dark:text-white">I can teach</Text>
             <TouchableOpacity onPress={() => setIsEditModalVisible(true)}>
                <Edit size={16} className="text-slate-400" />
             </TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap gap-2">
             {user.hasSkills.map((skill, index) => (
                <View key={index} className="bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800 mb-2">
                   <Text className="text-emerald-700 dark:text-emerald-400 font-medium text-sm">{skill}</Text>
                </View>
             ))}
             {user.hasSkills.length === 0 && (
                <Text className="text-slate-400 italic">No skills listed yet.</Text>
             )}
          </View>
       </View>

       {/* Interests */}
       <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <View className="flex-row justify-between items-center mb-4">
             <Text className="text-lg font-bold text-slate-800 dark:text-white">I want to learn</Text>
             <TouchableOpacity onPress={() => setIsEditModalVisible(true)}>
                <Edit size={16} className="text-slate-400" />
             </TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap gap-2">
             {user.wantSkills.map((interest, index) => (
                <View key={index} className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800">
                   <Text className="text-blue-700 dark:text-blue-400 font-medium text-sm">{interest}</Text>
                </View>
             ))}
             {user.wantSkills.length === 0 && (
                <Text className="text-slate-400 italic">No interests listed yet.</Text>
             )}
          </View>
       </View>

       <AvailabilitySettings />
       <AchievementShowcase achievements={user.achievements} />
    </View>
  );

  const renderSessionsTab = () => (
    <SessionsTab />
  );

  const renderWalletTab = () => (
    <WalletTab />
  );

  const renderReviewsTab = () => (
    <ReviewsTab />
  );

  return (
    <View className="flex-1 bg-white">
       <Stack.Screen 
        options={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' }
        }} 
      />
      {/* GLOBAL LIGHT GRADIENT BACKGROUND */}
      <LinearGradient
        colors={['#c9fbd7', '#e2fdf0', '#f5fff8']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />
      
      <SafeAreaView className="flex-1">
         <View className="flex-row items-center justify-between px-4 py-3">
            <TouchableOpacity onPress={openSidebar} className="p-2 -ml-2">
                <Menu size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-slate-900">Profile</Text>
            <TouchableOpacity onPress={() => setIsEditModalVisible(true)} className="p-2">
                <Settings size={24} color="#0f172a" />
            </TouchableOpacity>
         </View>
         <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            {renderHeader()}
            {renderTabs()}
            {activeTab === 'about' && renderAboutTab()}
            {activeTab === 'sessions' && renderSessionsTab()}
            {activeTab === 'wallet' && renderWalletTab()}
            {activeTab === 'reviews' && renderReviewsTab()}
         </ScrollView>
      </SafeAreaView>

      <EditProfileModal 
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        user={user}
        onSave={handleUpdateUser}
      />
    </View>
  );
}
