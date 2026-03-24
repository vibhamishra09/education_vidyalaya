import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, SafeAreaView, ActivityIndicator, Linking } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Edit, Star, Users, Coins, MapPin, Globe, GraduationCap, Github, Linkedin, Twitter, Settings, Menu } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSidebar } from '../lib/SidebarContext';
import { EditProfileModal } from '../components/profile/edit-profile-modal';
import { getErrorMessage } from '../lib/api';
import { useApi } from '../lib/use-api';
import { useBackendUser } from '../lib/backend-user-context';
import { useProtectedRoute } from '../lib/use-protected-route';
import { CurrentUserResponse, PublicUser } from '../types/api';

function SocialIcon({ platform }: { platform: string }) {
  const normalized = platform.toLowerCase();

  if (normalized.includes('github')) {
    return <Github size={16} color="#0f172a" />;
  }

  if (normalized.includes('linkedin')) {
    return <Linkedin size={16} color="#0f172a" />;
  }

  if (normalized.includes('twitter') || normalized.includes('x')) {
    return <Twitter size={16} color="#0f172a" />;
  }

  return <Globe size={16} color="#0f172a" />;
}

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const { openSidebar } = useSidebar();
  const { request } = useApi();
  const {
    ready: backendReady,
    loading: bootstrapping,
    error: backendError,
    isSignedIn,
    refresh: refreshBackendUser,
  } = useBackendUser();

  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const isOwnProfile = !userId;
  const { shouldBlock } = useProtectedRoute(isOwnProfile, '/profile');

  useEffect(() => {
    if (isOwnProfile && !bootstrapping && !backendReady && error === null) {
      setLoading(false);
    }
  }, [backendReady, bootstrapping, error, isOwnProfile]);

  useEffect(() => {
    let active = true;

    if ((isOwnProfile && !isSignedIn) || (isOwnProfile && !backendReady)) {
      return () => {
        active = false;
      };
    }

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!active) {
          return;
        }

        if (isOwnProfile) {
          const result = await request<CurrentUserResponse>('/api/users/me', undefined, {
            auth: true,
          });
          if (!active) {
            return;
          }
          setUser(result.user);
        } else {
          const result = await request<PublicUser>(`/api/users/${userId}`);
          if (!active) {
            return;
          }
          setUser(result);
        }
      } catch (err) {
        if (!active) {
          return;
        }

        setError(getErrorMessage(err, 'Unable to load this profile.'));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [backendReady, isOwnProfile, isSignedIn, request, userId]);

  const totalSessions = useMemo(() => {
    if (!user) {
      return 0;
    }

    return user.publicStats.sessionsTaught + user.publicStats.sessionsAttendedAsLearner;
  }, [user]);

  const handleUpdateUser = async (updatedUser: {
    name: string;
    bio: string;
    hasSkills: string[];
    wantSkills: string[];
    socialLinks: Array<{ platform: string; url: string }>;
  }) => {
    const result = await request<CurrentUserResponse>(
      '/api/users/me',
      {
        method: 'PATCH',
        body: JSON.stringify(updatedUser),
      },
      { auth: true },
    );

    setUser(result.user);
  };

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
      <Stack.Screen
        options={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />

      <LinearGradient
        colors={['#c9fbd7', '#e2fdf0', '#f5fff8']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />

      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity onPress={openSidebar} className="p-2 -ml-2">
            <Menu size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-slate-900">Profile</Text>
          {isOwnProfile ? (
            <TouchableOpacity onPress={() => setIsEditModalVisible(true)} className="p-2">
              <Settings size={24} color="#0f172a" />
            </TouchableOpacity>
          ) : (
            <View className="w-10" />
          )}
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {bootstrapping || loading ? (
            <View className="items-center py-16">
              <ActivityIndicator color="#10b981" />
              <Text className="mt-3 text-slate-500">Loading profile...</Text>
            </View>
          ) : null}

          {!bootstrapping && isOwnProfile && !backendReady ? (
            <View className="mx-4 mt-2 rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <Text className="font-semibold text-rose-700">
                {backendError || 'We signed you in, but could not load your app profile from the backend.'}
              </Text>
              <Text className="mt-2 text-rose-700">
                Please check that the mobile build is pointed at the correct backend and Clerk environment.
              </Text>
              <TouchableOpacity
                onPress={() => void refreshBackendUser()}
                className="mt-3 self-start rounded-xl bg-rose-600 px-4 py-2"
              >
                <Text className="font-semibold text-white">Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {error ? (
            <View className="mx-4 mt-2 rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <Text className="font-semibold text-rose-700">{error}</Text>
            </View>
          ) : null}

          {user ? (
            <>
              <View className="mx-4 mb-6 mt-2 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <View className="flex-row items-start gap-4">
                  <View className="relative">
                    <View className="absolute inset-0 scale-110 rounded-full bg-emerald-100 opacity-50" />
                    <Image
                      source={{ uri: user.avatar || 'https://github.com/shadcn.png' }}
                      className="h-24 w-24 rounded-full border-4 border-white bg-slate-200"
                    />
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-start justify-between">
                      <View className="mr-2 flex-1">
                        <Text className="text-2xl font-bold text-slate-900" numberOfLines={1}>
                          {user.name}
                        </Text>
                        {user.username ? (
                          <Text className="mt-1 font-medium text-slate-500">@{user.username}</Text>
                        ) : null}
                      </View>

                      {isOwnProfile ? (
                        <TouchableOpacity
                          className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1"
                          onPress={() => setIsEditModalVisible(true)}
                        >
                          <View className="flex-row items-center gap-1">
                            <Edit size={14} color="#047857" />
                            <Text className="text-xs font-semibold text-emerald-700">Edit</Text>
                          </View>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View className="mt-6 flex-row flex-wrap gap-3">
                  <View className="flex-row items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5">
                    <Star size={14} color="#f59e0b" fill="#f59e0b" />
                    <Text className="font-bold text-amber-900">
                      {user.publicStats.avgRating.toFixed(1)}
                    </Text>
                    <Text className="text-xs text-amber-700/60">({user.publicStats.reviewCount})</Text>
                  </View>

                  <View className="flex-row items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                    <Users size={14} color="#64748b" />
                    <Text className="font-bold text-slate-700">{totalSessions}</Text>
                    <Text className="text-xs text-slate-500">sessions</Text>
                  </View>

                  <View className="flex-row items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5">
                    <Coins size={14} color="#059669" />
                    <Text className="font-bold text-emerald-700">{user.coins.toLocaleString()}</Text>
                    <Text className="text-xs text-emerald-600/60">Coins</Text>
                  </View>
                </View>

                {user.bio ? (
                  <Text className="mt-6 border-l-2 border-emerald-100 pl-3 leading-6 text-slate-600">
                    {user.bio}
                  </Text>
                ) : (
                  <Text className="mt-6 text-slate-400">No bio added yet.</Text>
                )}

                <View className="mt-5 flex-row flex-wrap gap-4">
                  {user.location ? (
                    <View className="flex-row items-center gap-1.5">
                      <MapPin size={14} color="#64748b" />
                      <Text className="text-sm text-slate-600">{user.location}</Text>
                    </View>
                  ) : null}
                  {user.school ? (
                    <View className="flex-row items-center gap-1.5">
                      <GraduationCap size={14} color="#64748b" />
                      <Text className="text-sm text-slate-600">{user.school}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View className="mx-4 mb-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <Text className="mb-4 text-lg font-bold text-slate-800">I can teach</Text>
                <View className="flex-row flex-wrap gap-2">
                  {user.hasSkills.length > 0 ? (
                    user.hasSkills.map((skill) => (
                      <View
                        key={skill}
                        className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5"
                      >
                        <Text className="text-sm font-medium text-emerald-700">{skill}</Text>
                      </View>
                    ))
                  ) : (
                    <Text className="italic text-slate-400">No teaching skills listed yet.</Text>
                  )}
                </View>
              </View>

              <View className="mx-4 mb-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <Text className="mb-4 text-lg font-bold text-slate-800">I want to learn</Text>
                <View className="flex-row flex-wrap gap-2">
                  {user.wantSkills.length > 0 ? (
                    user.wantSkills.map((skill) => (
                      <View
                        key={skill}
                        className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5"
                      >
                        <Text className="text-sm font-medium text-blue-700">{skill}</Text>
                      </View>
                    ))
                  ) : (
                    <Text className="italic text-slate-400">No learning goals listed yet.</Text>
                  )}
                </View>
              </View>

              <View className="mx-4 mb-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <Text className="mb-4 text-lg font-bold text-slate-800">Public Stats</Text>
                <View className="flex-row flex-wrap gap-3">
                  <View className="min-w-[140px] flex-1 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <Text className="text-xs uppercase tracking-wider text-slate-500">Teaching</Text>
                    <Text className="mt-1 text-2xl font-bold text-slate-900">
                      {user.publicStats.sessionsTaught}
                    </Text>
                  </View>
                  <View className="min-w-[140px] flex-1 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <Text className="text-xs uppercase tracking-wider text-slate-500">Learning</Text>
                    <Text className="mt-1 text-2xl font-bold text-slate-900">
                      {user.publicStats.sessionsAttendedAsLearner}
                    </Text>
                  </View>
                  <View className="min-w-[140px] flex-1 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <Text className="text-xs uppercase tracking-wider text-slate-500">Requests</Text>
                    <Text className="mt-1 text-2xl font-bold text-slate-900">
                      {user.publicStats.totalSessionRequests}
                    </Text>
                  </View>
                  <View className="min-w-[140px] flex-1 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <Text className="text-xs uppercase tracking-wider text-slate-500">
                      Acceptance
                    </Text>
                    <Text className="mt-1 text-2xl font-bold text-slate-900">
                      {Math.round(user.publicStats.acceptanceRate * 100)}%
                    </Text>
                  </View>
                </View>
              </View>

              <View className="mx-4 mb-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <Text className="mb-4 text-lg font-bold text-slate-800">Social Links</Text>
                {user.socialLinks.length > 0 ? (
                  user.socialLinks.map((link) => (
                    <TouchableOpacity
                      key={`${link.platform}-${link.url}`}
                      onPress={() => Linking.openURL(link.url)}
                      className="mb-3 flex-row items-center rounded-xl border border-slate-100 bg-slate-50 p-3 last:mb-0"
                    >
                      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white">
                        <SocialIcon platform={link.platform} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold capitalize text-slate-900">
                          {link.platform}
                        </Text>
                        <Text className="text-xs text-slate-500" numberOfLines={1}>
                          {link.url}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text className="text-slate-400">No social links added yet.</Text>
                )}
              </View>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {isOwnProfile && user ? (
        <EditProfileModal
          visible={isEditModalVisible}
          onClose={() => setIsEditModalVisible(false)}
          user={{
            name: user.name,
            bio: user.bio || '',
            hasSkills: user.hasSkills,
            wantSkills: user.wantSkills,
            socialLinks: user.socialLinks,
          }}
          onSave={handleUpdateUser}
        />
      ) : null}
    </View>
  );
}
