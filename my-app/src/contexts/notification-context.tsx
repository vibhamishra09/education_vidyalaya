"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';
import { notificationsApi } from '@/lib/api';
import { setAuthToken } from '@/lib/api-client';
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const fetchNotifications = useCallback(async (
    page: number = 1,
    append: boolean = false,
    opts?: { silent?: boolean },
  ) => {
    if (!isLoaded || !isSignedIn) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Avoid 401s: the axios interceptor can run before Clerk session token is ready.
    const sessionToken = await getToken();
    if (!sessionToken) {
      return;
    }

    setAuthToken(sessionToken);

    const silent = opts?.silent === true;

    try {
      if (append) {
        setIsLoadingMore(true);
      } else if (!silent) {
        setIsLoading(true);
        setCurrentPage(1);
      }
      const response = await notificationsApi.getNotifications(page, 20);
      setError(null);

      if (append) {
        setNotifications((prev) => [...prev, ...response.notifications]);
      } else {
        setNotifications(response.notifications);
      }
      
      setUnreadCount(response.unreadCount);
      setHasMore(response.pagination.hasMore);
      setCurrentPage(page);
    } catch (err: unknown) {
      if (!append && page === 1 && !silent) {
        setError('Failed to load notifications');
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [isLoaded, isSignedIn, getToken]);

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
      // Error marking notification as read
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
      // Error marking all notifications as read
    }
  };

  const markNotificationsAsRead = async (notificationIds: string[]) => {
    if (!notificationIds || notificationIds.length === 0) {
      return;
    }

    try {
      const idsSet = new Set(notificationIds);
      await notificationsApi.markNotificationsAsRead(notificationIds);
      setNotifications(prev => {
        const updated = prev.map(notification =>
          idsSet.has(notification.id)
            ? { ...notification, viewed: true }
            : notification
        );
        setUnreadCount(updated.filter((n) => !n.viewed).length);
        return updated;
      });
    } catch (err) {
      // Error marking notifications as read
    }
  };

  // Add a new notification to the list (for real-time updates)
  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => {
      // Check if notification already exists
      const exists = prev.some(n => n.id === notification.id);
      if (exists) {
        return prev;
      }
      // Add to the beginning of the list
      const updated = [notification, ...prev];
      // Update unread count if notification is unread
      if (!notification.viewed) {
        setUnreadCount(prevCount => prevCount + 1);
      }
      return updated;
    });
  }, []);

  // Fetch notifications when user signs in
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      fetchNotifications(1, false);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isLoaded, isSignedIn, fetchNotifications]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const silentRefresh = () =>
      void fetchNotifications(1, false, { silent: true });
    const interval = setInterval(silentRefresh, 8000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') silentRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isLoaded, isSignedIn, fetchNotifications]);

  // Stable reference so consumers (e.g. push listener) do not re-subscribe every render
  const refetchNotifications = useCallback(
    () => fetchNotifications(1, false, { silent: true }),
    [fetchNotifications],
  );

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    refetchNotifications,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
    markNotificationsAsRead,
    addNotification,
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
