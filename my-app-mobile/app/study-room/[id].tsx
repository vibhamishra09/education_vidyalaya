import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Clock, Users, Video, Globe, Shield, MessageSquare, Share2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShareSheet } from '../../components/ui/share-sheet';
import { useState } from 'react';

export default function StudyRoomDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [shareSheetVisible, setShareSheetVisible] = useState(false);

  // Mock Data - In real app, fetch using id
  const room = {
    id: id,
    title: "Webyalaya Brainstorm",
    description: "Join us for a brainstorming session on the future of web development. We will discuss new technologies, frameworks, and best practices.",
    sessionStatus: "UPCOMING",
    date: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    duration: 60,
    maxParticipants: 50,
    participantCount: 12,
    createdBy: { 
        id: "u1", 
        name: "Sachin anand", 
        avatar: "https://i.pravatar.cc/150?u=u1",
        bio: "Senior Frontend Engineer | React Enthusiast"
    },
    skills: ["BRAINSTORMING", "REACT", "NEXTJS"],
    hostAvgRating: 4.8,
    hostTotalSessions: 42
  };

  const formattedDate = new Date(room.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1">
        
        {/* Header Image / Gradient */}
        <View className="h-48 w-full bg-slate-900 relative">
             <LinearGradient
                colors={['#0f172a', '#1e293b']}
                className="absolute inset-0"
             />
             <View className="absolute top-4 left-4 z-10">
                <TouchableOpacity onPress={() => router.back()} className="bg-white/20 p-2 rounded-full backdrop-blur-md">
                    <ArrowLeft size={24} color="white" />
                </TouchableOpacity>

             <View className="absolute top-4 right-4 z-10">
                <TouchableOpacity onPress={() => setShareSheetVisible(true)} className="bg-white/20 p-2 rounded-full backdrop-blur-md">
                    <Share2 size={24} color="white" />
                </TouchableOpacity>
             </View>
             </View>
             
             {/* Abstract Background Decoration */}
             <View className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
             <View className="absolute top-10 left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />
             
             <View className="absolute bottom-6 left-6 right-6">
                <View className="flex-row gap-2 mb-2">
                    {room.skills.map(skill => (
                        <View key={skill} className="bg-white/10 px-2 py-1 rounded border border-white/20">
                            <Text className="text-white/80 text-[10px] font-bold">{skill}</Text>
                        </View>
                    ))}
                </View>
                <Text className="text-white text-2xl font-bold leading-tight">{room.title}</Text>
             </View>
        </View>

        <View className="p-6">
            
            {/* Host Info */}
            <TouchableOpacity className="flex-row items-center mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <Image source={{ uri: room.createdBy.avatar }} className="w-12 h-12 rounded-full mr-4" />
                <View className="flex-1">
                    <Text className="text-sm text-slate-500 font-medium">Hosted by</Text>
                    <Text className="text-base font-bold text-slate-900">{room.createdBy.name}</Text>
                </View>
                <View className="bg-yellow-100 px-3 py-1 rounded-full">
                    <Text className="text-yellow-700 font-bold text-xs">★ {room.hostAvgRating}</Text>
                </View>
            </TouchableOpacity>

            {/* Session Details Grid */}
            <View className="flex-row flex-wrap gap-4 mb-8">
                <View className="w-[47%] bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <Calendar size={20} className="text-blue-500 mb-2" color="#3b82f6" />
                    <Text className="text-slate-400 text-xs font-bold uppercase mb-1">Date & Time</Text>
                    <Text className="text-slate-900 font-medium text-sm">Today, 4:00 PM</Text>
                </View>
                <View className="w-[47%] bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <Clock size={20} className="text-purple-500 mb-2" color="#a855f7" />
                    <Text className="text-slate-400 text-xs font-bold uppercase mb-1">Duration</Text>
                    <Text className="text-slate-900 font-medium text-sm">{room.duration} Minutes</Text>
                </View>
                 <View className="w-[47%] bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <Users size={20} className="text-emerald-500 mb-2" color="#10b981" />
                    <Text className="text-slate-400 text-xs font-bold uppercase mb-1">Participants</Text>
                    <Text className="text-slate-900 font-medium text-sm">{room.participantCount} / {room.maxParticipants} Joined</Text>
                </View>
                 <View className="w-[47%] bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <Globe size={20} className="text-orange-500 mb-2" color="#f97316" />
                    <Text className="text-slate-400 text-xs font-bold uppercase mb-1">Language</Text>
                    <Text className="text-slate-900 font-medium text-sm">English</Text>
                </View>
            </View>

            {/* Description */}
            <View className="mb-8">
                <Text className="text-lg font-bold text-slate-900 mb-3">About this session</Text>
                <Text className="text-slate-600 leading-6">{room.description}</Text>
            </View>

            {/* Quick Guidelines */}
            <View className="bg-blue-50 p-5 rounded-2xl mb-24">
                <Text className="text-blue-800 font-bold mb-3 flex-row items-center">
                    <Shield size={16} color="#1e40af" /> Session Guidelines
                </Text>
                <View className="space-y-2">
                    <Text className="text-blue-700/80 text-sm">• Be respectful to all participants</Text>
                    <Text className="text-blue-700/80 text-sm">• Keep your mic muted when not speaking</Text>
                    <Text className="text-blue-700/80 text-sm">• Use the "Rasie Hand" feature to speak</Text>
                </View>
            </View>

        </View>
      </ScrollView>

      {/* Sticky Bottom Join Button */}
      <View className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-100 shadow-lg">
        <TouchableOpacity 
            onPress={() => router.push(`/live-session/${id}`)}
            className="w-full bg-slate-900 py-4 rounded-xl flex-row justify-center items-center shadow-md shadow-slate-300"
        >
            <Video size={20} color="white" className="mr-2" />
            <Text className="text-white font-bold text-lg ml-2">Join Video Room</Text>
        </TouchableOpacity>
      </View>

      <ShareSheet
        visible={shareSheetVisible} 
        onClose={() => setShareSheetVisible(false)} 
        title={room.title}
        url={`https://myapp.com/study-room/${room.id}`}
        message={`Join this study room: ${room.title}`}
      />

    </SafeAreaView>
  );
}
