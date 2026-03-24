import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { cn } from '../../lib/utils';
import { Users, Clock, Calendar, Share2, Plus } from 'lucide-react-native';

export interface PublicUser {
  id: string;
  name?: string;
  username?: string;
  avatar?: string;
}

export type SessionStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

export interface StudyRoomCardProps {
  id: string;
  title: string;
  description?: string;
  sessionStatus: SessionStatus;
  date: string | Date;
  duration: number;
  maxParticipants: number;
  joiningFee: number;
  participantCount: number;
  createdBy: PublicUser;
  skills: string[];
  onPress?: () => void;
}

export function StudyRoomCard({
  title,
  date,
  duration,
  maxParticipants,
  participantCount,
  createdBy,
  skills,
  onPress,
}: StudyRoomCardProps) {

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });

  return (
    <View className="bg-white border border-emerald-100 rounded-2xl p-5 w-full shadow-sm mb-4">
      
      {/* Top Header: Tag + Status */}
      <View className="flex-row justify-between items-center mb-4">
        <View className="bg-emerald-100/50 px-3 py-1 rounded-full">
           <Text className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
             {skills[0] || "STUDY SESSION"}
           </Text>
        </View>
        <View className="flex-row items-center">
           <View className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
           <Text className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
             SCHEDULED
           </Text>
        </View>
      </View>

      {/* Title */}
      <Text className="text-xl font-bold text-slate-900 mb-4 leading-tight">
        {title}
      </Text>

      {/* Date & Time Pills */}
      <View className="flex-row flex-wrap gap-2 mb-6">
         <View className="bg-blue-50/80 px-3 py-1.5 rounded-lg flex-row items-center border border-blue-100">
            <Clock size={14} className="text-slate-500 mr-2" />
            <Text className="text-xs font-medium text-slate-600">{formattedDate}</Text>
         </View>
         <View className="bg-blue-50/80 px-3 py-1.5 rounded-lg flex-row items-center border border-blue-100">
            <Clock size={14} className="text-slate-500 mr-2" />
            <Text className="text-xs font-medium text-slate-600">{duration} min</Text>
         </View>
      </View>

      {/* Divider */}
      <View className="h-[1px] bg-slate-100 w-full mb-4" />

      {/* Footer: User + Actions */}
      <View className="flex-row justify-between items-center">
         <View className="flex-row items-center">
             <View className="h-10 w-10 rounded-full bg-yellow-100 border-2 border-white items-center justify-center mr-3 relative overflow-hidden">
                 {createdBy.avatar ? (
                    <Image source={{ uri: createdBy.avatar }} className="w-full h-full" resizeMode="cover" />
                 ) : (
                    <Text className="font-bold text-yellow-700">{createdBy.name?.[0]}</Text>
                 )}
                 {/* Online Dot */}
                 <View className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-white z-10" />
             </View>
             
             <View>
                 <Text className="text-sm font-bold text-slate-900">{createdBy.name}</Text>
                 <Text className="text-xs text-slate-500">Host</Text>
             </View>
         </View>
         
         <TouchableOpacity 
            onPress={onPress}
            className="bg-slate-900 px-5 py-2.5 rounded-xl shadow-lg shadow-slate-200"
         >
            <Text className="text-white font-bold text-xs tracking-wide">JOIN ROOM</Text>
         </TouchableOpacity>
      </View>
    </View>
  );
}
