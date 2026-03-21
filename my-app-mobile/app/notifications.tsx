import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, SafeAreaView, StatusBar, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Bell, CheckCheck, X, Check } from "lucide-react-native";

// --- TYPES ---
enum NotifType {
  URGENT = 'URGENT',
  NORMAL = 'NORMAL',
}

interface Notification {
  id: string;
  notifType: NotifType;
  message: string;
  createdAt: string | Date;
  viewed: boolean;
  actionType?: string; // e.g., "SESSION_REQUEST", "SESSION_REMINDER"
  actionData?: string;
  title?: string;
}

// --- MOCK DATA ---
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    notifType: NotifType.URGENT,
    title: "Session Reminder",
    message: "Your session 'React Hooks Deep Dive' starts in 15 minutes.",
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    viewed: false,
    actionType: "SESSION_REMINDER",
    actionData: "123",
  },
  {
    id: "4",
    notifType: NotifType.URGENT,
    title: "Session Request",
    message: "John wants to book a session on 'Node.js Basics'.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    viewed: false,
    actionType: "SESSION_REQUEST",
    actionData: "456",
  },
  {
    id: "2",
    notifType: NotifType.NORMAL,
    title: "New Review",
    message: "Sarah left a 5-star review for your mentoring session!",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    viewed: false,
    actionType: "REVIEW_RECEIVED",
    actionData: "789",
  },
  {
    id: "3",
    notifType: NotifType.NORMAL,
    title: "Achievement Unlocked",
    message: "You've earned the 'Code Warrior' badge!",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    viewed: true,
    actionType: "ACHIEVEMENT",
  },
  {
    id: "5",
    notifType: NotifType.NORMAL,
    title: "System Update",
    message: "We've updated our terms of service.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    viewed: true,
    actionType: "SYSTEM",
  },
];

// --- COMPONENTS ---

const NotificationItem = ({ 
  item, 
  onMarkAsRead,
  onPress,
  onAction
}: { 
  item: Notification; 
  onMarkAsRead: (id: string) => void;
  onPress: (item: Notification) => void;
  onAction: (id: string, action: 'accept' | 'reject') => void;
}) => {
  const isUrgent = item.notifType === NotifType.URGENT;
  
  const date = new Date(item.createdAt);
  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = date.toLocaleDateString();
  const isToday = new Date().toDateString() === date.toDateString();
  const formattedTime = isToday ? timeString : dateString;

  const showActions = item.actionType === 'SESSION_REQUEST';

  return (
    <TouchableOpacity 
      onPress={() => onPress(item)}
      activeOpacity={0.7}
      className={`bg-white p-4 mb-2 mx-4 rounded-xl border ${item.viewed ? 'border-gray-100 opacity-80' : 'border-blue-100 shadow-sm'}`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-1">
                {isUrgent && (
                    <View className="bg-red-100 px-2 py-0.5 rounded-full mr-2">
                        <Text className="text-xs text-red-600 font-medium">Urgent</Text>
                    </View>
                )}
                 {!item.viewed && !isUrgent && (
                    <View className="bg-blue-100 px-2 py-0.5 rounded-full mr-2">
                        <Text className="text-xs text-blue-600 font-medium">New</Text>
                    </View>
                )}
                <Text className={`text-sm text-gray-500`}>{formattedTime}</Text>
            </View>
          
          <Text className={`text-base font-semibold mb-1 ${item.viewed ? 'text-gray-700' : 'text-gray-900'}`}>
            {item.title || item.actionType || "Notification"}
          </Text>
          <Text className={`text-sm ${item.viewed ? 'text-gray-500' : 'text-gray-700'} leading-5 mb-2`}>
            {item.message}
          </Text>

          {showActions && (
            <View className="flex-row mt-2 space-x-3">
              <TouchableOpacity 
                onPress={() => onAction(item.id, 'accept')}
                className="bg-green-600 px-4 py-2 rounded-lg flex-row items-center"
              >
                <Check size={14} color="white" className="mr-1" />
                <Text className="text-white font-semibold text-sm">Accept</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => onAction(item.id, 'reject')}
                className="bg-red-50 px-4 py-2 rounded-lg flex-row items-center border border-red-100"
              >
                <X size={14} color="#DC2626" className="mr-1" />
                <Text className="text-red-600 font-semibold text-sm">Reject</Text>
              </TouchableOpacity>
            </View>
          )}
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
    </TouchableOpacity>
  );
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, viewed: true } : n)
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, viewed: true }))
    );
  };

  const handleNotificationPress = (item: Notification) => {
    // Mark as read when opened
    if (!item.viewed) {
      handleMarkAsRead(item.id);
    }
    
    // Navigate based on type
    if (item.actionType === 'SESSION_REQUEST' || item.actionType === 'SESSION_REMINDER') {
      // Mock navigation to session ID
      router.push(`/session/${item.actionData || '123'}`);
    } else {
      // Fallback or specific handling for other types
      console.log('Opened notification:', item.title);
    }
  };

  const handleAction = (id: string, action: 'accept' | 'reject') => {
    Alert.alert(
      action === 'accept' ? 'Session Accepted' : 'Session Rejected',
      action === 'accept' ? 'You have accepted the session request.' : 'You have declined the session request.',
      [{ text: 'OK' }]
    );
    // In a real app, you would call an API here and then update the list
    handleMarkAsRead(id);
  };

  const unreadCount = notifications.filter(n => !n.viewed).length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50 pt-2">
        <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between bg-white border-b border-gray-100 mb-2">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="p-2 -ml-2 mr-2 rounded-full active:bg-gray-100"
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
        
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text className="text-blue-600 font-medium">Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem 
            item={item} 
            onMarkAsRead={handleMarkAsRead}
            onPress={handleNotificationPress}
            onAction={handleAction}
          />
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center p-10 mt-10">
            <Bell size={48} color="#D1D5DB" />
            <Text className="text-gray-500 mt-4 text-center">No notifications yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
