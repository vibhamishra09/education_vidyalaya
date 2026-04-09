import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Bell,
  Calendar,
  CheckCircle,
  Coins,
  Flame,
  Menu,
  Plus,
  Star,
  Users,
} from 'lucide-react-native';
import clsx from 'clsx';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@clerk/clerk-expo';
import { useSidebar } from '../lib/SidebarContext';
import { getErrorMessage } from '../lib/api';
import { useApi } from '../lib/use-api';
import { useBackendUser } from '../lib/backend-user-context';
import { useProtectedRoute } from '../lib/use-protected-route';
import {
  DashboardMetric,
  DashboardResponse,
  DashboardSession,
  SessionActivityPoint,
} from '../types/api';

function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  color,
  iconColor,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  iconColor: string;
}) {
  return (
    <View className="bg-white p-4 rounded-xl border border-slate-200 flex-1 shadow-sm min-w-[140px] mr-3">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-xs font-medium text-slate-500 uppercase tracking-wider flex-1 mr-2">{label}</Text>
        <View className={clsx("p-2 rounded-full", color)}>
          <Icon size={16} color={iconColor} />
        </View>
      </View>
      <View>
        <Text className="text-2xl font-bold text-slate-900 mb-1">{value}</Text>
        <Text className="text-xs text-slate-400">{subtext}</Text>
      </View>
    </View>
  );
}

function SessionRow({
  session,
  label,
  onPress,
}: {
  session: DashboardSession;
  label: string;
  onPress?: () => void;
}) {
  const isOngoing = session.sessionStatus === 'ONGOING';

  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center justify-between border-b border-slate-50 py-4 last:border-0"
    >
      <View className="flex-1 pr-3">
        <Text className="text-base font-bold text-slate-900">{session.title}</Text>
        <Text className="mt-1 text-xs text-slate-500">
          {new Date(session.date).toLocaleString()} • {session.duration} min
        </Text>
        <Text className="mt-1 text-xs text-slate-400">{label}</Text>
      </View>
      
      <View className="flex-row items-center gap-2">
        {isOngoing && (
          <View className="rounded-lg bg-emerald-600 px-3 py-1.5 shadow-sm">
            <Text className="text-xs font-bold text-white">Join</Text>
          </View>
        )}
        <View className={clsx("rounded px-2 py-1", isOngoing ? "bg-rose-50" : "bg-slate-100")}>
          <Text className={clsx("text-[10px] font-bold uppercase", isOngoing ? "text-rose-600" : "text-slate-600")}>
            {isOngoing ? 'Live' : session.sessionStatus}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SessionActivityCard({ data }: { data: SessionActivityPoint[] }) {
  const totals = useMemo(() => {
    const learned = data.reduce((sum, point) => sum + point.learned, 0);
    const taught = data.reduce((sum, point) => sum + point.taught, 0);
    const previousHalf = data.slice(0, Math.floor(data.length / 2));
    const currentHalf = data.slice(Math.floor(data.length / 2));
    const previousTotal = previousHalf.reduce(
      (sum, point) => sum + point.learned + point.taught,
      0,
    );
    const currentTotal = currentHalf.reduce(
      (sum, point) => sum + point.learned + point.taught,
      0,
    );
    const trend = previousTotal === 0 ? currentTotal * 100 : ((currentTotal - previousTotal) / previousTotal) * 100;

    return {
      learned,
      taught,
      trend: Number.isFinite(trend) ? Math.round(trend) : 0,
    };
  }, [data]);

  return (
    <View className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
      <Text className="text-lg font-bold text-slate-900">Session Activity</Text>
      <Text className="mt-1 text-xs text-slate-500">
        Your learning journey over the last 30 days
      </Text>

      <View className="mb-6 mt-5 flex-row gap-4">
        <View className="flex-1 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
          <Text className="text-xs text-slate-500">Learned</Text>
          <Text className="text-2xl font-bold text-emerald-600">{totals.learned}</Text>
        </View>
        <View className="flex-1 rounded-lg border border-violet-100 bg-violet-50 p-3">
          <Text className="text-xs text-slate-500">Taught</Text>
          <Text className="text-2xl font-bold text-violet-600">{totals.taught}</Text>
        </View>
        <View className="flex-1 rounded-lg border border-blue-100 bg-blue-50 p-3">
          <Text className="text-xs text-slate-500">Trend</Text>
          <Text className="text-2xl font-bold text-blue-600">{totals.trend}%</Text>
        </View>
      </View>

      {data.length === 0 ? (
        <Text className="py-6 text-center text-slate-400">No activity data to display</Text>
      ) : (
        <View className="flex-row items-end justify-between gap-2">
          {data.slice(-10).map((point) => {
            const value = point.learned + point.taught;
            const height = Math.max(12, value * 14);

            return (
              <View key={point.date} className="flex-1 items-center">
                <View className="h-40 justify-end">
                  <View
                    className="w-4 rounded-t-full bg-emerald-500"
                    style={{ height }}
                  />
                </View>
                <Text className="mt-2 text-[10px] text-slate-400">{point.date}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function findMetric(metrics: DashboardMetric[], name: string) {
  return metrics.find((metric) => metric.name === name)?.value ?? 0;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const { user } = useUser();
  const { request } = useApi();
  const {
    ready: backendReady,
    loading: bootstrapping,
    error: backendError,
    refresh: refreshBackendUser,
  } = useBackendUser();
  const { shouldBlock } = useProtectedRoute(true, '/dashboard');

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [activity, setActivity] = useState<SessionActivityPoint[]>([]);
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Past'>('Upcoming');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRetriedBootstrap, setHasRetriedBootstrap] = useState(false);

  useEffect(() => {
    if (backendReady) {
      setHasRetriedBootstrap(false);
      return;
    }

    if (bootstrapping || !backendError || hasRetriedBootstrap) {
      return;
    }

    setHasRetriedBootstrap(true);
    void refreshBackendUser();
  }, [
    backendError,
    backendReady,
    bootstrapping,
    hasRetriedBootstrap,
    refreshBackendUser,
  ]);

  useEffect(() => {
    let active = true;

    if (!backendReady) {
      return () => {
        active = false;
      };
    }

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const [dashboardData, activityData] = await Promise.all([
          request<DashboardResponse>('/api/dashboard?includeMetrics=true&includeRequests=true&includeSessions=true&includeNotifications=true&includeStreaks=true&includeAchievements=true', undefined, { auth: true }),
          request<SessionActivityPoint[]>('/api/dashboard/session-activity?days=30', undefined, {
            auth: true,
          }),
        ]);

        if (!active) {
          return;
        }

        setDashboard(dashboardData);
        setActivity(activityData);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(getErrorMessage(err, 'Unable to load your dashboard.'));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [backendReady, request]);

    const sessions = 
      activeTab === 'Upcoming'
        ? [
            ...(dashboard?.upcomingSessions || []).map(s => ({ ...s, type: 'peerSession' as const })),
            ...(dashboard?.upcomingStudyRooms || []).map(s => ({ ...s, type: 'studyRoom' as const }))
          ]
        : [
            ...(dashboard?.pastSessions || []).map(s => ({ ...s, type: 'peerSession' as const })),
            ...(dashboard?.pastStudyRooms || []).map(s => ({ ...s, type: 'studyRoom' as const }))
          ];

    const handleSessionPress = (session: DashboardSession & { type: 'peerSession' | 'studyRoom' }) => {
      if (session.type === 'studyRoom') {
        router.push(`/study-room/${session.id}`);
      } else {
        // Peer sessions go direct to live-session, or a feedback page if DONE
        if (session.sessionStatus === 'DONE') {
          router.push(`/session-feedback/${session.id}`);
        } else {
          router.push(`/live-session/${session.id}`);
        }
      }
    };

  const pendingRequests = [...(dashboard?.pendingRequests || []), ...(dashboard?.sentRequests || [])];

  if (shouldBlock) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#10b981" />
        <Text className="mt-3 text-slate-500">Redirecting to sign in...</Text>
      </View>
    );
  }

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

      <SafeAreaView className="flex-1">
        <View className="relative bg-transparent px-4 py-3">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={openSidebar}
              className="z-10 -ml-2 h-10 w-10 items-center justify-center rounded-full"
              hitSlop={8}
            >
              <Menu size={24} color="#0f172a" />
            </TouchableOpacity>
            <View className="h-10 w-10 items-center justify-center">
              <Image source={{ uri: user?.imageUrl }} className="h-8 w-8 rounded-full bg-slate-200" />
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
            <Text className="text-center text-xl font-bold text-slate-900">
              Dashboard
            </Text>
          </View>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          <View className="mb-6 flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-2xl font-bold text-slate-900">
                Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
              </Text>
              <Text className="mt-1 text-slate-500">
                Ready to continue your learning journey?
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/create-study-room')}
              className="flex-row items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 shadow-sm shadow-emerald-200"
            >
              <Plus size={16} color="white" />
              <Text className="text-xs font-bold text-white">Create Room</Text>
            </TouchableOpacity>
          </View>

          {bootstrapping || loading ? (
            <View className="items-center py-10">
              <ActivityIndicator color="#10b981" />
              <Text className="mt-3 text-slate-500">Loading your dashboard...</Text>
            </View>
          ) : null}

          {!bootstrapping && !backendReady && backendError ? (
            <View className="mb-6 rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <Text className="font-semibold text-rose-700">{backendError}</Text>
              <TouchableOpacity
                onPress={() => void refreshBackendUser()}
                className="mt-3 self-start rounded-xl bg-rose-600 px-4 py-2"
              >
                <Text className="font-semibold text-white">Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {error ? (
            <View className="mb-6 rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <Text className="font-semibold text-rose-700">{error}</Text>
            </View>
          ) : null}

          {dashboard ? (
            <>
              <View className="mb-4">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                  <MetricCard
                    label="Sessions Completed"
                    value={`${findMetric(dashboard.metrics, 'Sessions Completed')}`}
                    subtext="Total sessions"
                    icon={CheckCircle}
                    color="bg-emerald-100"
                    iconColor="#059669"
                  />
                  <MetricCard
                    label="Total Earnings"
                    value={`${findMetric(dashboard.metrics, 'Total Earnings')}`}
                    subtext="Coins earned"
                    icon={Coins}
                    color="bg-amber-100"
                    iconColor="#d97706"
                  />
                  <MetricCard
                    label="Average Rating"
                    value={`${findMetric(dashboard.metrics, 'Average Rating')}`}
                    subtext="Out of 5 stars"
                    icon={Star}
                    color="bg-purple-100"
                    iconColor="#9333ea"
                  />
                </ScrollView>
              </View>

              <View className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
                <Text className="mb-4 text-lg font-bold text-slate-900">Your Sessions</Text>

                <View className="mb-6 flex-row border-b border-slate-100">
                  {(['Upcoming', 'Past'] as const).map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      onPress={() => setActiveTab(tab)}
                      className={clsx(
                        'mr-6 border-b-2 pb-3',
                        activeTab === tab ? 'border-slate-900' : 'border-transparent',
                      )}
                    >
                      <Text
                        className={clsx(
                          'font-medium',
                          activeTab === tab ? 'text-slate-900' : 'text-slate-500',
                        )}
                      >
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {sessions.length === 0 ? (
                  <View className="items-center py-8">
                    <Calendar size={24} color="#94a3b8" />
                    <Text className="mt-3 font-medium text-slate-500">
                      No {activeTab.toLowerCase()} sessions
                    </Text>
                  </View>
                ) : (
                  sessions.map((session) => (
                    <SessionRow
                      key={`${activeTab}-${session.id}`}
                      session={session}
                      label={session.peer?.name || session.createdBy?.name || 'Webyalaya'}
                      onPress={() => handleSessionPress(session as any)}
                    />
                  ))
                )}
              </View>

              <View className="mb-8 rounded-xl border border-orange-100 bg-orange-50 p-5">
                <View className="mb-4 flex-row items-start justify-between">
                  <View>
                    <Text className="text-lg font-bold text-orange-900">Streaks</Text>
                    <Text className="mt-1 text-xs text-orange-700">
                      Stay consistent and keep the habit alive.
                    </Text>
                  </View>
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                    <Flame size={20} color="#f97316" />
                  </View>
                </View>

                <View className="flex-row gap-4">
                  <View className="flex-1 rounded-lg border border-orange-100 bg-white p-3">
                    <Text className="mb-1 text-xs font-bold uppercase text-slate-400">Current</Text>
                    <Text className="text-2xl font-bold text-slate-900">
                      {dashboard.streak?.currentStreak || 0}{' '}
                      <Text className="text-sm font-normal text-slate-400">days</Text>
                    </Text>
                  </View>
                  <View className="flex-1 rounded-lg border border-orange-100 bg-white p-3">
                    <Text className="mb-1 text-xs font-bold uppercase text-slate-400">Longest</Text>
                    <Text className="text-2xl font-bold text-slate-900">
                      {dashboard.streak?.longestStreak || 0}{' '}
                      <Text className="text-sm font-normal text-slate-400">days</Text>
                    </Text>
                  </View>
                </View>
              </View>

              <SessionActivityCard data={activity} />

              <View className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
                <Text className="mb-4 text-lg font-bold text-slate-900">Requests</Text>
                {pendingRequests.length === 0 ? (
                  <View className="items-center py-6">
                    <Users size={20} color="#94a3b8" />
                    <Text className="mt-3 font-medium text-slate-500">
                      No pending requests
                    </Text>
                  </View>
                ) : (
                  pendingRequests.map((requestItem) => (
                    <View
                      key={requestItem.id}
                      className="border-b border-slate-50 py-3 last:border-0"
                    >
                      <Text className="font-semibold text-slate-900">{requestItem.title}</Text>
                      <Text className="mt-1 text-xs text-slate-500">
                        {requestItem.direction === 'received' ? 'From' : 'To'}{' '}
                        {requestItem.direction === 'received'
                          ? requestItem.requestedBy.name
                          : requestItem.requestedTo.name}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              <View className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
                <Text className="mb-4 text-lg font-bold text-slate-900">Recent Notifications</Text>
                {(dashboard.notifications || []).length === 0 ? (
                  <View className="items-center py-6">
                    <Bell size={20} color="#94a3b8" />
                    <Text className="mt-3 font-medium text-slate-500">
                      No new notifications
                    </Text>
                  </View>
                ) : (
                  (dashboard.notifications || []).map((notification) => (
                    <View
                      key={notification.id}
                      className="border-b border-slate-50 py-3 last:border-0"
                    >
                      <Text className="font-semibold text-slate-900">
                        {notification.message}
                      </Text>
                      <Text className="mt-1 text-xs text-slate-500">
                        {new Date(notification.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
