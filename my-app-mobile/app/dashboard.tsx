import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Platform, Dimensions, SafeAreaView, StatusBar, Modal } from "react-native";
import { useRouter, Stack } from "expo-router";
import { 
    Plus, Search, Users, Zap, Trophy, ArrowRight, Clock, Star, BookOpen, Calendar, 
    CheckCircle, Coins, ChevronRight, Bell, MoreVertical, X, Award, Flame, 
    LayoutDashboard, Menu, HelpCircle, ChevronLeft, Filter, RefreshCw
} from "lucide-react-native";
import { Footer } from "../components/layout/footer";
import { useSidebar } from "../lib/SidebarContext";
import clsx from "clsx";
import { LinearGradient } from "expo-linear-gradient";

// --- MOCK DATA ---

const MOCK_UPCOMING = []; // "No upcoming sessions"
const MOCK_ONGOING = []; 
const MOCK_PAST = [
    {
        id: "p1",
        title: "React Hooks Deep Dive",
        date: "Feb 23, 2026",
        time: "10:00 AM",
        duration: "60 min",
    }
];

// --- COMPONENTS ---

function MetricCard({ label, value, subtext, icon: Icon, color, iconColor }: any) {
    return (
        <View className="bg-white p-4 rounded-xl border border-slate-200 flex-1 shadow-sm min-w-[140px] mr-3">
            <View className="flex-row justify-between items-start mb-2">
                <Text className="text-xs font-medium text-slate-500 uppercase tracking-wider flex-1 mr-2">{label}</Text>
                <View className={clsx("p-2 rounded-full", color)}>
                    <Icon size={16} color={iconColor} />
                </View>
            </View>
            <View>
                <Text className="text-2xl font-bold text-slate-900 mb-1">{value}</Text>
                <Text className="text-xs text-slate-400">{subtext}</Text>
            </View>
        </View>
    );
}

function TabButton({ label, isActive, onPress, count }: any) {
    return (
        <TouchableOpacity 
            onPress={onPress}
            className={clsx(
                "pb-3 px-1 mr-6 border-b-2 items-center flex-row gap-2 chat-bubble",
                isActive ? "border-slate-900" : "border-transparent"
            )}
        >
            <Text className={clsx(
                "font-medium",
                isActive ? "text-slate-900" : "text-slate-500"
            )}>
                {label}
            </Text>
            {count !== undefined && (
                <View className={clsx(
                    "px-1.5 py-0.5 rounded-full text-[10px]",
                    isActive ? "bg-slate-900" : "bg-slate-100"
                )}>
                    <Text className={clsx("text-[10px] font-bold", isActive ? "text-white" : "text-slate-500")}>
                        {count}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    )
}

function SessionActivityChart() {
    return (
        <View className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <View className="flex-row justify-between items-start mb-6">
                <View>
                    <Text className="text-lg font-bold text-slate-900">Session Activity</Text>
                    <Text className="text-xs text-slate-500 mt-1">Your learning journey over the last 30 days</Text>
                </View>
                <View className="flex-row bg-slate-100 rounded-lg p-1">
                    <TouchableOpacity className="px-3 py-1 rounded-md"><Text className="text-xs font-medium text-slate-500">7D</Text></TouchableOpacity>
                    <TouchableOpacity className="px-3 py-1 rounded-md"><Text className="text-xs font-medium text-slate-500">14D</Text></TouchableOpacity>
                    <TouchableOpacity className="px-3 py-1 bg-white shadow-sm rounded-md"><Text className="text-xs font-bold text-slate-900">30D</Text></TouchableOpacity>
                </View>
            </View>

            <View className="flex-row gap-4 mb-8">
                <View className="flex-1 bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                    <View className="flex-row items-center gap-2 mb-1">
                        <BookOpen size={14} className="text-emerald-600" color="#059669" />
                        <Text className="text-xs text-slate-500">Learned</Text>
                    </View>
                    <Text className="text-2xl font-bold text-emerald-600">0</Text>
                </View>
                <View className="flex-1 bg-violet-50 rounded-lg p-3 border border-violet-100">
                    <View className="flex-row items-center gap-2 mb-1">
                        <Users size={14} className="text-violet-600" color="#7c3aed" />
                        <Text className="text-xs text-slate-500">Taught</Text>
                    </View>
                    <Text className="text-2xl font-bold text-violet-600">0</Text>
                </View>
                 <View className="flex-1 bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <View className="flex-row items-center gap-2 mb-1">
                        <Flame size={14} className="text-blue-600" color="#2563eb" />
                        <Text className="text-xs text-slate-500">Trend</Text>
                    </View>
                    <Text className="text-2xl font-bold text-blue-600">0%</Text>
                </View>
            </View>

            {/* MOCK CHART VISUALIZATION */}
            <View className="h-48 items-center justify-center border-t border-slate-100 pt-4 relative">
                 {/* Grid lines */}
                 <View className="absolute inset-x-0 top-0 h-[1px] bg-slate-100" />
                 <View className="absolute inset-x-0 top-1/4 h-[1px] bg-slate-100" />
                 <View className="absolute inset-x-0 top-2/4 h-[1px] bg-slate-100" />
                 <View className="absolute inset-x-0 top-3/4 h-[1px] bg-slate-100" />
                 <View className="absolute inset-x-0 bottom-0 h-[1px] bg-slate-100" />
                 
                 <Text className="text-slate-400 text-xs text-center mt-20">No activity data to display</Text>
                 
                 {/* Legend */}
                 <View className="absolute bottom-0 left-0 right-0 flex-row justify-center gap-6 pb-2">
                     <View className="flex-row items-center gap-2">
                         <View className="h-2 w-2 rounded-full bg-emerald-500" />
                         <Text className="text-[10px] text-slate-500">Sessions Learned</Text>
                     </View>
                     <View className="flex-row items-center gap-2">
                         <View className="h-2 w-2 rounded-full bg-violet-500" />
                         <Text className="text-[10px] text-slate-500">Sessions Taught</Text>
                     </View>
                 </View>
            </View>
        </View>
    )
}

function SessionCalendar() {
    const days = Array.from({ length: 28 }, (_, i) => i + 1);

    return (
        <View className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
             <View className="flex-row justify-between items-center mb-6">
                <Text className="text-lg font-bold text-slate-900">Session Calendar</Text>
                <View className="flex-row bg-slate-100 rounded-lg p-0.5">
                    <TouchableOpacity className="p-1"><Calendar size={16} color="#64748b" /></TouchableOpacity>
                    <TouchableOpacity className="p-1 bg-white shadow-sm rounded"><Clock size={16} color="#0f172a" /></TouchableOpacity>
                </View>
            </View>

            <View className="flex-row gap-2 mb-4">
                 <TouchableOpacity className="px-3 py-1.5 bg-slate-100 rounded-md"><Text className="text-xs font-medium text-slate-600">Today</Text></TouchableOpacity>
                 <TouchableOpacity className="px-3 py-1.5 bg-white border border-slate-200 rounded-md"><Text className="text-xs font-medium text-slate-600">Month</Text></TouchableOpacity>
                 <TouchableOpacity className="px-3 py-1.5 bg-white border border-slate-200 rounded-md"><Text className="text-xs font-medium text-slate-600">Week</Text></TouchableOpacity>
                 <TouchableOpacity className="px-3 py-1.5 bg-white border border-slate-200 rounded-md"><Text className="text-xs font-medium text-slate-600">Agenda</Text></TouchableOpacity>
            </View>

            <View className="flex-row justify-between items-center mb-4">
                <TouchableOpacity><ChevronLeft size={20} color="#94a3b8" /></TouchableOpacity>
                <Text className="font-bold text-slate-900">February 2026</Text>
                <TouchableOpacity><ChevronRight size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            
            {/* Calendar Grid Header */}
            <View className="flex-row justify-between mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <Text key={day} className="text-[10px] text-slate-400 font-medium w-8 text-center">{day}</Text>
                ))}
            </View>
            
            {/* Calendar Grid Body */}
            <View className="flex-row flex-wrap justify-between gap-y-2">
                {days.map(day => (
                    <View key={day} className="w-8 h-8 items-center justify-center rounded-full hover:bg-slate-50">
                        <Text className="text-xs text-slate-600">{day}</Text>
                    </View>
                ))}
            </View>

             <View className="flex-row gap-4 mt-4 pt-4 border-t border-slate-100">
                <View className="flex-row items-center gap-2">
                    <View className="h-2 w-2 rounded-full bg-emerald-500" />
                    <Text className="text-xs text-slate-500">Learning</Text>
                </View>
                <View className="flex-row items-center gap-2">
                    <View className="h-2 w-2 rounded-full bg-violet-500" />
                    <Text className="text-xs text-slate-500">Teaching</Text>
                </View>
                <View className="flex-row items-center gap-2">
                    <View className="h-2 w-2 rounded-full bg-blue-500" />
                    <Text className="text-xs text-slate-500">Today</Text>
                </View>
            </View>
        </View>
    )
}

function RequestsSection() {
    const [tab, setTab] = useState('In');
    return (
        <View className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-bold text-slate-900">Requests</Text>
            </View>
            
            <View className="flex-row border-b border-slate-100 mb-4">
                 <TouchableOpacity 
                    onPress={() => setTab('In')}
                    className={clsx("pb-2 mr-4 border-b-2", tab === 'In' ? "border-slate-900" : "border-transparent")}
                 >
                     <Text className={clsx("font-medium", tab === 'In' ? "text-slate-900" : "text-slate-500")}>In (0)</Text>
                 </TouchableOpacity>
                 <TouchableOpacity 
                    onPress={() => setTab('Out')}
                    className={clsx("pb-2 border-b-2", tab === 'Out' ? "border-slate-900" : "border-transparent")}
                 >
                     <Text className={clsx("font-medium", tab === 'Out' ? "text-slate-900" : "text-slate-500")}>Out (0)</Text>
                 </TouchableOpacity>
            </View>

            <View className="items-center py-8">
                <View className="h-12 w-12 bg-slate-50 rounded-full items-center justify-center mb-3">
                    <Users size={20} color="#94a3b8" />
                </View>
                <Text className="text-slate-500 font-medium">No incoming requests</Text>
            </View>
        </View>
    )
}

export default function Dashboard() {
    const router = useRouter();
    const { openSidebar } = useSidebar();
    const [activeSessionTab, setActiveSessionTab] = useState<'Upcoming' | 'Ongoing' | 'Past'>('Upcoming');

    return (
        <View className="flex-1 bg-white">
            <Stack.Screen options={{ headerShown: false }} />
            <LinearGradient
                colors={['#c9fbd7', '#e2fdf0', '#f5fff8']}
                locations={[0, 0.45, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                pointerEvents="none"
            />
            <SafeAreaView className="flex-1">

            {/* Header */}
            <View className="px-4 py-3 flex-row justify-between items-center bg-transparent">
                <View className="flex-row items-center gap-3">
                     <TouchableOpacity onPress={openSidebar}>
                        <Menu size={24} color="#0f172a" />
                     </TouchableOpacity>
                </View>
                <Text className="text-xl font-bold text-slate-900 absolute left-0 right-0 text-center pointer-events-none">Dashboard</Text>
                <View className="flex-row items-center gap-3">
                    <Image source={{ uri: "https://github.com/shadcn.png" }} className="h-8 w-8 rounded-full" />
                </View>
            </View>
        
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

            {/* Header Content */}
             <View className="mb-6 flex-row justify-between items-start">
                 <View>
                    <Text className="text-2xl font-bold text-slate-900">
                        Welcome back, Arghadeep Ghosh
                    </Text>
                    <Text className="text-slate-500 mt-1">Ready to continue your learning journey?</Text>
                 </View>
                 <TouchableOpacity 
                    onPress={() => router.push("/create-study-room")}
                    className="bg-emerald-600 rounded-lg px-4 py-2 flex-row items-center justify-center gap-2 shadow-sm shadow-emerald-200"
                 >
                     <Plus size={16} color="white" />
                     <Text className="text-white font-bold text-xs">Create Room</Text>
                 </TouchableOpacity>
             </View>
             
             {/* Metrics Row */}
             <View className="mb-4">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                    <MetricCard 
                        label="Sessions Completed" 
                        value="9" 
                        subtext="Total sessions" 
                        icon={CheckCircle} 
                        color="bg-emerald-100" 
                        iconColor="#059669"
                    />
                    <MetricCard 
                        label="Total Earnings" 
                        value="0" 
                        subtext="Coins earned" 
                        icon={Coins} 
                        color="bg-amber-100" 
                        iconColor="#d97706"
                    />
                    <MetricCard 
                        label="Average Rating" 
                        value="0" 
                        subtext="Out of 5 stars" 
                        icon={Star} 
                        color="bg-purple-100" 
                        iconColor="#9333ea"
                    />
                </ScrollView>
             </View>

             {/* Your Sessions Section */}
             <View className="bg-white rounded-xl border border-slate-200 p-5 mb-8">
                 <View className="flex-row items-center justify-between mb-4">
                     <Text className="text-lg font-bold text-slate-900">Your Sessions</Text>
                 </View>
                 
                 <View className="flex-row border-b border-slate-100 mb-6">
                    <TouchableOpacity onPress={() => setActiveSessionTab('Upcoming')} className={clsx("pb-3 mr-6 border-b-2", activeSessionTab === 'Upcoming' ? "border-slate-900" : "border-transparent")}>
                        <Text className={clsx("font-medium", activeSessionTab === 'Upcoming' ? "text-slate-900" : "text-slate-500")}>Upcoming</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveSessionTab('Ongoing')} className={clsx("pb-3 mr-6 border-b-2", activeSessionTab === 'Ongoing' ? "border-slate-900" : "border-transparent")}>
                        <Text className={clsx("font-medium", activeSessionTab === 'Ongoing' ? "text-slate-900" : "text-slate-500")}>Ongoing</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveSessionTab('Past')} className={clsx("pb-3 border-b-2", activeSessionTab === 'Past' ? "border-slate-900" : "border-transparent")}>
                        <Text className={clsx("font-medium", activeSessionTab === 'Past' ? "text-slate-900" : "text-slate-500")}>Past <Text className="text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-600">9</Text></Text>
                    </TouchableOpacity>
                 </View>

                 <View className="min-h-[150px] items-center justify-center py-8">
                     {activeSessionTab === 'Upcoming' && MOCK_UPCOMING.length === 0 && (
                         <View className="items-center">
                             <View className="h-12 w-12 bg-slate-50 rounded-full items-center justify-center mb-3">
                                <Calendar size={24} color="#94a3b8" />
                             </View>
                             <Text className="text-slate-500 font-medium">No upcoming sessions</Text>
                         </View>
                     )}
                     
                     {activeSessionTab === 'Ongoing' && MOCK_ONGOING.length === 0 && (
                         <View className="items-center">
                             <View className="h-12 w-12 bg-slate-50 rounded-full items-center justify-center mb-3">
                                <Zap size={24} color="#94a3b8" />
                             </View>
                             <Text className="text-slate-500 font-medium">No ongoing sessions</Text>
                         </View>
                     )}

                     {activeSessionTab === 'Past' && (
                         <View className="w-full">
                            {MOCK_PAST.map((session) => (
                                <View key={session.id} className="flex-row justify-between items-center py-3 border-b border-slate-50 last:border-0">
                                    <View>
                                        <Text className="font-bold text-slate-900 text-base">{session.title}</Text>
                                        <Text className="text-xs text-slate-500 mt-1">{session.date} • {session.time}</Text>
                                    </View>
                                    <View className="bg-slate-100 px-2 py-1 rounded">
                                        <Text className="text-xs font-medium text-slate-600">{session.duration}</Text>
                                    </View>
                                </View>
                            ))}
                         </View>
                     )}
                 </View>

                 {/* Pagination */}
                 <View className="items-center flex-row justify-center gap-4 mt-2">
                     <TouchableOpacity disabled className="opacity-50"><Text className="text-slate-400 font-medium">Previous</Text></TouchableOpacity>
                     <View className="bg-slate-900 px-3 py-1 rounded"><Text className="text-white font-medium text-xs">Page 1</Text></View>
                     <TouchableOpacity disabled className="opacity-50"><Text className="text-slate-400 font-medium">Next</Text></TouchableOpacity>
                 </View>
             </View>

             {/* Achievements Section */}
             <View className="mb-8">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-lg font-bold text-slate-900">Achievements</Text>
                    <Text className="text-slate-500 text-sm">3/1 Unlocked</Text>
                </View>
                
                {/* Achievement Cards */}
                <View className="gap-4">
                    {/* UI Artisan */}
                    <View className="bg-white p-4 rounded-xl border border-slate-200 flex-row gap-4 items-center">
                        <View className="h-12 w-12 bg-pink-100 rounded-full items-center justify-center">
                            <Text className="text-xl">🎨</Text>
                        </View>
                        <View className="flex-1">
                            <View className="flex-row justify-between mb-0.5">
                                <Text className="font-bold text-slate-900">UI Artisan</Text>
                                <Text className="text-xs font-bold text-amber-500">+50 Coins</Text>
                            </View>
                            <Text className="text-xs text-slate-500 mb-2">Crafted pixel-perfect user interfaces</Text>
                             <View className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <View className="h-full bg-emerald-500 w-full" />
                            </View>
                            <View className="flex-row justify-between mt-1">
                                <Text className="text-[10px] text-slate-400">Unlocked 2/28/2026</Text>
                                <Text className="text-[10px] text-emerald-600 font-bold">100%</Text>
                            </View>
                        </View>
                    </View>

                    {/* Component Master */}
                    <View className="bg-white p-4 rounded-xl border border-slate-200 flex-row gap-4 items-center">
                        <View className="h-12 w-12 bg-blue-100 rounded-full items-center justify-center">
                            <Text className="text-xl">⚛️</Text>
                        </View>
                        <View className="flex-1">
                            <View className="flex-row justify-between mb-0.5">
                                <Text className="font-bold text-slate-900">Component Master</Text>
                                <Text className="text-xs font-bold text-amber-500">+20 Coins</Text>
                            </View>
                            <Text className="text-xs text-slate-500 mb-2">Built reusable React components</Text>
                             <View className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <View className="h-full bg-emerald-500 w-full" />
                            </View>
                             <View className="flex-row justify-between mt-1">
                                <Text className="text-[10px] text-slate-400">Unlocked 3/3/2026</Text>
                                <Text className="text-[10px] text-emerald-600 font-bold">100%</Text>
                            </View>
                        </View>
                    </View>

                    {/* Accessibility Pro */}
                    <View className="bg-white p-4 rounded-xl border border-slate-200 flex-row gap-4 items-center">
                        <View className="h-12 w-12 bg-purple-100 rounded-full items-center justify-center">
                            <Text className="text-xl">♿</Text>
                        </View>
                        <View className="flex-1">
                            <View className="flex-row justify-between mb-0.5">
                                <Text className="font-bold text-slate-900">Accessibility Pro</Text>
                                <Text className="text-xs font-bold text-amber-500">+100 Coins</Text>
                            </View>
                            <Text className="text-xs text-slate-500 mb-2">Made the web accessible for everyone</Text>
                             <View className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <View className="h-full bg-emerald-500 w-full" />
                            </View>
                             <View className="flex-row justify-between mt-1">
                                <Text className="text-[10px] text-slate-400">Unlocked 2/23/2026</Text>
                                <Text className="text-[10px] text-emerald-600 font-bold">100%</Text>
                            </View>
                        </View>
                    </View>

                    {/* State Manager (Locked) */}
                     <View className="bg-white p-4 rounded-xl border border-slate-200 flex-row gap-4 items-center opacity-70">
                        <View className="h-12 w-12 bg-slate-100 rounded-full items-center justify-center grayscale">
                            <Text className="text-xl">🔄</Text>
                        </View>
                        <View className="flex-1">
                            <View className="flex-row justify-between mb-0.5">
                                <Text className="font-bold text-slate-900">State Manager</Text>
                                <Text className="text-xs font-bold text-slate-400">+150 Coins</Text>
                            </View>
                            <Text className="text-xs text-slate-500 mb-2">Mastered complex state logic</Text>
                             <View className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <View className="h-full bg-blue-500 w-[60%]" />
                            </View>
                            <View className="flex-row justify-between mt-1">
                                <Text className="text-[10px] text-slate-400">3/5</Text>
                                <Text className="text-[10px] text-blue-600 font-bold">60%</Text>
                            </View>
                        </View>
                    </View>

                    {/* Getting Started (Locked) */}
                     <View className="bg-white p-4 rounded-xl border border-slate-200 flex-row gap-4 items-center opacity-70">
                        <View className="h-12 w-12 bg-slate-100 rounded-full items-center justify-center grayscale">
                            <Text className="text-xl">📚</Text>
                        </View>
                        <View className="flex-1">
                            <View className="flex-row justify-between mb-0.5">
                                <Text className="font-bold text-slate-900">Getting Started</Text>
                                <Text className="text-xs font-bold text-slate-400">+25 Coins</Text>
                            </View>
                            <Text className="text-xs text-slate-500 mb-2">Complete 5 learning sessions</Text>
                             <View className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <View className="h-full bg-slate-300 w-[0%]" />
                            </View>
                            <View className="flex-row justify-between mt-1">
                                <Text className="text-[10px] text-slate-400">0/5</Text>
                                <Text className="text-[10px] text-slate-500 font-bold">0%</Text>
                            </View>
                        </View>
                    </View>

                     <TouchableOpacity className="py-2 items-center">
                        <Text className="text-sm font-medium text-slate-500">Show 15 more</Text>
                     </TouchableOpacity>
                </View>
             </View>
             
             {/* Streaks Section */}
             <View className="bg-gradient-to-tr from-orange-50 to-amber-50 p-5 rounded-xl border border-orange-100 mb-8">
                <View className="flex-row justify-between items-start mb-4">
                    <View>
                        <Text className="text-lg font-bold text-orange-900">Streaks</Text>
                         <View className="flex-row gap-2 mt-1">
                            <Text className="text-xs text-orange-700 font-medium">All 20 Won</Text>
                            <Text className="text-xs text-orange-700">3 Active</Text>
                            <Text className="text-xs text-orange-700 opacity-60">1 Locked</Text>
                        </View>
                    </View>
                    <View className="h-10 w-10 bg-orange-100 rounded-full items-center justify-center">
                        <Flame size={20} className="text-orange-500" color="#f97316" />
                    </View>
                </View>
                
                <View className="flex-row gap-4 mb-4">
                    <View className="bg-white p-3 rounded-lg flex-1 border border-orange-100 shadow-sm">
                        <Text className="text-xs text-slate-400 uppercase font-bold mb-1">Current</Text>
                         <Text className="text-2xl font-bold text-slate-900">3 <Text className="text-sm font-normal text-slate-400">days</Text></Text>
                    </View>
                    <View className="bg-white p-3 rounded-lg flex-1 border border-orange-100 shadow-sm">
                        <Text className="text-xs text-slate-400 uppercase font-bold mb-1">Longest</Text>
                         <Text className="text-2xl font-bold text-slate-900">3 <Text className="text-sm font-normal text-slate-400">days</Text></Text>
                    </View>
                </View>
                
                <View className="flex-row items-center gap-2 bg-white/60 p-2 rounded-lg">
                    <Text className="text-lg">🎯</Text>
                    <Text className="text-xs text-orange-800 font-medium">Keep going! You're building a great habit.</Text>
                </View>
             </View>

             {/* Session Activity Chart */}
             <SessionActivityChart />
             
             {/* Session Calendar */}
             <SessionCalendar />
             
             {/* Requests */}
             <RequestsSection />

             {/* Pending Reviews */}
             <View className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-lg font-bold text-slate-900">Pending Reviews</Text>
                </View>
                <View className="flex-row border-b border-slate-100 mb-4">
                    <TouchableOpacity className="pb-2 mr-4 border-b-2 border-slate-900">
                        <Text className="font-medium text-slate-900">Pending Reviews</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="pb-2 border-b-2 border-transparent">
                        <Text className="font-medium text-slate-500">History</Text>
                    </TouchableOpacity>
                </View>
                <View className="items-center py-8">
                     <View className="h-12 w-12 bg-slate-50 rounded-full items-center justify-center mb-3">
                        <CheckCircle size={20} color="#94a3b8" />
                    </View>
                    <Text className="text-slate-500 font-medium text-center">You have no pending reviews. Great job!</Text>
                </View>
             </View>
             
             {/* Your Skills */}
             <View className="flex-row items-center justify-between mb-2 mt-6">
                 <Text className="text-sm font-semibold text-slate-400">YOUR SKILLS</Text>
                 <TouchableOpacity>
                    <Text className="text-blue-500 font-bold text-xs">View All</Text>
                 </TouchableOpacity>
             </View>
             <View className="bg-slate-50 p-6 rounded-xl border border-dashed border-slate-300 items-center justify-center mb-6">
                <Text className="text-slate-400 text-center mb-2">No skills added yet</Text>
                <Text className="text-slate-400 text-xs text-center">Start adding skills to track your progress!</Text>
             </View>

             {/* Suggested Study Rooms */}
             <View className="flex-row items-center justify-between mb-2">
                 <Text className="text-sm font-semibold text-slate-400">SUGGESTED STUDY ROOMS</Text>
                 <TouchableOpacity>
                    <Text className="text-blue-500 font-bold text-xs">View All</Text>
                 </TouchableOpacity>
             </View>
             <View className="bg-slate-50 p-6 rounded-xl border border-dashed border-slate-300 items-center justify-center mb-8">
                <Text className="text-slate-400 text-center">No suggestions available based on your current skills.</Text>
             </View>

            <Footer />
        </ScrollView>
        </SafeAreaView>
    </View>
  );
}
