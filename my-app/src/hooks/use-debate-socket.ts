'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import {
  DebateState,
  DebateStatus,
  DebateSide,
  TurnStartedEvent,
  TurnEndedEvent,
  PrepCountdownEvent,
  BuzzerPressedEvent,
  TeamChatMessage,
  DebateEndedEvent,
  ParticipantJoinedEvent,
  ParticipantLeftEvent,
} from '@/types/debate.types';
import { debateRoomKeys } from './use-debate-rooms';

interface UseDebateSocketOptions {
  roomId: string;
  enabled?: boolean;
  onTurnStarted?: (event: TurnStartedEvent) => void;
  onTurnEnded?: (event: TurnEndedEvent) => void;
  onPrepCountdown?: (event: PrepCountdownEvent) => void;
  onBuzzerPressed?: (event: BuzzerPressedEvent) => void;
  onTeamChat?: (message: TeamChatMessage) => void;
  onDebateEnded?: (event: DebateEndedEvent) => void;
  onParticipantJoined?: (event: ParticipantJoinedEvent) => void;
  onParticipantLeft?: (event: ParticipantLeftEvent) => void;
  onStateSync?: (state: DebateState) => void;
  onError?: (error: string) => void;
}

interface UseDebateSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  debateState: DebateState | null;
  teamChatMessages: TeamChatMessage[];
  buzzerQueue: BuzzerPressedEvent[];
  prepCountdown: number | null;
  
  // Actions
  joinRoom: () => void;
  leaveRoom: () => void;
  pressBuzzer: () => void;
  sendTeamChat: (message: string) => void;
  sendTranscript: (text: string, isFinal: boolean) => void;
  
  // For moderators
  advanceTurn: () => void;
  endDebate: (reason?: string) => void;
}

export function useDebateSocket({
  roomId,
  enabled = true,
  onTurnStarted,
  onTurnEnded,
  onPrepCountdown,
  onBuzzerPressed,
  onTeamChat,
  onDebateEnded,
  onParticipantJoined,
  onParticipantLeft,
  onStateSync,
  onError,
}: UseDebateSocketOptions): UseDebateSocketReturn {
  const { getToken, isLoaded } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [debateState, setDebateState] = useState<DebateState | null>(null);
  const [teamChatMessages, setTeamChatMessages] = useState<TeamChatMessage[]>([]);
  const [buzzerQueue, setBuzzerQueue] = useState<BuzzerPressedEvent[]>([]);
  const [prepCountdown, setPrepCountdown] = useState<number | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const connectingRef = useRef(false);

  // Store callbacks in refs to avoid recreating socket
  const callbacksRef = useRef({
    onTurnStarted,
    onTurnEnded,
    onPrepCountdown,
    onBuzzerPressed,
    onTeamChat,
    onDebateEnded,
    onParticipantJoined,
    onParticipantLeft,
    onStateSync,
    onError,
  });

  useEffect(() => {
    callbacksRef.current = {
      onTurnStarted,
      onTurnEnded,
      onPrepCountdown,
      onBuzzerPressed,
      onTeamChat,
      onDebateEnded,
      onParticipantJoined,
      onParticipantLeft,
      onStateSync,
      onError,
    };
  });

  // Connect to socket
  useEffect(() => {
    if (!enabled || !roomId || !isLoaded || !user || connectingRef.current) {
      return;
    }

    let mounted = true;
    connectingRef.current = true;

    async function connectSocket() {
      try {
        const authToken = await getToken();
        if (!authToken || !mounted) return;

        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

        const newSocket = io(`${baseUrl}/debate`, {
          transports: ['websocket'],
          auth: { token: authToken },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
          console.log('✅ [DebateSocket] Connected to debate namespace');
          if (mounted) {
            setIsConnected(true);
            socketRef.current = newSocket;
            setSocket(newSocket);
          }
        });

        newSocket.on('disconnect', (reason) => {
          console.log('🔌 [DebateSocket] Disconnected:', reason);
          if (mounted) {
            setIsConnected(false);
          }
        });

        newSocket.on('connect_error', (err) => {
          console.error('🚨 [DebateSocket] Connection error:', err.message);
          callbacksRef.current.onError?.(`Connection failed: ${err.message}`);
        });

        // Debate events
        newSocket.on('debate:state_sync', (state: DebateState) => {
          console.log('📊 [DebateSocket] State sync:', state.status);
          if (mounted) {
            setDebateState(state);
            callbacksRef.current.onStateSync?.(state);
          }
        });

        newSocket.on('debate:turn_started', (event: TurnStartedEvent) => {
          console.log('🎤 [DebateSocket] Turn started:', event.participantName);
          callbacksRef.current.onTurnStarted?.(event);
          // Update local state
          if (mounted) {
            setDebateState((prev) =>
              prev
                ? {
                    ...prev,
                    currentSpeakerId: event.participantId,
                    turnStartedAt: event.startedAt,
                    currentTurnIndex: event.turnIndex,
                  }
                : prev
            );
          }
        });

        newSocket.on('debate:turn_ended', (event: TurnEndedEvent) => {
          console.log('⏹️ [DebateSocket] Turn ended');
          callbacksRef.current.onTurnEnded?.(event);
          if (mounted) {
            setBuzzerQueue([]); // Clear buzzer queue on turn end
          }
        });

        newSocket.on('debate:prep_countdown', (event: PrepCountdownEvent) => {
          console.log('⏳ [DebateSocket] Prep countdown:', event.secondsRemaining);
          if (mounted) {
            setPrepCountdown(event.secondsRemaining);
          }
          callbacksRef.current.onPrepCountdown?.(event);
        });

        newSocket.on('debate:buzzer_pressed', (event: BuzzerPressedEvent) => {
          console.log('🔔 [DebateSocket] Buzzer pressed:', event.participantName);
          if (mounted) {
            setBuzzerQueue((prev) => [...prev, event]);
          }
          callbacksRef.current.onBuzzerPressed?.(event);
        });

        newSocket.on('debate:team_chat', (message: TeamChatMessage) => {
          console.log('💬 [DebateSocket] Team chat:', message.participantName);
          if (mounted) {
            setTeamChatMessages((prev) => [...prev, message]);
          }
          callbacksRef.current.onTeamChat?.(message);
        });

        newSocket.on('debate:ended', (event: DebateEndedEvent) => {
          console.log('🏁 [DebateSocket] Debate ended:', event.reason);
          if (mounted) {
            setDebateState((prev) =>
              prev ? { ...prev, status: DebateStatus.ENDED } : prev
            );
          }
          callbacksRef.current.onDebateEnded?.(event);
          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: debateRoomKeys.detail(roomId) });
        });

        newSocket.on('debate:participant_joined', (event: ParticipantJoinedEvent) => {
          console.log('👋 [DebateSocket] Participant joined:', event.name);
          callbacksRef.current.onParticipantJoined?.(event);
          // Refetch room details
          queryClient.invalidateQueries({ queryKey: debateRoomKeys.detail(roomId) });
        });

        newSocket.on('debate:participant_left', (event: ParticipantLeftEvent) => {
          console.log('👋 [DebateSocket] Participant left:', event.userId);
          callbacksRef.current.onParticipantLeft?.(event);
          // Refetch room details
          queryClient.invalidateQueries({ queryKey: debateRoomKeys.detail(roomId) });
        });

        newSocket.on('debate:error', (error: { message: string }) => {
          console.error('❌ [DebateSocket] Error:', error.message);
          callbacksRef.current.onError?.(error.message);
        });

      } catch (err) {
        console.error('❌ [DebateSocket] Failed to connect:', err);
      } finally {
        connectingRef.current = false;
      }
    }

    connectSocket();

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
      connectingRef.current = false;
    };
  }, [enabled, roomId, isLoaded, user, getToken, queryClient]);

  // Actions
  const joinRoom = useCallback(() => {
    if (socket && isConnected) {
      console.log('🚪 [DebateSocket] Joining room:', roomId);
      socket.emit('debate:join_room', { roomId });
    }
  }, [socket, isConnected, roomId]);

  const leaveRoom = useCallback(() => {
    if (socket && isConnected) {
      console.log('🚪 [DebateSocket] Leaving room:', roomId);
      socket.emit('debate:leave_room', { roomId });
    }
  }, [socket, isConnected, roomId]);

  const pressBuzzer = useCallback(() => {
    if (socket && isConnected) {
      console.log('🔔 [DebateSocket] Pressing buzzer');
      socket.emit('debate:buzzer', { roomId });
    }
  }, [socket, isConnected, roomId]);

  const sendTeamChat = useCallback(
    (message: string) => {
      if (socket && isConnected && message.trim()) {
        console.log('💬 [DebateSocket] Sending team chat');
        socket.emit('debate:team_chat', { roomId, message: message.trim() });
      }
    },
    [socket, isConnected, roomId]
  );

  const sendTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      if (socket && isConnected && text.trim()) {
        socket.emit('debate:transcript', {
          roomId,
          text: text.trim(),
          isFinal,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [socket, isConnected, roomId]
  );

  // Moderator actions
  const advanceTurn = useCallback(() => {
    if (socket && isConnected) {
      console.log('⏭️ [DebateSocket] Advancing turn');
      socket.emit('debate:advance_turn', { roomId });
    }
  }, [socket, isConnected, roomId]);

  const endDebate = useCallback(
    (reason?: string) => {
      if (socket && isConnected) {
        console.log('🏁 [DebateSocket] Ending debate');
        socket.emit('debate:end', { roomId, reason });
      }
    },
    [socket, isConnected, roomId]
  );

  return {
    socket,
    isConnected,
    debateState,
    teamChatMessages,
    buzzerQueue,
    prepCountdown,
    joinRoom,
    leaveRoom,
    pressBuzzer,
    sendTeamChat,
    sendTranscript,
    advanceTurn,
    endDebate,
  };
}
