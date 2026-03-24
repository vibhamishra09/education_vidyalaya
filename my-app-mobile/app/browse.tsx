import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ChevronRight, Menu, Search, Swords } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PeerCard } from '../components/cards/PeerCard';
import { StudyRoomCard } from '../components/ui/study-room-card';
import { useSidebar } from '../lib/SidebarContext';
import { getErrorMessage } from '../lib/api';
import { useApi } from '../lib/use-api';
import { ApiPeer, ApiStudyRoom, BrowseResponse } from '../types/api';

function cn(...inputs: Array<string | undefined | null | false>) {
  return twMerge(clsx(inputs));
}

export default function BrowseScreen() {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const { request } = useApi();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'peers' | 'studyRooms'>('peers');
  const [peers, setPeers] = useState<ApiPeer[]>([]);
  const [studyRooms, setStudyRooms] = useState<ApiStudyRoom[]>([]);
  const [counts, setCounts] = useState({ peers: 0, studyRooms: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const timer = setTimeout(() => {
      const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
          const search = searchQuery.trim();
          const [peerResponse, roomResponse] = await Promise.all([
            request<BrowseResponse>(
              `/api/browse?tab=peers&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`,
            ),
            request<BrowseResponse>(
              `/api/browse?tab=studyRooms&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`,
            ),
          ]);

          if (!active) {
            return;
          }

          setPeers(peerResponse.peers || []);
          setStudyRooms(roomResponse.studyRooms || []);
          setCounts({
            peers: peerResponse.counts?.peers || 0,
            studyRooms: roomResponse.counts?.studyRooms || 0,
          });
        } catch (err) {
          if (!active) {
            return;
          }

          setError(getErrorMessage(err, 'Unable to load browse results.'));
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void loadData();
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [request, searchQuery]);

  const peerCards = useMemo(
    () =>
      peers.map((peer) => ({
        ...peer,
        skills: peer.skills.map((skill, index) => ({ id: `${peer.id}-${index}`, name: skill })),
      })),
    [peers],
  );

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

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="relative px-4 py-3">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={openSidebar}
              className="z-10 -ml-2 h-10 w-10 items-center justify-center rounded-full"
              hitSlop={8}
            >
              <Menu size={24} color="#0f172a" />
            </TouchableOpacity>

            <View className="h-10 w-10 items-center justify-center">
              <Image source={{ uri: "https://github.com/shadcn.png" }} className="h-8 w-8 rounded-full" />
            </View>
          </View>

          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text className="text-xl font-bold text-slate-900">Browse</Text>
          </View>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 80 }}>
          {/* Header Section */}
          <View className="px-4 pt-4 pb-2">
            <Text className="mb-1 text-3xl font-extrabold text-zinc-900">
              Browse Community
            </Text>
            <Text className="mb-6 text-base leading-6 text-zinc-500">
              Discover peers and study rooms to learn and grow together.
            </Text>
            {/* Search Bar */}
            <View className="mb-6 h-12 flex-row items-center rounded-2xl border border-zinc-200 bg-zinc-100 px-4">
              <Search size={18} color="#A1A1AA" />
              <TextInput
                className="ml-3 flex-1 text-base text-zinc-900"
                placeholder="Search by name, topic, or skill..."
                placeholderTextColor="#A1A1AA"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            {/* Debate Rooms Entry */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/debate-room')}
              className="mb-6 flex-row items-center justify-between rounded-2xl border border-purple-100 bg-purple-50 p-4"
            >
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                  <Swords size={20} color="#9333ea" />
                </View>
                <View>
                  <Text className="text-base font-bold text-zinc-900">Debate Rooms</Text>
                  <Text className="text-xs text-zinc-500">Join live discussions and argue big ideas</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#A1A1AA" />
            </TouchableOpacity>
            {/* Tabs */}
            <View className="mb-6 flex-row rounded-2xl bg-zinc-100 p-1">
              <TouchableOpacity
                onPress={() => setActiveTab('peers')}
                className={cn(
                  'flex-1 flex-row items-center justify-center gap-2 rounded-xl py-2.5',
                  activeTab === 'peers' && 'bg-emerald-600 shadow-sm',
                )}
              >
                <Text className={cn(
                  "text-sm font-bold",
                  activeTab === 'peers' ? "text-white" : "text-zinc-500"
                )}>
                  Peers
                </Text>
                <View
                  className={cn(
                    'rounded px-1.5',
                    activeTab === 'peers' ? 'bg-white/20' : 'bg-emerald-100',
                  )}
                >
                  <Text
                    className={cn(
                      'text-[10px] font-bold',
                      activeTab === 'peers' ? 'text-white' : 'text-emerald-700',
                    )}
                  >
                    {counts.peers}
                  </Text>
                </View>
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
                <View
                  className={cn(
                    'rounded px-1.5',
                    activeTab === 'studyRooms' ? 'bg-white/20' : 'bg-emerald-100',
                  )}
                >
                  <Text
                    className={cn(
                      'text-[10px] font-bold',
                      activeTab === 'studyRooms' ? 'text-white' : 'text-emerald-700',
                    )}
                  >
                    {counts.studyRooms}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content Section */}
          <View className="px-4">
            {error ? (
              <View className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 p-4">
                <Text className="font-semibold text-rose-700">{error}</Text>
              </View>
            ) : null}

            {loading ? (
              <View className="items-center py-10">
                <ActivityIndicator color="#10b981" />
                <Text className="mt-3 text-zinc-500">Loading results...</Text>
              </View>
            ) : activeTab === 'peers' ? (
              <View>
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-lg font-bold text-zinc-900">All Peers</Text>
                  <Text className="text-xs font-medium text-emerald-600">
                    {counts.peers} found
                  </Text>
                </View>

                {peerCards.map((peer) => (
                  <PeerCard key={peer.id} peer={peer} />
                ))}

                {peerCards.length === 0 ? (
                  <View className="items-center py-10">
                    <Text className="text-zinc-400">No peers found matching your search.</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View>
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-lg font-bold text-zinc-900">Upcoming Study Rooms</Text>
                  <Text className="text-xs font-medium text-emerald-600">
                    {counts.studyRooms} found
                  </Text>
                </View>

                {studyRooms.map(room => (
                  // Map Browse type to UI component props 
                  <StudyRoomCard
                    key={room.id}
                    id={room.id}
                    title={room.title}
                    description={room.description || undefined}
                    sessionStatus={room.sessionStatus === 'ONGOING' ? 'LIVE' : room.sessionStatus === 'DONE' ? 'COMPLETED' : 'UPCOMING'}
                    date={room.date}
                    duration={room.duration}
                    maxParticipants={room.maxParticipants}
                    participantCount={room.participantCount}
                    joiningFee={room.joiningFee}
                    createdBy={room.createdBy}
                    skills={room.skills}
                    onPress={() =>
                      router.push({ pathname: '/study-room/[id]', params: { id: room.id } })
                    }
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
