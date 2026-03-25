import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, SafeAreaView, StatusBar, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Bell, CheckCheck } from 'lucide-react-native';
import { getErrorMessage } from '../lib/api';
import { useApi } from '../lib/use-api';
import { useBackendUser } from '../lib/backend-user-context';
import { useProtectedRoute } from '../lib/use-protected-route';
import { ApiNotification, NotificationsResponse } from '../types/api';

function NotificationItem({
  item,
  onMarkAsRead,
}: {
  item: ApiNotification;
  onMarkAsRead: (id: string) => void;
}) {
  const isUrgent = item.notifType === 'URGENT';
  const date = new Date(item.createdAt);
  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = date.toLocaleDateString();
  const isToday = new Date().toDateString() === date.toDateString();
  const formattedTime = isToday ? timeString : dateString;

  return (
    <View
      className={`mx-4 mb-2 rounded-xl border bg-white p-4 ${item.viewed ? 'border-gray-100 opacity-80' : 'border-blue-100 shadow-sm'
        }`}
    >
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <View className="mb-1 flex-row items-center">
            {isUrgent ? (
              <View className="mr-2 rounded-full bg-red-100 px-2 py-0.5">
                <Text className="text-xs font-medium text-red-600">Urgent</Text>
              </View>
            ) : !item.viewed ? (
              <View className="mr-2 rounded-full bg-blue-100 px-2 py-0.5">
                <Text className="text-xs font-medium text-blue-600">New</Text>
              </View>
            ) : null}
            <Text className="text-sm text-gray-500">{formattedTime}</Text>
          </View>

          <Text className={`mb-2 text-sm leading-5 ${item.viewed ? 'text-gray-500' : 'text-gray-700'}`}>
            {item.message}
          </Text>
        </View>

        {!item.viewed && (
          <TouchableOpacity
            onPress={() => onMarkAsRead(item.id)}
            className="bg-blue-50 p-2 rounded-full active:bg-blue-100"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <CheckCheck size={18} color="#2563EB" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { request } = useApi();
  const { ready: backendReady, loading: bootstrapping } = useBackendUser();
  const { shouldBlock } = useProtectedRoute(true, '/notifications');

  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!backendReady) {
      return () => {
        active = false;
      };
    }

    const loadNotifications = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await request<NotificationsResponse>(
          '/api/notifications?limit=50',
          undefined,
          { auth: true },
        );

        if (!active) {
          return;
        }

        setNotifications(result.notifications || []);
        setUnreadCount(result.unreadCount || 0);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(getErrorMessage(err, 'Unable to load notifications.'));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadNotifications();

    return () => {
      active = false;
    };
  }, [backendReady, request]);

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, viewed: true } : notification,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await request(`/api/notifications/${id}/read`, { method: 'PATCH' }, { auth: true });
    } catch {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id ? { ...notification, viewed: false } : notification,
        ),
      );
      setUnreadCount((prev) => prev + 1);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter((notification) => !notification.viewed).map((notification) => notification.id);
    if (unreadIds.length === 0) {
      return;
    }

    setNotifications((prev) => prev.map((notification) => ({ ...notification, viewed: true })));
    setUnreadCount(0);

    try {
      await request('/api/notifications/read-all', { method: 'PATCH' }, { auth: true });
    } catch {
      setNotifications((prev) =>
        prev.map((notification) =>
          unreadIds.includes(notification.id) ? { ...notification, viewed: false } : notification,
        ),
      );
      setUnreadCount(unreadIds.length);
    }
  };

  if (shouldBlock) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator color="#10b981" />
        <Text className="mt-3 text-gray-500">Redirecting to sign in...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 pt-2">
      <StatusBar barStyle="dark-content" />

      <View className="mb-2 flex-row items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-2 -ml-2 rounded-full p-2 active:bg-gray-100"
          >
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Notifications</Text>
          {unreadCount > 0 && (
            <View className="bg-red-500 ml-2 px-2 py-0.5 rounded-full">
              <Text className="text-xs text-white font-bold">{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity onPress={() => void handleMarkAllAsRead()}>
            <Text className="font-medium text-blue-600">Mark all read</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {bootstrapping || loading ? (
        <View className="items-center py-12">
          <ActivityIndicator color="#10b981" />
          <Text className="mt-3 text-gray-500">Loading notifications...</Text>
        </View>
      ) : null}

      {error ? (
        <View className="mx-4 mb-2 rounded-xl border border-rose-100 bg-rose-50 p-4">
          <Text className="font-semibold text-rose-700">{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem item={item} onMarkAsRead={(id) => void handleMarkAsRead(id)} />
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          !loading ? (
            <View className="mt-10 flex-1 items-center justify-center p-10">
              <Bell size={48} color="#D1D5DB" />
              <Text className="mt-4 text-center text-gray-500">No notifications yet</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
