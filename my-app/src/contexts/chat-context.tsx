"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';
import { chatApi } from '@/lib/api/chat.api';
import type { ChatChannel } from '@/lib/api/chat.api';
import { setAuthToken } from '@/lib/api-client';
import { io, Socket } from 'socket.io-client';
import { getSocketIoBaseUrl } from '@/lib/socket-base-url';

interface ChatContextType {
  channels: ChatChannel[];
  unreadCount: number;
  isLoading: boolean;
  refetchChannels: () => Promise<void>;
  activeChannelId: string | null;
  setActiveChannelId: (id: string | null) => void;
  /** Set of user IDs that are currently online (connected to the chat gateway). */
  onlineUserIds: Set<string>;
  /** Mark a channel as read and refresh unread counts. */
  markAsRead: (channelId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const presenceSocketRef = useRef<Socket | null>(null);

  const fetchChannels = useCallback(async (opts?: { silent?: boolean }) => {
    if (!isLoaded || !isSignedIn) {
      setChannels([]);
      setUnreadCount(0);
      return;
    }

    const sessionToken = await getToken();
    if (!sessionToken) return;
    setAuthToken(sessionToken);

    const silent = opts?.silent === true;
    try {
      if (!silent) setIsLoading(true);
      const data = await chatApi.listChannelsWithMessages();
      setChannels(data);
      // Compute total unread from the per-channel unreadCount
      const total = data.reduce((sum, ch) => sum + (ch.unreadCount ?? 0), 0);
      setUnreadCount(total);
    } catch {
      // silently fail
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [isLoaded, isSignedIn, getToken]);

  // Initial fetch
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      fetchChannels();
    } else {
      setChannels([]);
      setUnreadCount(0);
    }
  }, [isLoaded, isSignedIn, fetchChannels]);

  // Periodic silent refresh every 15s
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const silentRefresh = () => void fetchChannels({ silent: true });
    const interval = setInterval(silentRefresh, 15000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') silentRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isLoaded, isSignedIn, fetchChannels]);

  // ─── Mark as read ───────────────────────────────────────────────────
  const markAsRead = useCallback(async (channelId: string) => {
    try {
      await chatApi.markChannelAsRead(channelId);
      // Optimistically update local state
      setChannels((prev) =>
        prev.map((ch) => (ch.id === channelId ? { ...ch, unreadCount: 0 } : ch)),
      );
      setUnreadCount((prev) => {
        const channel = channels.find((c) => c.id === channelId);
        const channelUnread = channel?.unreadCount ?? 0;
        return Math.max(0, prev - channelUnread);
      });
    } catch {
      // silently fail
    }
  }, [channels]);

  // ─── Presence socket ────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setOnlineUserIds(new Set());
      return;
    }

    let socket: Socket | null = null;
    let cancelled = false;

    async function connectPresence() {
      try {
        const token = await getToken();
        if (!token || cancelled) return;

        const baseUrl = getSocketIoBaseUrl();
        socket = io(`${baseUrl}/chat`, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 3000,
        });
        presenceSocketRef.current = socket;

        socket.on('chat:authenticated', () => {
          // Ask for full online list on connect/reconnect
          socket?.emit('presence:query');
        });

        socket.on('presence:list', (data: { onlineUserIds: string[] }) => {
          setOnlineUserIds(new Set(data.onlineUserIds));
        });

        socket.on('presence:update', (data: { userId: string; status: 'online' | 'offline' }) => {
          setOnlineUserIds((prev) => {
            const next = new Set(prev);
            if (data.status === 'online') {
              next.add(data.userId);
            } else {
              next.delete(data.userId);
            }
            return next;
          });
        });

        // On reconnect, re-query presence
        socket.on('reconnect', () => {
          socket?.emit('presence:query');
        });
      } catch {
        // silently fail
      }
    }

    connectPresence();

    return () => {
      cancelled = true;
      if (socket) {
        socket.disconnect();
        presenceSocketRef.current = null;
      }
    };
  }, [isLoaded, isSignedIn, getToken]);

  const refetchChannels = useCallback(
    () => fetchChannels({ silent: true }),
    [fetchChannels],
  );

  const value: ChatContextType = {
    channels,
    unreadCount,
    isLoading,
    refetchChannels,
    activeChannelId,
    setActiveChannelId,
    onlineUserIds,
    markAsRead,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
