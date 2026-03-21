import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, ArrowRight, CheckCircle, Menu } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../lib/utils';
import { useSidebar } from '../lib/SidebarContext';

type FeatureTab = "study-rooms" | "peer-sessions" | "webya-coins" | "streaks";

const FEATURES = {
  "study-rooms": {
    label: "Study Rooms",
    title: "Collaborate in real-time with focused peers.",
    description: "Create or join study rooms to work together on shared goals. Whether you're preparing for an exam or learning a new language, find your focused space.",
    points: [
      "Create rooms instantly: Set your topic, duration, and participant limit.",
      "Join active sessions: Browse live rooms and jump in to start learning.",
      "Interactive tools: Use built-in chat, whiteboard, and screen sharing.",
      "Stay accountable: timers and goal tracking keep everyone on task."
    ],
    cta: "Browse Rooms",
    image: "https://placehold.co/800x500/e0f2fe/0369a1?text=Study+Rooms+Demo",
  },
  "peer-sessions": {
    label: "Peer Sessions",
    title: "One-on-one learning that fits your schedule.",
    description: "Connect with peers for direct knowledge exchange. Request help on specific topics or offer your expertise to others.",
    points: [
      "Request specific help: Post a request for the topic you're stuck on.",
      "Find experts: Browse profiles to find peers with the skills you need.",
      "Schedule flexibly: Coordinate times that work for both of you.",
      "Earn reputation: Get rated and reviewed for your helpful sessions."
    ],
    cta: "Find Peers",
    image: "https://placehold.co/800x500/f0fdf4/15803d?text=Peer+Sessions+Demo",
  },
  "webya-coins": {
    label: "Coins",
    title: "Earn rewards for your learning journey.",
    description: "Our virtual currency system rewards you for being an active and helpful member of the community. Invest in your learning growth.",
    points: [
      "Earn by helping: Get Coins for hosting study rooms or teaching peers.",
      "Daily rewards: Login bonuses and streak milestones boost your wallet.",
      "Spend wisely: Use Coins to highlight your requests or join premium rooms.",
      "Transparent wallet: Track every earning and spending transaction easily."
    ],
    cta: "Check Wallet",
    image: "https://placehold.co/800x500/fff7ed/ea580c?text=Webya+Demo",
  },
  "streaks": {
    label: "Streaks & Growth",
    title: "Build consistent habits that last.",
    description: "Consistency is key to mastery. We help you track your progress and maintain your momentum day after day.",
    points: [
      "Daily check-ins: Mark your attendance and keep your streak alive.",
      "Freeze streaks: Use items to save your streak if you miss a day.",
      "Visual progress: See your activity graph light up as you commit.",
      "Unlock achievements: Badge rewards for long-term consistency."
    ],
    cta: "View Progress",
    image: "https://placehold.co/800x500/faf5ff/7e22ce?text=Streaks+%26+Growth+Demo",
  }
};

export default function HowItWorksScreen() {
  const { openSidebar } = useSidebar();
  const [activeTab, setActiveTab] = useState<FeatureTab>("study-rooms");
  const feature = FEATURES[activeTab];

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      {/* GLOBAL LIGHT GRADIENT BACKGROUND */}
      <LinearGradient
        colors={['#c9fbd7', '#e2fdf0', '#f5fff8']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']} style={{ backgroundColor: 'transparent' }}>

      {/* Header */}
        <View className="px-4 py-3 flex-row justify-between items-center bg-transparent">
            <View className="flex-row items-center gap-3">
                 <TouchableOpacity onPress={openSidebar}>
                    <Menu size={24} color="#0f172a" />
                 </TouchableOpacity>
            </View>
            <Text className="text-xl font-bold text-slate-900 absolute left-0 right-0 text-center pointer-events-none">How It Works</Text>
            <View className="flex-row items-center gap-3">
                <Image source={{ uri: "https://github.com/shadcn.png" }} className="h-8 w-8 rounded-full" />
            </View>
        </View>

      <ScrollView className="flex-1">
        
        {/* --- Hero Section --- */}
        <View className="px-6 py-10 items-center border-b border-slate-100">
          <View className="flex-row items-center bg-blue-50 px-3 py-1 rounded-full mb-6">
            <Sparkles size={14} color="#1d4ed8" />
            <Text className="text-blue-700 text-xs font-medium ml-2">Simple. Collaborative. Rewarding.</Text>
          </View>

          <Text className="text-3xl font-bold text-center text-slate-900 mb-2">
            A trusted peer-to-peer
          </Text>
          <Text className="text-3xl font-bold text-center text-slate-900 mb-4">
            learning experience
          </Text>
          
          <Text className="text-2xl font-bold text-center text-emerald-500 mb-6">
            Teach, Learn, Grow — with peers.
          </Text>

          <Text className="text-base text-center text-slate-500 max-w-xs leading-relaxed">
            At Webyalaya, knowledge flows both ways — you're a learner and a teacher
          </Text>
        </View>

        {/* --- Tabs --- */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16 }}
          className="border-b border-border"
        >
          {(Object.keys(FEATURES) as FeatureTab[]).map((key) => (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveTab(key)}
              className={cn(
                "px-5 py-2 rounded-full mr-2 border",
                activeTab === key
                  ? "bg-sky-100 border-sky-200"
                  : "bg-background border-transparent"
              )}
            >
              <Text className={cn(
                "text-sm font-medium",
                activeTab === key ? "text-sky-700" : "text-muted-foreground"
              )}>
                {FEATURES[key].label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* --- Feature Content --- */}
        <View className="px-6 py-8">
          <Text className="text-2xl font-bold text-foreground mb-3">{feature.title}</Text>
          <Text className="text-base text-muted-foreground mb-6 leading-6">{feature.description}</Text>

          {/* Points */}
          <View className="space-y-4 mb-8">
            {feature.points.map((point, i) => (
              <View key={i} className="flex-row items-start">
                <CheckCircle size={18} color="#00DC6E" style={{ marginTop: 2, marginRight: 8 }} />
                <Text className="text-sm text-foreground flex-1 leading-5">
                   {point}
                </Text>
              </View>
            ))}
          </View>

          {/* Feature Image */}
          {/* <View className="w-full aspect-video bg-muted rounded-xl mb-8 overflow-hidden">
             <Image 
                source={{ uri: feature.image }} 
                className="w-full h-full"
                resizeMode="cover"
             />
          </View> */}

          {/* CTA Button */}
          <TouchableOpacity className="w-full bg-primary py-4 rounded-xl flex-row justify-center items-center">
             <Text className="text-white font-bold text-base mr-2">{feature.cta}</Text>
             <ArrowRight size={18} color="white" />
          </TouchableOpacity>
        </View>

      </ScrollView>
      
      </SafeAreaView>
    </View>
  );
}
