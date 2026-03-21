import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Star, Video } from 'lucide-react-native';
import { BrowsePeer } from '../../types/browse';
import { cn } from '../../lib/utils';

interface PeerCardProps {
  peer: BrowsePeer;
  className?: string;
}

export const PeerCard = ({ peer, className }: PeerCardProps) => {
  const router = useRouter();
  
  return (
    <TouchableOpacity 
      onPress={() => router.push(`/profile/${peer.id}` as any)}
      className={cn(
        "bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 mb-3 shadow-sm",
        className
      )}
    >
      <View className="flex-row justify-between mb-3">
        {/* Rating Badge */}
        <View className="flex-row items-center bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">
          <Star color="#FBBF24" fill="#FBBF24" size={12} />
          <Text className="text-xs font-bold ml-1 text-zinc-900 dark:text-zinc-100">
            {peer.rating?.toFixed(1) || "New"}
          </Text>
          {peer.reviewCount ? (
            <Text className="text-[10px] text-zinc-500 ml-1">({peer.reviewCount})</Text>
          ) : null}
        </View>

        {/* Sessions Badge */}
        {peer.totalSessions && peer.totalSessions > 0 ? (
          <View className="flex-row items-center bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
            <Video color="#10B981" size={12} />
            <Text className="text-[10px] text-green-700 dark:text-green-400 ml-1">
              {peer.totalSessions} sessions
            </Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row items-start mb-4">
        {/* Avatar */}
        <View className="h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-800 items-center justify-center overflow-hidden mr-3">
           {peer.avatar ? (
             <Image source={{ uri: peer.avatar }} className="h-full w-full" />
           ) : (
             <Text className="text-lg font-bold text-zinc-500">{peer.name.charAt(0)}</Text>
           )}
        </View>

        <View className="flex-1">
          <Text className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1 leading-tight">
            {peer.name}
          </Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug" numberOfLines={2}>
             {peer.bio || "Ready to learn together"}
          </Text>
        </View>
      </View>

      <View className="h-[1px] bg-zinc-100 dark:bg-zinc-800 mb-3 border-dashed" style={{ borderStyle: 'dashed' }} />

      {/* Skills */}
      <View className="flex-row flex-wrap gap-2">
        {peer.skills.slice(0, 3).map((skill) => (
          <View key={skill.id} className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
            <Text className="text-[10px] text-zinc-600 dark:text-zinc-300 font-medium">{skill.name}</Text>
          </View>
        ))}
        {peer.skills.length > 3 && (
           <View className="bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded-md">
             <Text className="text-[10px] text-zinc-500">+{peer.skills.length - 3}</Text>
           </View>
        )}
      </View>
    </TouchableOpacity>
  );
};
