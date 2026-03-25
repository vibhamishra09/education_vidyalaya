import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Users, 
  Clock, 
  Swords, 
  Video, 
  Share2, 
  AlertCircle,
  ArrowLeft,
  Calendar,
  Play,
  Shield,
  Crown,
  CheckCircle2,
  LogOut,
  BellRing,
  ThumbsUp,
  MessageSquare
} from 'lucide-react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ShareSheet } from '../../components/ui/share-sheet';

// Helper for NativeWind classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

enum DebateStatus {
  WAITING = 'WAITING',
  PREP = 'PREP',
  LIVE = 'LIVE',
  ENDED = 'ENDED',
  PROCESSED = 'PROCESSED',
}

enum DebateSide {
  FOR = 'FOR',
  AGAINST = 'AGAINST',
}

interface User {
  id: string;
  name: string;
  avatar?: string;
}

interface DebateParticipant {
  id: string;
  user: User;
  status: 'ACTIVE' | 'INACTIVE';
}

interface DebateTeam {
  id: string;
  side: DebateSide;
  participants: DebateParticipant[];
}

interface DebateRoom {
  id: string;
  topic: string;
  description?: string;
  status: DebateStatus;
  scheduledAt?: string;
  turnDurationSeconds: number;
  maxParticipants: number;
  host: User;
  teams: DebateTeam[];
  moderators: { user: User; isHost: boolean }[];
}

// --- Mock Data ---

const MOCK_ROOM: DebateRoom = {
  id: '1',
  topic: 'AI vs Human Intelligence',
  description: 'A heated debate about the future of software engineering and the role of artificial intelligence in code generation and architecture.',
  status: DebateStatus.WAITING, // Default to Waiting/Lobby to show Join UI
  scheduledAt: '2026-03-01T16:30:00',
  turnDurationSeconds: 120,
  maxParticipants: 3, // 3 per team
  host: { id: 'h1', name: 'Aakash Mishra', avatar: 'https://i.pravatar.cc/150?u=h1' },
  teams: [
    { 
      id: 't1', 
      side: DebateSide.FOR, 
      participants: [] 
    },
    { 
      id: 't2', 
      side: DebateSide.AGAINST, 
      participants: [] 
    }
  ],
  moderators: [{ user: { id: 'h1', name: 'Aakash Mishra' }, isHost: true }]
};

// --- Components ---

const StatusBadge = ({ status }: { status: DebateStatus }) => {
  let bgClass = 'bg-slate-100';
  let textClass = 'text-slate-700';
  let label = status;

  switch (status) {
    case DebateStatus.LIVE:
      bgClass = 'bg-green-100 border-green-200';
      textClass = 'text-green-700';
      break;
    case DebateStatus.PREP:
      bgClass = 'bg-blue-100 border-blue-200';
      textClass = 'text-blue-700';
      break;
    case DebateStatus.WAITING:
      bgClass = 'bg-yellow-100 border-yellow-200';
      textClass = 'text-yellow-700';
      label = 'SCHEDULED';
      break;
    case DebateStatus.ENDED:
      bgClass = 'bg-slate-100 border-slate-200';
      textClass = 'text-slate-600';
      break;
  }

  return (
    <View className={cn("px-2.5 py-1 rounded-full border flex-row items-center", bgClass)}>
      {status === DebateStatus.LIVE && (
        <View className="w-1.5 h-1.5 rounded-full bg-green-600 mr-1.5 animate-pulse" />
      )}
      <Text className={cn("text-xs font-semibold", textClass)}>{label}</Text>
    </View>
  );
};

export default function DebateRoomScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [selectedSide, setSelectedSide] = useState<DebateSide | null>(null);
  const [showLiveView, setShowLiveView] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isShareVisible, setIsShareVisible] = useState(false);
  
  // Use mock room, in real app fetch by id
  const room = MOCK_ROOM; 
  
  const forTeam = room.teams.find(t => t.side === DebateSide.FOR);
  const againstTeam = room.teams.find(t => t.side === DebateSide.AGAINST);
  
  const totalParticipants = (forTeam?.participants.length || 0) + (againstTeam?.participants.length || 0);

  const handleJoinTeam = (side: DebateSide) => {
    setSelectedSide(side);
  };

  const handleEnterDebate = () => {
    setHasJoined(true);
    setShowLiveView(true);
  };

  if (showLiveView) {
     return (
        <View className="flex-1 bg-slate-900">
           <Stack.Screen options={{ headerShown: false }} />
           <SafeAreaView className="flex-1">
              {/* Live Room Header */}
              <View className="px-4 py-3 flex-row items-center justify-between border-b border-slate-800">
                 <TouchableOpacity onPress={() => setShowLiveView(false)} className="p-2 rounded-full bg-slate-800">
                    <ArrowLeft size={20} color="white" />
                 </TouchableOpacity>
                 <View className="flex-row items-center gap-2">
                    <View className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <Text className="text-white font-bold">LIVE</Text>
                 </View>
                 <View className="flex-row gap-2">
                    <View className="px-2 py-1 bg-slate-800 rounded flex-row items-center gap-1">
                       <Users size={12} color="#94a3b8" />
                       <Text className="text-slate-400 text-xs">142</Text>
                    </View>
                 </View>
              </View>

              {/* Video Area */}
              <View className="flex-1 justify-center items-center">
                 <View className="w-full aspect-video bg-black items-center justify-center">
                    <Video size={48} color="#475569" />
                    <Text className="text-slate-500 mt-2">Waiting for stream...</Text>
                 </View>
              </View>

              {/* Bottom Controls */}
              <View className="p-4 flex-row justify-around bg-slate-900 border-t border-slate-800">
                 <TouchableOpacity className="items-center gap-1">
                    <View className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center">
                        <MessageSquare size={20} color="white" />
                    </View>
                    <Text className="text-xs text-slate-400">Chat</Text>
                 </TouchableOpacity>
                 <TouchableOpacity className="items-center gap-1">
                    <View className="w-12 h-12 rounded-full bg-red-500 items-center justify-center shadow-lg shadow-red-500/20">
                        <BellRing size={24} color="white" />
                    </View>
                    <Text className="text-xs text-slate-400">Buzz</Text>
                 </TouchableOpacity>
                 <TouchableOpacity className="items-center gap-1">
                    <View className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center">
                        <ThumbsUp size={20} color="white" />
                    </View>
                    <Text className="text-xs text-slate-400">Vote</Text>
                 </TouchableOpacity>
              </View>
           </SafeAreaView>
        </View>
     )
  }

  return (
    <View className="flex-1 bg-slate-50">
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1" edges={['top']}>
        
        {/* Header */}
        <View className="px-4 py-3 flex-row items-center justify-between bg-white border-b border-slate-200">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-slate-100">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="font-semibold text-slate-900">Debate Room</Text>
          <TouchableOpacity 
            className="p-2 -mr-2 rounded-full active:bg-slate-100"
            onPress={() => setIsShareVisible(true)}
          >
            <Share2 size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

          {/* Header Status & Title (Matches "Waiting for Participants") */}
          <View className="items-center mb-6">
             <View className="bg-yellow-100 px-3 py-1 rounded-full mb-3">
               <Text className="text-yellow-800 text-xs font-bold uppercase tracking-wider">
                 {room.status === DebateStatus.WAITING ? "Waiting for Participants" : room.status}
               </Text>
             </View>
             <Text className="text-2xl font-bold text-slate-900 text-center leading-tight mb-2">
               {room.topic}
             </Text>
             <Text className="text-slate-500 text-sm text-center">
               Scheduled
             </Text>
             <Text className="text-slate-900 font-semibold text-lg text-center mb-4">
                {new Date(room.scheduledAt!).toLocaleString()}
             </Text>
             
             <View className="flex-row items-center justify-center gap-2 mb-2">
                <Text className="text-slate-500 text-xs uppercase tracking-wider font-bold">Turn Duration</Text>
             </View>
             <Text className="text-slate-900 font-semibold text-base text-center mb-6">
                {room.turnDurationSeconds}s per turn
             </Text>

             {/* Host Info Centered */}
             <View className="items-center">
                 <Text className="text-slate-400 text-xs font-medium mb-2">Hosted by</Text>
                 <View className="flex-row items-center bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                    <Image source={{ uri: room.host.avatar }} className="w-6 h-6 rounded-full mr-2 bg-slate-200" />
                    <Text className="text-slate-700 font-semibold">{room.host.name}</Text>
                 </View>
                 {/* Connected Badge */}
                 <View className="mt-3 bg-green-100 px-3 py-1 rounded-full flex-row items-center border border-green-200">
                    <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                    <Text className="text-green-700 text-xs font-bold">Connected</Text>
                 </View>
             </View>
          </View>

          {/* Teams Grid (Matches "FOR 0/3 ... AGAINST 0/3") */}
          <View className="flex-row gap-4 mb-8">
             {/* FOR Team */}
             <View className="flex-1 bg-white rounded-xl border border-green-100 p-4 shadow-sm">
                <View className="flex-row justify-between items-center mb-2">
                   <Text className="font-bold text-green-700">FOR</Text>
                   <Text className="text-xs font-mono text-green-600 city-font">{forTeam?.participants.length}/{room.maxParticipants}</Text>
                </View>
                <View className="flex-1 items-center justify-center min-h-[60px]">
                   {forTeam?.participants.length === 0 ? (
                      <Text className="text-slate-400 text-xs text-center italic">No participants yet</Text>
                   ) : (
                      <Text> participants list </Text>
                   )}
                </View>
             </View>

             {/* AGAINST Team */}
             <View className="flex-1 bg-white rounded-xl border border-red-100 p-4 shadow-sm">
                <View className="flex-row justify-between items-center mb-2">
                   <Text className="font-bold text-red-700">AGAINST</Text>
                   <Text className="text-xs font-mono text-red-600">{againstTeam?.participants.length}/{room.maxParticipants}</Text>
                </View>
                <View className="flex-1 items-center justify-center min-h-[60px]">
                   {againstTeam?.participants.length === 0 ? (
                      <Text className="text-slate-400 text-xs text-center italic">No participants yet</Text>
                   ) : (
                      <Text> participants list </Text>
                   )}
                </View>
             </View>
          </View>

          {/* Join / Status Actions */}
          <View className="mb-8 space-y-4">
             {/* Join Debate Card */}
             <View className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <Text className="font-bold text-lg text-slate-900 mb-2">Join this Debate</Text>
                
                {/* Conditional Time Warning */}
                <View className="bg-red-50 border border-red-100 rounded-lg p-3 flex-row items-start mb-4">
                   <AlertCircle size={16} color="#ef4444" className="mt-0.5 mr-2" />
                   <View className="flex-1">
                      <Text className="text-red-700 font-medium text-sm">The scheduled time has passed. Joining is no longer available.</Text>
                      <Text className="text-red-600 text-xs mt-1">Joining is closed after the scheduled time</Text>
                   </View>
                </View>
             </View>

             {/* Enter Room Card */}
             <View className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <Text className="font-bold text-lg text-slate-900 mb-1">Enter Debate Room</Text>
                <Text className="text-slate-500 text-sm mb-4">Enter the debate room to join the video call and wait for the debate to start.</Text>
                
                <TouchableOpacity 
                   className="w-full bg-green-600 py-3 rounded-lg flex-row items-center justify-center shadow-md shadow-green-200"
                   onPress={handleEnterDebate}
                >
                   <Play size={16} color="white" className="mr-2 fill-current" />
                   <Text className="text-white font-bold">Enter Debate Room</Text>
                </TouchableOpacity>
             </View>
          </View>

          {/* Debate Details / Side Panel Info */}
          <View className="space-y-4">
             {/* Main Details Card */}
             <View className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-indigo-500">
                <View className="px-5 py-4 border-b border-slate-100 flex-row justify-between items-center">
                   <Text className="font-bold text-slate-900">Debate Details</Text>
                   <View className="bg-emerald-100 px-2 py-0.5 rounded text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                      Open
                   </View>
                </View>
                
                <View className="p-5 space-y-4">
                   {/* Participants Row */}
                   <View className="flex-row justify-between items-center border-b border-slate-50 pb-3">
                      <View className="flex-row items-center text-slate-500">
                         <Users size={16} className="mr-2 text-slate-400" />
                         <Text className="text-sm font-medium text-slate-600">Participants</Text>
                      </View>
                      <Text className="font-mono font-bold text-slate-900">{totalParticipants} / {room.maxParticipants * 2}</Text>
                   </View>

                   {/* Warning Status */}
                   <View className="bg-red-50 border border-red-100 rounded p-2">
                      <Text className="text-red-800 text-xs font-bold mb-1">Scheduled time passed</Text>
                      <Text className="text-slate-600 text-xs mb-1">{new Date(room.scheduledAt!).toLocaleString()}</Text>
                      <Text className="text-red-600 text-[10px]">Joining is no longer available</Text>
                   </View>
                   
                   <Text className="text-center text-xs text-slate-400 italic pt-2">Join the debate to see actions</Text>

                   <TouchableOpacity 
                      className="w-full border border-slate-200 rounded-lg py-2 flex-row items-center justify-center mt-2"
                      onPress={() => setIsShareVisible(true)}
                   >
                      <Share2 size={14} color="#64748b" className="mr-2" />
                      <Text className="text-slate-600 font-semibold text-sm">Share</Text>
                   </TouchableOpacity>
                </View>
             </View>
             
             {/* Moderators Card */}
             <View className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <View className="flex-row items-center mb-4 text-slate-400">
                   <Shield size={16} className="mr-2 text-slate-400" />
                   <Text className="font-bold text-slate-500 text-xs uppercase tracking-wider">Moderators</Text>
                </View>
                {room.moderators.map((mod, idx) => (
                   <View key={idx} className="flex-row items-center gap-3">
                      <Image source={{ uri: mod.user.avatar || 'https://i.pravatar.cc/150?u=h1' }} className="w-8 h-8 rounded-full bg-slate-200" />
                      <Text className="font-semibold text-slate-700">{mod.user.name}</Text>
                      {mod.isHost && <Crown size={14} color="#ca8a04" />}
                   </View>
                ))}
             </View>

             {/* Room Settings Card */}
             <View className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-8">
                <Text className="font-bold text-slate-900 mb-4">Room Settings</Text>
                <View className="space-y-3">
                   <View className="flex-row justify-between">
                      <Text className="text-slate-500 text-sm">Scheduled</Text>
                      <Text className="text-slate-900 text-sm font-medium">{new Date(room.scheduledAt!).toLocaleString()}</Text>
                   </View>
                   <View className="flex-row justify-between">
                      <Text className="text-slate-500 text-sm">Turn Duration</Text>
                      <Text className="text-slate-900 text-sm font-medium">{room.turnDurationSeconds}s</Text>
                   </View>
                   <View className="flex-row justify-between">
                      <Text className="text-slate-500 text-sm">Prep Time</Text>
                      <Text className="text-slate-900 text-sm font-medium">30s</Text>
                   </View>
                   <View className="flex-row justify-between">
                      <Text className="text-slate-500 text-sm">Turn Order</Text>
                      <Text className="text-slate-900 text-sm font-medium">FIFO</Text>
                   </View>
                   <View className="flex-row justify-between">
                      <Text className="text-slate-500 text-sm">Max per Team</Text>
                      <Text className="text-slate-900 text-sm font-medium">{room.maxParticipants}</Text>
                   </View>
                </View>
             </View>
          </View>


        </ScrollView>

        <ShareSheet
          visible={isShareVisible}
          onClose={() => setIsShareVisible(false)}
          url={`https://webyalaya.com/debate-room/${id}`}
          title={room.topic}
          message={`Check out this debate: ${room.topic}`}
        />
      </SafeAreaView>
    </View>
  );
}
