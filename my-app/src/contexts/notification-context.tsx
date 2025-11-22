"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { notificationsApi } from '@/lib/api';
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
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isSignedIn } = useUser();

  const fetchNotifications = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!isSignedIn) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setCurrentPage(1);
      }
      setError(null);
      const response = await notificationsApi.getNotifications(page, 20);
      
      if (append) {
        setNotifications((prev) => [...prev, ...response.notifications]);
      } else {
        setNotifications(response.notifications);
      }
      
      setUnreadCount(response.unreadCount);
      setHasMore(response.pagination.hasMore);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [isSignedIn]);

  const loadMoreNotifications = useCallback(async () => {
    if (hasMore && !isLoadingMore) {
      await fetchNotifications(currentPage + 1, true);
    }
  }, [hasMore, isLoadingMore, currentPage, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationsApi.markNotificationAsRead(notificationId);
      setNotifications(prev => {
        const updated = prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, viewed: true }
            : notification
        );
        // Update unread count
        setUnreadCount(updated.filter((n) => !n.viewed).length);
        return updated;
      });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllNotificationsAsRead();
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, viewed: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Fetch notifications when user signs in
  useEffect(() => {
    if (isSignedIn) {
      fetchNotifications(1, false);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isSignedIn, fetchNotifications]);

  // Set up periodic refetching when user is signed in
  // Refetch only the first page to get latest notifications
  useEffect(() => {
    if (!isSignedIn) return;

    const interval = setInterval(() => {
      fetchNotifications(1, false);
    }, 30000); // Refetch every 30 seconds

    return () => clearInterval(interval);
  }, [isSignedIn, fetchNotifications]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    refetchNotifications: () => fetchNotifications(1, false),
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
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
