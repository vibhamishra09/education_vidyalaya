import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  BookOpen,
  Clock,
  Menu,
  Plus,
  Search,
  Star,
  Trophy,
  Users,
} from 'lucide-react-native';
import { DebateRoom, DebateRoomCard, DebateStatus } from '../components/ui/debate-room-card';
import { ShareSheet } from '../components/ui/share-sheet';
import { StudyRoomCard, StudyRoomCardProps } from '../components/ui/study-room-card';
import { Footer } from '../components/layout/footer';
import { useSidebar } from '../lib/SidebarContext';
import { getErrorMessage } from '../lib/api';
import { useApi } from '../lib/use-api';
import {
  ApiStudyRoom,
  DebateRoomResponse,
  DebateRoomsResponse,
  PlatformStats,
} from '../types/api';

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = screenWidth - 40;

const testimonials = [
  {
    id: 1,
    name: 'Aakash Mishra',
    role: 'Learner',
    rating: 5,
    text: 'Explained in very simple language',
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
  },
  {
    id: 2,
    name: 'Sarah Chen',
    role: 'Computer Science Student',
    rating: 5,
    text: 'Webyalaya has completely transformed how I study. The peer-to-peer learning sessions are incredibly engaging!',
    avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d',
  },
];

const tags = [
  'Join study rooms',
  'Host live sessions',
  'Participate in Debates',
  'Learn with each other',
];

function formatStatValue(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }

  return `${value}`;
}

function mapDebateRoom(room: DebateRoomResponse): DebateRoom {
  return {
    id: room.id,
    topic: room.topic,
    description: room.description || undefined,
    status:
      room.status === 'WAITING'
        ? DebateStatus.WAITING
        : room.status === 'LIVE'
          ? DebateStatus.LIVE
          : room.status === 'PREP'
            ? DebateStatus.PREP
            : room.status === 'CANCELLED'
              ? DebateStatus.CANCELLED
              : DebateStatus.ENDED,
    scheduledAt: room.scheduledAt || undefined,
    turnDurationSeconds: room.turnDurationSeconds,
    maxParticipants: room.maxParticipants,
    teams: room.teams.map((team) => ({
      id: team.id,
      side: team.side,
      participants: team.participants.map((participant) => ({
        id: participant.id,
        name: participant.user.name,
        avatar: participant.user.avatar || undefined,
        status: participant.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
      })),
    })),
    host: {
      name: room.host.name,
      avatar: room.host.avatar || undefined,
    },
  };
}

function mapStudyRoom(room: ApiStudyRoom): StudyRoomCardProps {
  return {
    id: room.id,
    title: room.title,
    description: room.description || undefined,
    sessionStatus:
      room.sessionStatus === 'ONGOING'
        ? 'LIVE'
        : room.sessionStatus === 'DONE'
          ? 'COMPLETED'
          : 'UPCOMING',
    date: room.date,
    duration: room.duration,
    maxParticipants: room.maxParticipants,
    joiningFee: room.joiningFee,
    participantCount: room.participantCount,
    createdBy: room.createdBy,
    skills: room.skills,
  };
}

function StatCard({
  icon: Icon,
  value,
  label,
  suffix = '',
  color,
  iconColor,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  value: string;
  label: string;
  suffix?: string;
  color: string;
  iconColor: string;
}) {
  return (
    <View className="mb-4 w-full flex-row items-center justify-between rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <View>
        <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
          {label}
        </Text>
        <Text className="text-3xl font-extrabold text-slate-900">
          {value}
          <Text className="text-2xl">{suffix}</Text>
        </Text>
      </View>
      <View className={`h-14 w-14 items-center justify-center rounded-full ${color}`}>
        <Icon size={28} color={iconColor} />
      </View>
    </View>
  );
}

function TestimonialCard({ item }: { item: (typeof testimonials)[number] }) {
  return (
    <View style={{ width: cardWidth, marginHorizontal: 10, marginTop: 48, marginBottom: 16 }}>
      <View className="min-h-[240px] rounded-[40px] bg-white px-8 pb-12 pt-24 shadow-sm shadow-slate-200">
        <Text className="text-xl font-bold leading-relaxed tracking-tight text-slate-800">
          "{item.text}"
        </Text>
      </View>

      <View className="absolute -top-8 right-8 h-28 w-28 overflow-hidden rounded-full border-[8px] border-white shadow-sm">
        <Image source={{ uri: item.avatar }} className="h-full w-full bg-slate-200" />
      </View>

      <View className="absolute left-0 top-8 max-w-[65%] shadow-md">
        <View className="rounded-r-full bg-[#3b6ea5] pl-6 pr-4">
          <View className="h-14 flex-row items-center">
            <Text
              className="shrink text-lg font-extrabold tracking-wide text-white"
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <View className="mx-2 h-4 w-px bg-white/20" />
            <View className="flex-row gap-0.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  size={12}
                  fill={index < item.rating ? '#FBBF24' : '#cbd5e1'}
                  color={index < item.rating ? '#FBBF24' : '#cbd5e1'}
                />
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const { request } = useApi();
  const testimonialScrollRef = useRef<ScrollView>(null);

  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [studyRooms, setStudyRooms] = useState<StudyRoomCardProps[]>([]);
  const [debateRooms, setDebateRooms] = useState<DebateRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedDebateRoom, setSelectedDebateRoom] = useState<DebateRoom | null>(null);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [stats, rooms, debates] = await Promise.all([
          request<PlatformStats>('/api/stats/platform'),
          request<{ studyRooms: ApiStudyRoom[] }>('/api/study-rooms?trending=true&limit=4'),
          request<DebateRoomsResponse>('/api/debate-rooms?trending=true&limit=4&sort=hybrid'),
        ]);

        if (!active) {
          return;
        }

        setPlatformStats(stats);
        setStudyRooms((rooms.studyRooms || []).map(mapStudyRoom));
        setDebateRooms((debates.debateRooms || []).map(mapDebateRoom));
      } catch (err) {
        if (!active) {
          return;
        }

        setError(getErrorMessage(err, 'Unable to load the home feed right now.'));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [request]);

  const statsCards = useMemo(() => {
    if (!platformStats) {
      return [];
    }

    return [
      {
        id: 'learners',
        label: 'Learners',
        value: formatStatValue(platformStats.usersOnboarded),
        icon: Users,
        color: 'bg-emerald-100',
        iconColor: '#059669',
      },
      {
        id: 'study-rooms',
        label: 'Study Rooms',
        value: formatStatValue(platformStats.studyRoomsHosted),
        icon: BookOpen,
        color: 'bg-emerald-100',
        iconColor: '#059669',
      },
      {
        id: 'hours',
        label: 'Hours Spent',
        value: formatStatValue(platformStats.learningHours),
        icon: Clock,
        color: 'bg-emerald-100',
        iconColor: '#059669',
      },
      {
        id: 'reviews',
        label: 'Reviews',
        value: formatStatValue(platformStats.reviewsGiven),
        icon: Star,
        color: 'bg-emerald-100',
        iconColor: '#059669',
      },
    ];
  }, [platformStats]);

  return (
    <LinearGradient
      colors={['#ecfdf5', '#f0fdf4', '#f8fafc', '#ffffff']}
      locations={[0, 0.2, 0.5, 1]}
      style={{ flex: 1 }}
    >
      <View className="flex-1">
        <View className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between border-b border-black/5 bg-white/80 px-4 pb-3 pt-12">
          <TouchableOpacity onPress={openSidebar} className="rounded-full bg-slate-100/50 p-2">
            <Menu size={24} color="#0f172a" />
          </TouchableOpacity>

          <View className="pointer-events-none absolute left-0 right-0 top-[52px] items-center justify-center">
            <Image
              source={require('../assets/logo-webyalaya.png')}
              style={{ width: 120, height: 32, resizeMode: 'contain' }}
            />
          </View>

          <View className="w-10" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 80, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-6 items-center bg-transparent px-5 pb-8 pt-4">
            <View className="mb-6 flex-row items-center rounded-full border border-emerald-100 bg-emerald-50 px-4 py-1.5">
              <View className="mr-2 h-2 w-2 rounded-full bg-emerald-500" />
              <Text className="text-xs font-medium text-emerald-700">
                Join the growing Webyalaya community
              </Text>
            </View>

            <View className="mb-6 items-center">
              <Text className="mb-1 text-center text-4xl font-extrabold leading-tight tracking-tight text-slate-900">
                Peer-to-Peer Learning
              </Text>

              <View style={{ height: 60, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                {Platform.OS === 'web' ? (
                  <Text
                    className="text-center text-4xl font-extrabold leading-tight tracking-tight"
                    style={{
                      backgroundImage: 'linear-gradient(to right, #34d399, #3b82f6)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                      WebkitTextFillColor: 'transparent',
                    } as any}
                  >
                    Community
                  </Text>
                ) : (
                  <MaskedView
                    style={{ flex: 1, flexDirection: 'row', height: '100%' }}
                    maskElement={
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Text className="text-center text-4xl font-extrabold leading-tight tracking-tight text-black">
                          Community
                        </Text>
                      </View>
                    }
                  >
                    <LinearGradient
                      colors={['#34d399', '#3b82f6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ flex: 1 }}
                    />
                  </MaskedView>
                )}
              </View>
            </View>

            <View className="mb-8 max-w-lg items-center">
              <Text className="mb-6 px-2 text-center text-base leading-relaxed text-slate-500">
                Welcome to a community-led learning platform where you do not just watch content,
                you <Text className="font-bold text-slate-900">talk, practice, debate,</Text> and{' '}
                <Text className="font-bold text-slate-900">grow</Text> through real conversations.
              </Text>

              <Text className="text-center text-sm italic text-slate-400">
                Because real learning happens when we do it together.
              </Text>
            </View>

            <Text className="mb-4 text-center text-lg font-bold text-slate-900">
              Teach what you know. Learn what you want.
            </Text>

            <View className="mb-8 max-w-sm flex-row flex-wrap justify-center gap-2">
              {tags.map((tag) => (
                <View key={tag} className="rounded-md bg-slate-100 px-3 py-1.5">
                  <Text className="text-xs font-semibold text-slate-600">{tag}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              className="mb-8 w-full max-w-md"
              activeOpacity={0.8}
              onPress={() => router.push('/browse')}
            >
              <View className="h-12 flex-row items-center rounded-xl border border-emerald-200 bg-emerald-50/50 px-4">
                <Search size={20} color="#10b981" />
                <TextInput
                  editable={false}
                  pointerEvents="none"
                  placeholder="Search skills, topics, or peers..."
                  placeholderTextColor="#94a3b8"
                  className="ml-3 flex-1 text-base text-slate-700"
                />
              </View>
            </TouchableOpacity>

            <View className="w-full max-w-md items-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/create-study-room')}
                className="mb-2 h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-200"
              >
                <Plus size={32} color="white" />
              </TouchableOpacity>

              <View className="mb-2 flex-row items-center justify-center gap-1">
                <Text className="text-center text-lg font-bold text-slate-900">
                  Create a Study Room
                </Text>
                <ArrowRight size={20} color="#0f172a" />
              </View>

              <View className="flex-row items-center justify-center space-x-4">
                <View className="flex-row items-center">
                  <Users size={14} color="#3b82f6" />
                  <Text className="ml-1.5 text-xs text-slate-500">Multi-peer</Text>
                </View>
                <View className="flex-row items-center">
                  <Clock size={14} color="#f59e0b" />
                  <Text className="ml-1.5 text-xs text-slate-500">Live Interaction</Text>
                </View>
                <View className="flex-row items-center">
                  <Trophy size={14} color="#10b981" />
                  <Text className="ml-1.5 text-xs text-slate-500">Reward Points</Text>
                </View>
              </View>
            </View>
          </View>

          {loading ? (
            <View className="items-center px-5 py-10">
              <ActivityIndicator color="#10b981" />
              <Text className="mt-3 text-sm text-slate-500">Loading the latest activity...</Text>
            </View>
          ) : null}

          {error ? (
            <View className="mx-5 mb-6 rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <Text className="font-semibold text-rose-700">{error}</Text>
            </View>
          ) : null}

          <View className="px-5 py-8">
            <View className="mb-6 flex-row items-end justify-between">
              <Text className="w-2/3 text-3xl font-extrabold leading-tight text-slate-900">
                Trending Study Rooms
              </Text>
              <TouchableOpacity onPress={() => router.push('/browse')}>
                <Text className="text-sm font-bold text-slate-900">View All</Text>
              </TouchableOpacity>
            </View>
            <Text className="-mt-4 mb-6 text-sm text-slate-500">
              Join active community sessions and learn together.
            </Text>

            <View className="gap-y-4">
              {studyRooms.map((room) => (
                <StudyRoomCard key={room.id} {...room} />
              ))}
              {!loading && studyRooms.length === 0 ? (
                <View className="rounded-2xl border border-dashed border-slate-200 bg-white p-6">
                  <Text className="text-center text-slate-500">
                    No study rooms are available right now.
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View className="px-5 py-12">
            <View className="mb-6 flex-row items-end justify-between">
              <View className="mr-4 flex-1">
                <Text className="text-2xl font-bold text-slate-900">Trending Debate Rooms</Text>
                <Text className="mt-1 text-sm text-slate-500">
                  Engage in meaningful conversations.
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/debate-room')}>
                <Text className="text-sm font-bold text-emerald-600">View All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              {debateRooms.map((room) => (
                <View key={room.id} className="w-[300px]">
                  <DebateRoomCard
                    room={room}
                    onShare={() => setSelectedDebateRoom(room)}
                    onAction={() =>
                      router.push({ pathname: '/debate-room/[id]', params: { id: room.id } })
                    }
                    onPress={() =>
                      router.push({ pathname: '/debate-room/[id]', params: { id: room.id } })
                    }
                  />
                </View>
              ))}
              {!loading && debateRooms.length === 0 ? (
                <View className="w-[300px] rounded-2xl border border-dashed border-slate-200 bg-white p-6">
                  <Text className="text-center text-slate-500">
                    No debate rooms are trending right now.
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          </View>

          <View className="px-5 py-8">
            <Text className="mb-2 text-center text-3xl font-extrabold text-slate-900">
              Growing Together
            </Text>
            <Text className="mb-8 px-4 text-center text-sm text-slate-500">
              Join our thriving community of learners helping each other succeed.
            </Text>

            {statsCards.map((stat) => (
              <StatCard
                key={stat.id}
                icon={stat.icon}
                label={stat.label}
                value={stat.value}
                color={stat.color}
                iconColor={stat.iconColor}
              />
            ))}
          </View>

          <View className="bg-transparent py-12">
            <View className="mb-12 px-5">
              <Text className="mb-2 text-center text-4xl font-extrabold tracking-tight text-slate-900">
                What Our Community Says
              </Text>
              <Text className="text-center text-lg font-medium text-slate-500">
                Real stories from learners who love using Webyalaya
              </Text>
            </View>

            <View className="relative justify-center">
              <TouchableOpacity
                onPress={() => {
                  const newIndex = Math.max(0, currentIndex - 1);
                  setCurrentIndex(newIndex);
                  testimonialScrollRef.current?.scrollTo({
                    x: newIndex * (cardWidth + 20),
                    animated: true,
                  });
                }}
                className="absolute left-2 z-50 h-10 w-10 items-center justify-center rounded-full border border-green-100 bg-white shadow-md"
                style={{ top: '50%', marginTop: -20 }}
              >
                <Text className="pb-1 text-2xl text-green-500">‹</Text>
              </TouchableOpacity>

              <ScrollView
                ref={testimonialScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
                snapToInterval={cardWidth + 20}
                decelerationRate="fast"
                onMomentumScrollEnd={(event) => {
                  const newIndex = Math.round(
                    event.nativeEvent.contentOffset.x / (cardWidth + 20),
                  );
                  setCurrentIndex(newIndex);
                }}
              >
                {testimonials.map((item) => (
                  <TestimonialCard key={item.id} item={item} />
                ))}
              </ScrollView>

              <TouchableOpacity
                onPress={() => {
                  const newIndex = Math.min(testimonials.length - 1, currentIndex + 1);
                  setCurrentIndex(newIndex);
                  testimonialScrollRef.current?.scrollTo({
                    x: newIndex * (cardWidth + 20),
                    animated: true,
                  });
                }}
                className="absolute right-2 z-50 h-10 w-10 items-center justify-center rounded-full border border-green-100 bg-white shadow-md"
                style={{ top: '50%', marginTop: -20 }}
              >
                <Text className="pb-1 text-2xl text-green-500">›</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Footer />
        </ScrollView>

        <ShareSheet
          visible={Boolean(selectedDebateRoom)}
          onClose={() => setSelectedDebateRoom(null)}
          title={selectedDebateRoom?.topic || 'Check out this debate room!'}
          url={`https://webyalaya.com/debate-room/${selectedDebateRoom?.id || ''}`}
        />
      </View>
    </LinearGradient>
  );
}
