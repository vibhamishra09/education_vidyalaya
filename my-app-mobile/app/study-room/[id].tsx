import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Clock, Users, Video, Globe, Shield, MessageSquare, Share2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShareSheet } from '../../components/ui/share-sheet';
import { getErrorMessage } from '../../lib/api';
import { useApi } from '../../lib/use-api';
import { useBackendUser } from '../../lib/backend-user-context';

type StudyRoomDetails = {
  id: string;
  title: string;
  description?: string | null;
  sessionStatus: 'UPCOMING' | 'ONGOING' | 'DONE' | 'CANCELLED';
  date: string;
  duration: number;
  maxParticipants: number;
  participantCount: number;
  timezone?: string;
  createdBy: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  skills: Array<{ id: string; name: string }> | string[];
  hostAvgRating?: number | null;
  hostTotalSessions?: number;
};

export default function StudyRoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { request } = useApi();
  const { ready: backendReady } = useBackendUser();

  const [room, setRoom] = useState<StudyRoomDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);

  useEffect(() => {
    let active = true;

    const loadRoom = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await request<StudyRoomDetails>(`/api/study-rooms/${id}`);
        if (!active) {
          return;
        }
        setRoom(data);
      } catch (err) {
        if (!active) {
          return;
        }
        setError(getErrorMessage(err, 'Unable to load this study room.'));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (id) {
      void loadRoom();
    }

    return () => {
      active = false;
    };
  }, [id, request]);

  const handleJoin = async () => {
    if (!isSignedIn) {
      router.push({
        pathname: '/sign-in',
        params: { redirectTo: `/study-room/${id}` },
      });
      return;
    }

    if (!backendReady) {
      Alert.alert('Please wait', 'Your account is still syncing with the backend.');
      return;
    }

    try {
      setJoining(true);
      await request(`/api/study-rooms/${id}/join`, { method: 'POST' }, { auth: true });
      Alert.alert('Joined', 'You have successfully joined this study room.', [
        {
          text: 'Continue',
          onPress: () => router.push(`/live-session/${id}`),
        },
      ]);
    } catch (err) {
      Alert.alert('Could not join', getErrorMessage(err, 'Please try again.'));
    } finally {
      setJoining(false);
    }
  };

  const skillLabels =
    room?.skills?.map((skill) => (typeof skill === 'string' ? skill : skill.name)) || [];

  return (
    <SafeAreaView className="flex-1 bg-white">
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#10b981" />
          <Text className="mt-3 text-slate-500">Loading study room...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center font-semibold text-rose-700">{error}</Text>
        </View>
      ) : room ? (
        <>
          <ScrollView className="flex-1">
            <View className="relative h-48 w-full bg-slate-900">
              <LinearGradient colors={['#0f172a', '#1e293b']} className="absolute inset-0" />
              <TouchableOpacity
                onPress={() => router.back()}
                className="absolute left-4 top-4 z-10 rounded-full bg-white/20 p-2"
              >
                <ArrowLeft size={24} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShareSheetVisible(true)}
                className="absolute right-4 top-4 z-10 rounded-full bg-white/20 p-2"
              >
                <Share2 size={24} color="white" />
              </TouchableOpacity>

              <View className="absolute bottom-6 left-6 right-6">
                <View className="mb-2 flex-row flex-wrap gap-2">
                  {skillLabels.map((skill) => (
                    <View key={skill} className="rounded border border-white/20 bg-white/10 px-2 py-1">
                      <Text className="text-[10px] font-bold text-white/80">{skill}</Text>
                    </View>
                  ))}
                </View>
                <Text className="text-2xl font-bold leading-tight text-white">{room.title}</Text>
              </View>
            </View>

            <View className="p-6">
              <View className="mb-8 flex-row items-center rounded-xl border border-slate-100 bg-slate-50 p-4">
                <Image
                  source={{ uri: room.createdBy.avatar || 'https://github.com/shadcn.png' }}
                  className="mr-4 h-12 w-12 rounded-full bg-slate-200"
                />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-slate-500">Hosted by</Text>
                  <Text className="text-base font-bold text-slate-900">{room.createdBy.name}</Text>
                </View>
                {room.hostAvgRating ? (
                  <View className="rounded-full bg-yellow-100 px-3 py-1">
                    <Text className="text-xs font-bold text-yellow-700">★ {room.hostAvgRating.toFixed(1)}</Text>
                  </View>
                ) : null}
              </View>

              <View className="mb-8 flex-row flex-wrap gap-4">
                <View className="w-[47%] rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <Calendar size={20} color="#3b82f6" />
                  <Text className="mb-1 mt-2 text-xs font-bold uppercase text-slate-400">
                    Date & Time
                  </Text>
                  <Text className="text-sm font-medium text-slate-900">
                    {new Date(room.date).toLocaleString()}
                  </Text>
                </View>

                <View className="w-[47%] rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <Clock size={20} color="#a855f7" />
                  <Text className="mb-1 mt-2 text-xs font-bold uppercase text-slate-400">
                    Duration
                  </Text>
                  <Text className="text-sm font-medium text-slate-900">{room.duration} Minutes</Text>
                </View>

                <View className="w-[47%] rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <Users size={20} color="#10b981" />
                  <Text className="mb-1 mt-2 text-xs font-bold uppercase text-slate-400">
                    Participants
                  </Text>
                  <Text className="text-sm font-medium text-slate-900">
                    {room.participantCount} / {room.maxParticipants} Joined
                  </Text>
                </View>

                <View className="w-[47%] rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <Globe size={20} color="#f97316" />
                  <Text className="mb-1 mt-2 text-xs font-bold uppercase text-slate-400">
                    Timezone
                  </Text>
                  <Text className="text-sm font-medium text-slate-900">
                    {room.timezone || 'Local time'}
                  </Text>
                </View>
              </View>

              {/* Description */}
              <View className="mb-8">
                <Text className="mb-3 text-lg font-bold text-slate-900">About this session</Text>
                <Text className="text-slate-600 leading-6">
                  {room.description || 'No description was provided for this study room.'}
                </Text>
              </View>

              <View className="mb-24 rounded-2xl bg-blue-50 p-5">
                <Text className="mb-3 font-bold text-blue-800">Session Guidelines</Text>
                <Text className="text-sm text-blue-700/80">• Be respectful to all participants</Text>
                <Text className="text-sm text-blue-700/80">• Keep your mic muted when not speaking</Text>
                <Text className="text-sm text-blue-700/80">• Join on time so the session can start smoothly</Text>
              </View>
            </View>
          </ScrollView>
          {/* Sticky Bottom Join Button */}
          <View className="absolute bottom-0 left-0 right-0 border-t border-slate-100 bg-white p-5 shadow-lg">
            <TouchableOpacity
              onPress={() => void handleJoin()}
              disabled={joining}
              className="flex-row items-center justify-center rounded-xl bg-slate-900 py-4 shadow-md shadow-slate-300"
            >
              <Video size={20} color="white" />
              <Text className="ml-2 text-lg font-bold text-white">
                {joining ? 'Joining...' : 'Join Video Room'}
              </Text>
            </TouchableOpacity>
          </View>

          <ShareSheet
            visible={shareSheetVisible}
            onClose={() => setShareSheetVisible(false)}
            title={room.title}
            url={`https://webyalaya.com/study-room/${room.id}`}
            message={`Join this study room: ${room.title}`}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
}
