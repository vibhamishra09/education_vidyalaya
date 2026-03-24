import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, Image, SafeAreaView } from 'react-native';
import { X, Mic, MicOff, Video, VideoOff, MoreVertical, ShieldCheck, User } from 'lucide-react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface Participant {
  id: string;
  name: string;
  isLocal: boolean;
  isSpeaking: boolean;
  isMicOn: boolean;
  isCamOn: boolean;
  avatarUrl?: string;
  role?: 'HOST' | 'COHOST' | 'GUEST';
}

interface MobileParticipantSheetProps {
  visible: boolean;
  onClose: () => void;
  participants: Participant[];
  onMuteParticipant?: (id: string) => void;
  onRemoveParticipant?: (id: string) => void;
  isLocalHost?: boolean;
}

export function MobileParticipantSheet({ 
  visible, 
  onClose, 
  participants, 
  onMuteParticipant, 
  onRemoveParticipant,
  isLocalHost 
}: MobileParticipantSheetProps) {

  const renderParticipant = ({ item }: { item: Participant }) => (
    <View className="flex-row items-center justify-between py-3 border-b border-white/5">
      <View className="flex-row items-center gap-3">
        {/* Avatar */}
        <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center overflow-hidden border border-white/10">
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} className="w-full h-full" />
          ) : (
            <User size={20} color="white" opacity={0.5} />
          )}
        </View>
        
        {/* Name & Role */}
        <View>
          <View className="flex-row items-center gap-1.5">
            <Text className="text-white font-medium text-sm">
              {item.name} {item.isLocal && '(You)'}
            </Text>
            {item.role === 'HOST' && <ShieldCheck size={12} color="#00DC6E" />}
          </View>
          <Text className="text-white/40 text-xs">
            {item.isSpeaking ? 'Speaking...' : item.role || 'Guest'}
          </Text>
        </View>
      </View>

      {/* Status Icons */}
      <View className="flex-row items-center gap-2">
        <View className={cn("p-1.5 rounded-full", item.isMicOn ? "bg-white/5" : "bg-red-500/10")}>
            {item.isMicOn ? <Mic size={14} color="rgba(255,255,255,0.6)" /> : <MicOff size={14} color="#ef4444" />}
        </View>
        <View className={cn("p-1.5 rounded-full", item.isCamOn ? "bg-white/5" : "bg-red-500/10")}>
            {item.isCamOn ? <Video size={14} color="rgba(255,255,255,0.6)" /> : <VideoOff size={14} color="#ef4444" />}
        </View>
        
        {/* Host Controls */}
        {isLocalHost && !item.isLocal && (
            <TouchableOpacity 
                className="p-1.5 ml-1"
                onPress={() => { /* Open action sheet */ }}
            >
                <MoreVertical size={16} color="white" opacity={0.5} />
            </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-[#141414] h-[60%] rounded-t-3xl overflow-hidden border-t border-white/10">
          
          {/* Header */}
          <View className="px-5 py-4 border-b border-white/10 flex-row items-center justify-between">
            <Text className="text-white font-bold text-lg">Participants ({participants.length})</Text>
            <TouchableOpacity onPress={onClose} className="p-2 bg-white/5 rounded-full">
              <X size={16} color="white" />
            </TouchableOpacity>
          </View>

          {/* List */}
          <FlatList
            data={participants}
            renderItem={renderParticipant}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 20 }}
            className="flex-1"
          />
          
        </View>
      </View>
    </Modal>
  );
}
