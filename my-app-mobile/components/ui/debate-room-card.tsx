import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  Users, 
  Swords, 
  Calendar, 
  Clock, 
  Trophy, 
  Play, 
  Share2 
} from 'lucide-react-native';

// Utility for merged Tailwind classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Types based on web app debate-room.types.ts (simplified for mobile frontend)
export enum DebateStatus {
  WAITING = 'WAITING',   // Scheduled
  PREP = 'PREP',         // Live/Prep
  LIVE = 'LIVE',         // Live
  ENDED = 'ENDED',       // Ended
  CANCELLED = 'CANCELLED',
  OPEN = 'OPEN'          // Default/Open
}

export interface DebateParticipant {
    id: string;
    name: string;
    avatar?: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface DebateTeam {
    id: string;
    side: 'FOR' | 'AGAINST';
    participants: DebateParticipant[];
}

export interface DebateRoom {
  id: string;
  topic: string;
  description?: string;
  status: DebateStatus;
  scheduledAt?: string; // ISO string
  turnDurationSeconds: number;
  maxParticipants: number; // For each team? Web logic: maxParticipants * 2 = total
  teams: DebateTeam[];
  host: {
    name: string;
    avatar?: string;
  };
  prizePool?: number;
}

export interface DebateRoomCardProps {
  room: DebateRoom;
  onPress?: () => void;
  onAction?: () => void;
  onShare?: () => void;
}

export function DebateRoomCard({
  room,
  onPress,
  onAction,
  onShare
}: DebateRoomCardProps) {
  if (!room) return null;
  
  // Map status to display labels & logic
  const getStatusDisplay = () => {
    switch (room.status) {
      case DebateStatus.CANCELLED:
        return { label: 'CANCELLED', isLive: false, isEnded: true, isCancelled: true };
      case DebateStatus.WAITING:
        return { label: 'SCHEDULED', isLive: false, isEnded: false, isCancelled: false };
      case DebateStatus.PREP:
      case DebateStatus.LIVE:
        return { label: 'LIVE', isLive: true, isEnded: false, isCancelled: false };
      case DebateStatus.ENDED:
        return { label: 'ENDED', isLive: false, isEnded: true, isCancelled: false };
      default:
        return { label: 'OPEN', isLive: false, isEnded: false, isCancelled: false };
    }
  };

  const statusDisplay = getStatusDisplay();
  const { isLive, isEnded, isCancelled } = statusDisplay;

  // Participant Counts
  const forTeam = room.teams?.find(t => t.side === 'FOR');
  const againstTeam = room.teams?.find(t => t.side === 'AGAINST');
  
  const forCount = forTeam?.participants.length || 0; 
  const againstCount = againstTeam?.participants.length || 0;
  
  const totalParticipants = forCount + againstCount;
  const maxTotalParticipants = room.maxParticipants ? room.maxParticipants * 2 : 0;
  const hostInitial = room.host?.name?.charAt(0) || "U";
  
  // Format Date (Simple)
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString(); 
  };
  const formattedDate = formatDate(room.scheduledAt);

  // Theme Constants based on Status
  const getTheme = () => {
    if (isCancelled) return {
      borderColor: 'border-red-200',
      badgeBg: 'bg-red-50',
      badgeText: 'text-red-700',
      dotColor: 'bg-red-500', 
      buttonBg: 'bg-red-50',
      buttonText: 'text-red-700'
    };
    if (isLive) return {
      borderColor: 'border-red-200',
      badgeBg: 'bg-red-50',
      badgeText: 'text-red-700',
      dotColor: 'bg-red-500',
      buttonBg: 'bg-red-50',
      buttonText: 'text-red-700'
    };
    if (isEnded) return {
      borderColor: 'border-zinc-200',
      badgeBg: 'bg-zinc-100',
      badgeText: 'text-zinc-500',
      dotColor: 'bg-zinc-400',
      buttonBg: 'bg-zinc-100',
      buttonText: 'text-zinc-500'
    };
    // Default / Open / Scheduled
    return {
      borderColor: 'border-emerald-200',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-700',
      dotColor: 'bg-emerald-500',
      buttonBg: 'bg-emerald-50',
      buttonText: 'text-emerald-700'
    };
  };

  const theme = getTheme();

  return (
    <TouchableOpacity 
      activeOpacity={0.9}
      onPress={onPress}
      className={cn(
        "bg-white dark:bg-zinc-900 rounded-xl border p-4 shadow-sm mb-3",
        theme.borderColor
      )}
    >
      {/* Header: Badge & Status */}
      <View className="flex-row items-center justify-between mb-3">
        <View className={cn("px-2 py-1 rounded-md flex-row items-center", theme.badgeBg)}>
           <Swords size={12} color={isEnded ? '#71717a' : isLive || isCancelled ? '#b91c1c' : '#047857'} />
           <Text className={cn("text-[10px] font-bold ml-1 uppercase tracking-wider", theme.badgeText)}>
              Debate
           </Text>
        </View>

        <View className="flex-row items-center gap-1.5">
           {isLive && (
             <View className="w-2 h-2 rounded-full bg-red-500 absolute -left-3" /> // animate-pulse not available in nativewind without config
           )}
           <View className={cn("w-2 h-2 rounded-full", theme.dotColor)} />
           <Text className={cn("text-[10px] font-extrabold tracking-widest uppercase", theme.badgeText)}>
              {statusDisplay.label}
           </Text>
        </View>
      </View>

      {/* Main Content */}
      <View className="mb-4 space-y-2">
         <Text className="text-lg font-bold text-zinc-900 dark:text-white leading-tight" numberOfLines={2}>
            {room.topic}
         </Text>
         {room.description ? (
            <Text className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed" numberOfLines={2}>
              {room.description}
            </Text>
         ) : null}

         {/* Meta Info Row */}
         <View className="flex-row flex-wrap gap-2 mt-2">
            {(formattedDate) && (
                 <View className="flex-row items-center bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700">
                    <Calendar size={12} color="#71717a" />
                    <Text className="text-[10px] text-zinc-500 ml-1.5 font-medium">{formattedDate}</Text>
                 </View>
            )}
             {room.turnDurationSeconds > 0 && (
               <View className="flex-row items-center bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700">
                    <Clock size={12} color="#71717a" />
                    <Text className="text-[10px] text-zinc-500 ml-1.5 font-medium">{room.turnDurationSeconds}s turns</Text>
               </View>
             )}
         </View>
         
         {/* Prize Pool */}
         {room.prizePool ? (
            <View className="flex-row items-center bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-md border border-yellow-200 dark:border-yellow-800 self-start mt-1">
              <Trophy size={12} color="#ca8a04" />
              <Text className="text-[10px] text-yellow-700 dark:text-yellow-500 ml-1.5 font-medium">
                 {room.prizePool} Coins Prize Pool
              </Text>
            </View>
         ) : null}
         
         {/* Teams Count */}
         <View className="flex-row items-center gap-4 mt-2">
            <View className="flex-row items-center">
               <Users size={14} color="#2563eb" />
               <Text className="text-[10px] text-blue-600 font-semibold ml-1.5">FOR: {forCount}</Text>
            </View>
            <View className="flex-row items-center">
               <Users size={14} color="#ea580c" />
               <Text className="text-[10px] text-orange-600 font-semibold ml-1.5">AGAINST: {againstCount}</Text>
            </View>
         </View>
      </View>

      {/* Footer */}
      <View className="flex-row items-center justify-between pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800 mt-2">
         {/* Host Info */}
         <View>
            <View className="flex-row items-center mb-1">
               <View className={cn("w-6 h-6 rounded-full items-center justify-center border mr-2 bg-white", theme.borderColor)}>
                  {room.host?.avatar ? (
                     <Image source={{ uri: room.host.avatar }} className="w-full h-full rounded-full" />
                  ) : (
                     <Text className={cn("text-[10px] font-bold", theme.buttonText)}>{hostInitial}</Text>
                  )}
               </View>
               <Text className="text-xs font-semibold text-zinc-500 max-w-[100px]" numberOfLines={1}>
                 {room.host?.name}
               </Text>
            </View>
            <View className="flex-row items-center pl-1">
                <Users size={12} color="#a1a1aa" />
                <Text className="text-[10px] font-bold text-zinc-400 ml-1">
                   {totalParticipants}/{maxTotalParticipants} joined
                </Text>
            </View>
         </View>

         {/* Actions */}
         <View className="flex-row items-center gap-2">
            <TouchableOpacity 
               className="p-2 rounded-full bg-zinc-50 dark:bg-zinc-800"
               onPress={(e) => {
                  e.stopPropagation();
                  onShare?.();
               }}
            >
               <Share2 size={16} color="#a1a1aa" />
            </TouchableOpacity>
            
            <TouchableOpacity 
               onPress={(e) => {
                  e.stopPropagation();
                  onAction?.();
               }}
               className={cn("flex-row items-center px-4 py-2 rounded-full shadow-sm border", theme.buttonBg, theme.borderColor)}
            >
               {isLive ? <Play size={12} color={isEnded ? '#71717a' : '#b91c1c'} className="mr-1.5 fill-current" /> : <Calendar size={12} color={isEnded ? '#71717a' : '#047857'} className="mr-1.5" />}
               <Text className={cn("text-xs font-bold ml-1.5", theme.buttonText)}>
                  {isLive ? 'Join' : isEnded ? 'Results' : 'Join'}
               </Text>
            </TouchableOpacity>
         </View>
      </View>
    </TouchableOpacity>
  );
}
