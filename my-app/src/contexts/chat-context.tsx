"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';
import { chatApi } from '@/lib/api/chat.api';
import type { ChatChannel } from '@/lib/api/chat.api';
import { setAuthToken } from '@/lib/api-client';

interface ChatContextType {
  channels: ChatChannel[];
  unreadCount: number;
  isLoading: boolean;
  refetchChannels: () => Promise<void>;
  activeChannelId: string | null;
  setActiveChannelId: (id: string | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const fetchChannels = useCallback(async (opts?: { silent?: boolean }) => {
    if (!isLoaded || !isSignedIn) {
      setChannels([]);
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

  const refetchChannels = useCallback(
    () => fetchChannels({ silent: true }),
    [fetchChannels],
  );

  // Simple unread count: count DM channels that have messages (placeholder — 
  // full unread requires server-side read cursors; for now we count 0)
  const unreadCount = 0;

  const value: ChatContextType = {
    channels,
    unreadCount,
    isLoading,
    refetchChannels,
    activeChannelId,
    setActiveChannelId,
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
