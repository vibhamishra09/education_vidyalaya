"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { Notification } from '@/types/api.types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  refetchNotifications: () => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markNotificationsAsRead: (notificationIds: string[]) => Promise<void>;
  addNotification: (notification: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const value: NotificationContextType = {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    hasMore: false,
    refetchNotifications: async () => {},
    loadMoreNotifications: async () => {},
    markAsRead: async () => {},
    markAllAsRead: async () => {},
    markNotificationsAsRead: async () => {},
    addNotification: () => {},
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}
