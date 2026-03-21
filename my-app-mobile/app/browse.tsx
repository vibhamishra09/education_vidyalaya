import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Search, ArrowLeft, Menu, Swords, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { BrowsePeer, StudyRoom } from '../types/browse';
import { PeerCard } from '../components/cards/PeerCard';
import { StudyRoomCard } from '../components/ui/study-room-card';
import { useSidebar } from '../lib/SidebarContext';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- Mock Data ---
const MOCK_PEERS: BrowsePeer[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    bio: 'Frontend developer passionate about React and UI design.',
    skills: [{ id: '1', name: 'React' }, { id: '2', name: 'TypeScript' }, { id: '3', name: 'UI/UX' }],
    rating: 4.8,
    reviewCount: 24,
    totalSessions: 15,
  },
  {
    id: '2',
    name: 'Alex Rodriguez',
    bio: 'Python expert and data science enthusiast. Let\'s learn together!',
    skills: [{ id: '4', name: 'Python' }, { id: '5', name: 'Data Science' }, { id: '6', name: 'Machine Learning' }],
    rating: 4.5,
    reviewCount: 12,
    totalSessions: 8,
  },
  {
    id: '3',
    name: 'Jordan Smith',
    bio: 'Love debating about history and philosophy.',
    skills: [{ id: '7', name: 'History' }, { id: '8', name: 'Philosophy' }, { id: '9', name: 'Debate' }],
    rating: 5.0,
    reviewCount: 5,
    totalSessions: 20,
  },
];

const MOCK_STUDY_ROOMS: StudyRoom[] = [
  {
    id: '101',
    title: 'React Hooks Deep Dive',
    description: 'Discussing useEffect, useMemo, and custom hooks.',
    date: '2026-03-01T10:00:00Z',
    startTime: '10:00',
    duration: 60,
    skills: [{ id: '1', name: 'React' }],
    participantCount: 3,
    maxParticipants: 5,
    host: { id: '1', name: 'Sarah Chen' },
    status: 'UPCOMING',
  },
  {
    id: '102',
    title: 'Python for Beginners',
    description: 'Starting from scratch with Python basics.',
    date: '2026-03-02T14:00:00Z',
    startTime: '14:00',
    duration: 45,
    skills: [{ id: '4', name: 'Python' }],
    participantCount: 1,
    maxParticipants: 10,
    host: { id: '2', name: 'Alex Rodriguez' },
    status: 'ONGOING', // Example of ongoing
  },
];

export default function BrowseScreen() {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'peers' | 'studyRooms'>('peers');
  
  // Filter logic (simple client-side for now)
  const peers = MOCK_PEERS.filter(p => 
     !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     p.skills.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const studyRooms = MOCK_STUDY_ROOMS.filter(r =>
     !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const peerCount = peers.length;
  
  return (
    <View className="flex-1 bg-white dark:bg-black">
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={['#c9fbd7', '#e2fdf0', '#f5fff8']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />
      <SafeAreaView className="flex-1" edges={['top']}>

      {/* Header */}
      <View className="px-4 py-3 flex-row justify-between items-center">
            <View className="flex-row items-center gap-3">
                 <TouchableOpacity onPress={openSidebar}>
                    <Menu size={24} color="#0f172a" />
                 </TouchableOpacity>
            </View>
            <Text className="text-xl font-bold text-slate-900 absolute left-0 right-0 text-center pointer-events-none">Browse</Text>
            <View className="flex-row items-center gap-3">
                <Image source={{ uri: "https://github.com/shadcn.png" }} className="h-8 w-8 rounded-full" />
            </View>
      </View>
      
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Header Section */}
        <View className="px-4 pt-4 pb-2">

            <Text className="text-3xl font-extrabold text-zinc-900 dark:text-white mb-1">
                Browse Community
            </Text>
            <Text className="text-base text-zinc-500 dark:text-zinc-400 leading-6 mb-6">
                Discover peers and study rooms to learn and grow together
            </Text>

            {/* Search Bar */}
            <View className="flex-row items-center bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl h-12 px-4 mb-6">
                <Search size={18} color="#A1A1AA" />
                <TextInput 
                    className="flex-1 ml-3 text-base text-zinc-900 dark:text-white"
                    placeholder="Search by name or skill..."
                    placeholderTextColor="#A1A1AA"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Debate Rooms Entry */}
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => router.push('/debate-room')}
                className="flex-row items-center justify-between bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 p-4 rounded-2xl mb-6"
            >
                <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-800/50 items-center justify-center">
                        <Swords size={20} color="#9333ea" />
                    </View>
                    <View>
                        <Text className="text-base font-bold text-zinc-900 dark:text-white">Debate Rooms</Text>
                        <Text className="text-xs text-zinc-500 dark:text-zinc-400">Join live discussions & argue topics</Text>
                    </View>
                </View>
                <ChevronRight size={20} color="#A1A1AA" />
            </TouchableOpacity>

            {/* Tabs */}
            <View className="flex-row bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl mb-6">
                <TouchableOpacity 
                    onPress={() => setActiveTab('peers')}
                    className={cn(
                        "flex-1 flex-row items-center justify-center py-2.5 rounded-xl gap-2",
                        activeTab === 'peers' ? "bg-emerald-600 shadow-sm" : ""
                    )}
                >
                    <Text className={cn(
                        "text-sm font-bold",
                        activeTab === 'peers' ? "text-white" : "text-zinc-500"
                    )}>
                        Peers
                    </Text>
                    {peerCount > 0 && (
                        <View className={cn(
                            "px-1.5 h-5 justify-center rounded",
                             activeTab === 'peers' ? "bg-white/20" : "bg-emerald-100"
                        )}>
                            <Text className={cn(
                                "text-[10px] font-bold",
                                activeTab === 'peers' ? "text-white" : "text-emerald-700"
                            )}>{peerCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={() => setActiveTab('studyRooms')}
                    className={cn(
                        "flex-1 flex-row items-center justify-center py-2.5 rounded-xl gap-2",
                        activeTab === 'studyRooms' ? "bg-emerald-600 shadow-sm" : ""
                    )}
                >
                    <Text className={cn(
                        "text-sm font-bold",
                        activeTab === 'studyRooms' ? "text-white" : "text-zinc-500"
                    )}>
                        Study Rooms
                    </Text>
                </TouchableOpacity>
            </View>
        </View>

        {/* Content Section */}
        <View className="px-4">
            {activeTab === 'peers' ? (
                <View>
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-lg font-bold text-zinc-900 dark:text-white">
                            All Peers
                        </Text>
                        {/* Filter Button Placeholder */}
                        <TouchableOpacity>
                            <Text className="text-xs font-medium text-emerald-600">Filter</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {peers.map(peer => (
                        <PeerCard key={peer.id} peer={peer} />
                    ))}
                    
                    {peers.length === 0 && (
                        <View className="items-center py-10">
                            <Text className="text-zinc-400">No peers found matching your search.</Text>
                        </View>
                    )}
                </View>
            ) : (
                <View>
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-lg font-bold text-zinc-900 dark:text-white">
                            Upcoming Study Rooms
                        </Text>
                    </View>

                    {studyRooms.map(room => (
                         // Map Browse type to UI component props 
                        <StudyRoomCard 
                            key={room.id} 
                            id={room.id}
                            title={room.title}
                            description={room.description}
                            sessionStatus={room.status === 'ONGOING' ? 'LIVE' : (room.status === 'COMPLETED' ? 'COMPLETED' : 'UPCOMING')}
                            date={room.date}
                            duration={room.duration}
                            maxParticipants={room.maxParticipants}
                            participantCount={room.participantCount}
                            joiningFee={0}
                            createdBy={room.host}
                            skills={room.skills.map(s => s.name)}
                        />
                    ))}

                     {studyRooms.length === 0 && (
                        <View className="items-center py-10">
                            <Text className="text-zinc-400">No study rooms found matching your search.</Text>
                        </View>
                    )}
                </View>
            )}
        </View>

      </ScrollView>
    </SafeAreaView>
  </View>
  );
}
