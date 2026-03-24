import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, Modal, TouchableWithoutFeedback, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ArrowLeft, Plus, Swords, ChevronDown, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { DebateRoomCard, DebateStatus, DebateRoom } from '../../components/ui/debate-room-card';
import { ShareSheet } from '../../components/ui/share-sheet';

// Helper for NativeWind classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Mock Data for Debate Rooms matching new interface
const MOCK_DEBATE_ROOMS: DebateRoom[] = [
  {
    id: '1',
    topic: 'AI will replace most creative jobs within 10 years',
    description: 'A deep dive into generative AI capabilities and their impact on art, writing, and design industries.',
    status: DebateStatus.LIVE,
    scheduledAt: new Date().toISOString(),
    turnDurationSeconds: 120,
    maxParticipants: 3, // implies 6 total
    prizePool: 500,
    host: {
      name: 'Dr. Alan Turing',
      avatar: 'https://i.pravatar.cc/150?u=a'
    },
    teams: [
      {
        id: 't1',
        side: 'FOR',
        participants: [
           { id: '1', name: 'Sarah', status: 'ACTIVE' },
           { id: '2', name: 'Mike', status: 'ACTIVE' }
        ]
      },
      {
        id: 't2',
        side: 'AGAINST',
        participants: [
           { id: '3', name: 'Alex', status: 'ACTIVE' }
        ]
      }
    ]
  },
  {
    id: '2',
    topic: 'Universal Basic Income is necessary for the future',
    description: 'Discussing economic stability in the age of automation.',
    status: DebateStatus.WAITING,
    scheduledAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    turnDurationSeconds: 60,
    maxParticipants: 2,
    host: {
      name: 'Elon M.',
      avatar: 'https://i.pravatar.cc/150?u=e'
    },
    teams: [
      {
        id: 't3',
        side: 'FOR',
        participants: [
           { id: '4', name: 'Jordan', status: 'ACTIVE' }
        ]
      },
      {
        id: 't4',
        side: 'AGAINST',
        participants: []
      }
    ]
  },
  {
    id: '3',
    topic: 'Remote work is detrimental to company culture',
    status: DebateStatus.ENDED,
    turnDurationSeconds: 180,
    maxParticipants: 4,
    host: {
      name: 'Satya N.',
      
    },
    teams: [
      {
        id: 't5',
        side: 'FOR',
        participants: [
           { id: '5', name: 'Bill', status: 'INACTIVE' },
           { id: '6', name: 'Steve', status: 'INACTIVE' }
        ]
      },
      {
        id: 't6',
        side: 'AGAINST',
        participants: [
           { id: '7', name: 'Tim', status: 'INACTIVE' },
           { id: '8', name: 'Sundar', status: 'INACTIVE' }
        ]
      }
    ]
  },
  {
    id: '4',
    topic: 'Is space exploration worth the cost?',
    status: DebateStatus.OPEN,
    description: 'Debating resource allocation: Earth vs Mars.',
    turnDurationSeconds: 90,
    maxParticipants: 3,
    prizePool: 1000,
    host: {
      name: 'Neil D.',
      avatar: 'https://i.pravatar.cc/150?u=n'
    },
    teams: []
  },
];

export default function DebateRoomsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState<DebateStatus | 'ALL'>('ALL');
  const [activeFilter, setActiveFilter] = useState<'all' | 'live' | 'open'>('all');
  const [trendingOnly, setTrendingOnly] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  // Share Sheet State
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<DebateRoom | null>(null);

  const handleShare = (room: DebateRoom) => {
    setSelectedRoom(room);
    setShareSheetVisible(true);
  };

  const filteredRooms = MOCK_DEBATE_ROOMS.filter(room => {
    // Search Filter
    const matchesSearch = !searchQuery || 
      room.topic.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (room.description && room.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    // Status Filter
    if (statusFilter !== 'ALL' && room.status !== statusFilter) {
        return false;
    }

    // Trending Filter (Mock Logic - in real app this might be server side or check participant count)
    // For now, if trending is on, maybe we just show everything or specific ones. 
    // The web app says "Trending uses hybrid sort", so usually it changes SORT order, not filters out items.
    // But for the sake of the assigned task "Trending: On/Off", if it implies filtering:
    // "Trending uses hybrid sort: LIVE first, then upcoming soonest, then participation."
    // So it's a sort. Let's implement the sort if trending is on.
    
    return true;
  }).sort((a, b) => {
      if (trendingOnly) {
          // LIVE first
          if (a.status === DebateStatus.LIVE && b.status !== DebateStatus.LIVE) return -1;
          if (b.status === DebateStatus.LIVE && a.status !== DebateStatus.LIVE) return 1;
          
          // Then by date (soonest first)
          return new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime();
      }
      return 0; // Default order
  });

  const getStatusLabel = (status: DebateStatus | 'ALL') => {
      switch(status) {
          case 'ALL': return 'All Debates';
          case DebateStatus.WAITING: return 'Waiting';
          case DebateStatus.PREP: return 'In Prep';
          case DebateStatus.LIVE: return 'Live';
          case DebateStatus.ENDED: return 'Ended';
          case DebateStatus.OPEN: return 'Open'; // Extra one in enum
          default: return status;
      }
  }

  // Active Filter Logic (Additional filter layer for the 'Active' logic used by dropdown?)
  const finalDecoratedRooms = filteredRooms.filter(room => {
    // If we want to reuse the same status dropdown as other pages or just the "Trending" one.
    // The previous code had a separate filter step. Let's keep it simple.
    return true; 
  });

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={['#fdf4ff', '#fae8ff', '#f5d0fe']} // Purple/Pinkish gradient for Debate
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        className="absolute w-full h-full"
      />

      <SafeAreaView 
        className="flex-1" 
        edges={Platform.OS === 'web' ? [] : ['top']}
        style={Platform.OS === 'web' ? { paddingTop: 16 } : undefined}
      >
        <View style={Platform.OS === 'web' ? { maxWidth: 640, width: '100%', alignSelf: 'center', paddingHorizontal: 16 } : { paddingHorizontal: 16 }}>
          <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center gap-2">
                  <Image source={{uri: 'https://github.com/shadcn.png'}} className="w-8 h-8 rounded-full" />
                  <Text className="text-slate-900 font-bold text-lg">Debate Rooms</Text>
              </View>
              <TouchableOpacity 
                onPress={() => router.push('/dashboard')}
                className="flex-row items-center gap-1 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full"
              >
                 <ArrowLeft size={14} color="#475569" />
                 <Text className="text-slate-600 font-semibold text-sm">Dashboard</Text>
              </TouchableOpacity>
          </View>
        </View>
          
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={Platform.OS === 'web' ? { maxWidth: 640, width: '100%', alignSelf: 'center', paddingHorizontal: 16, paddingBottom: 100 } : { paddingHorizontal: 16, paddingBottom: 100 }}
        >

          {/* Search Bar */}
          <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3 mb-4 shadow-sm">
             <Search size={20} className="text-slate-400 mr-2" />
             <TextInput 
                placeholder="Search debates..." 
                className="flex-1 text-slate-900 font-medium h-full"
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
             />
          </View>

            <View className="flex-row gap-3 mb-8 z-20">
              
              {/* Dropdown Trigger */}
              <TouchableOpacity
                onPress={() => setShowStatusDropdown(true)}
                className="flex-1 h-12 flex-row items-center justify-between px-4 bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl"
              >
                <Text className="text-slate-900 dark:text-white font-medium">
                    {getStatusLabel(statusFilter)}
                </Text>
                <ChevronDown size={16} color="#64748b" />
              </TouchableOpacity>

              {/* Trending Toggle */}
              <TouchableOpacity
                onPress={() => setTrendingOnly(!trendingOnly)}
                className={cn(
                  "flex-1 h-12 items-center justify-center rounded-2xl border",
                  trendingOnly 
                    ? "bg-green-600 border-green-600" 
                    : "bg-white/80 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800"
                )}
              >
                <Text className={cn("font-bold", trendingOnly ? "text-white" : "text-slate-600 dark:text-slate-300")}>
                    {trendingOnly ? 'Trending: On' : 'Trending: Off'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Trending Badge */}
            {trendingOnly && (
                <View className="mb-6 bg-green-50/80 border border-green-100 p-3 rounded-xl">
                    <Text className="text-green-800 text-xs leading-5">
                        Trending uses hybrid sort: LIVE first, then upcoming soonest, then participation.
                    </Text>
                </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 pb-2">
              <TouchableOpacity
                onPress={() => setActiveFilter('all')}
                className={cn(
                  "px-4 py-2 rounded-full border mr-2",
                  activeFilter === 'all' 
                    ? "bg-purple-600 border-purple-600" 
                    : "bg-white border-zinc-200"
                )}
              >
                <Text className={cn("font-medium", activeFilter === 'all' ? "text-white" : "text-zinc-600")}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveFilter('live')}
                className={cn(
                  "px-4 py-2 rounded-full border flex-row items-center gap-1.5",
                  activeFilter === 'live' 
                    ? "bg-red-500 border-red-500" 
                    : "bg-white border-zinc-200"
                )}
              >
                <View className={cn("w-2 h-2 rounded-full animate-pulse", activeFilter === 'live' ? "bg-white" : "bg-red-500")} />
                <Text className={cn("font-medium", activeFilter === 'live' ? "text-white" : "text-zinc-600")}>Live Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveFilter('open')}
                className={cn(
                  "px-4 py-2 rounded-full border",
                  activeFilter === 'open' 
                    ? "bg-emerald-600 border-emerald-600" 
                    : "bg-white border-zinc-200"
                )}
              >
                <Text className={cn("font-medium", activeFilter === 'open' ? "text-white" : "text-zinc-600")}>Open to Join</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Room List */}

      {/* Custom Dropdown Modal */}
      <Modal
        visible={showStatusDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatusDropdown(false)}
      >
         <TouchableWithoutFeedback onPress={() => setShowStatusDropdown(false)}>
            <View className="flex-1 bg-black/20 justify-center px-6">
                <TouchableWithoutFeedback>
                    <View className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-xl border border-zinc-200 dark:border-zinc-800 p-2">
                        {[
                            { label: 'All Debates', value: 'ALL' },
                            { label: 'Waiting', value: DebateStatus.WAITING },
                            { label: 'In Prep', value: DebateStatus.PREP },
                            { label: 'Live', value: DebateStatus.LIVE },
                            { label: 'Ended', value: DebateStatus.ENDED }
                        ].map((option) => (
                            <TouchableOpacity
                                key={String(option.value)}
                                onPress={() => {
                                    setStatusFilter(option.value as DebateStatus | 'ALL');
                                    setShowStatusDropdown(false);
                                }}
                                className={cn(
                                    "flex-row items-center justify-between p-3 rounded-xl",
                                    statusFilter === option.value ? "bg-zinc-100 dark:bg-zinc-800" : ""
                                )}
                            >
                                <Text className={cn(
                                    "text-base",
                                    statusFilter === option.value ? "font-bold text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"
                                )}>
                                    {option.label}
                                </Text>
                                {statusFilter === option.value && <Check size={16} color="#0f172a" />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableWithoutFeedback>
            </View>
         </TouchableWithoutFeedback>
      </Modal>

            <View className="gap-2">
              {filteredRooms.map((room) => (
                <DebateRoomCard 
                    key={room.id}
                    room={room}
                    onPress={() => router.push(`/debate-room/${room.id}`)}
                    onAction={() => router.push(`/debate-room/${room.id}`)}
                    onShare={() => handleShare(room)}
                />
              ))}
              
              {filteredRooms.length === 0 && (
                <View className="py-12 items-center justify-center">
                  <Text className="text-zinc-400 text-center">No debate rooms found matching your criteria.</Text>
                </View>
              )}
            </View>
            
            {/* Bottom Spacer for FAB */}
            <View className="h-24" />
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity 
          className="absolute bottom-6 right-6 w-14 h-14 bg-purple-600 rounded-full items-center justify-center shadow-lg shadow-purple-600/40"
          onPress={() => router.push('/debate-room/create')}
        >
          <Plus size={28} color="white" />
        </TouchableOpacity>
  {/* Share Sheet */}
        <ShareSheet
          visible={shareSheetVisible} 
          onClose={() => setShareSheetVisible(false)} 
          title={selectedRoom?.topic || "Check out this Debate Room!"}
          url={`https://myapp.com/debate/${selectedRoom?.id}`}
        />

      
      </SafeAreaView>
    </View>
  );
}
