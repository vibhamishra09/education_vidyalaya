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
  PrepStartedEvent,
  PrepCountdownEvent,
  BuzzerPressedEvent,
  TeamChatMessage,
  DebateEndedEvent,
  ParticipantJoinedEvent,
  ParticipantLeftEvent,
  MicEnabledEvent,
  MicDisabledEvent,
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
  onMicEnabled?: (event: MicEnabledEvent) => void;
  onMicDisabled?: (event: MicDisabledEvent) => void;
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
  onMicEnabled,
  onMicDisabled,
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
    onMicEnabled,
    onMicDisabled,
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
      onMicEnabled,
      onMicDisabled,
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
          if (mounted) {
            setIsConnected(true);
            socketRef.current = newSocket;
            setSocket(newSocket);
          }
        });

        newSocket.on('disconnect', (reason) => {
          if (mounted) {
            setIsConnected(false);
          }
        });

        newSocket.on('connect_error', (err) => {
          callbacksRef.current.onError?.(`Connection failed: ${err.message}`);
        });

        // Debate events
        newSocket.on('debate:state_sync', (state: DebateState) => {
          if (mounted) {
            setDebateState(state);
            // Calculate prep countdown from prepEndTime if in PREP phase
            if (state.status === DebateStatus.PREP && state.prepEndTime) {
              const now = Date.now();
              const remaining = Math.max(0, Math.ceil((state.prepEndTime - now) / 1000));
              setPrepCountdown(remaining);
            } else if (state.status !== DebateStatus.PREP) {
              setPrepCountdown(null);
            }
            callbacksRef.current.onStateSync?.(state);
          }
        });

        newSocket.on('debate:prep_started', (event: PrepStartedEvent) => {
          if (mounted) {
            // Calculate initial prep countdown
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((event.prepEndTime - now) / 1000));
            setPrepCountdown(remaining);
          }
        });

        newSocket.on('debate:turn_started', (event: TurnStartedEvent) => {
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
          callbacksRef.current.onTurnEnded?.(event);
          if (mounted) {
            setBuzzerQueue([]); // Clear buzzer queue on turn end
          }
        });

        newSocket.on('debate:prep_countdown', (event: PrepCountdownEvent) => {
          if (mounted) {
            setPrepCountdown(event.secondsRemaining);
          }
          callbacksRef.current.onPrepCountdown?.(event);
        });

        newSocket.on('debate:buzzer_pressed', (event: BuzzerPressedEvent) => {
          if (mounted) {
            setBuzzerQueue((prev) => [...prev, event]);
          }
          callbacksRef.current.onBuzzerPressed?.(event);
        });

        newSocket.on('debate:team_chat', (message: TeamChatMessage) => {
          if (mounted) {
            setTeamChatMessages((prev) => [...prev, message]);
          }
          callbacksRef.current.onTeamChat?.(message);
        });

        newSocket.on('debate:ended', (event: DebateEndedEvent) => {
          if (mounted) {
            setDebateState((prev) =>
              prev ? { ...prev, status: DebateStatus.ENDED } : prev
            );
            setPrepCountdown(null);
          }
          callbacksRef.current.onDebateEnded?.(event);
          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: debateRoomKeys.detail(roomId) });
        });

        newSocket.on('debate:debate_started', () => {
          if (mounted) {
            setPrepCountdown(null);
            // Refetch room to get updated status
            queryClient.invalidateQueries({ queryKey: debateRoomKeys.detail(roomId) });
          }
        });

        newSocket.on('debate:participant_joined', (event: ParticipantJoinedEvent) => {
          callbacksRef.current.onParticipantJoined?.(event);
          // Refetch room details
          queryClient.invalidateQueries({ queryKey: debateRoomKeys.detail(roomId) });
        });

        newSocket.on('debate:participant_left', (event: ParticipantLeftEvent) => {
          callbacksRef.current.onParticipantLeft?.(event);
          // Refetch room details
          queryClient.invalidateQueries({ queryKey: debateRoomKeys.detail(roomId) });
        });

        newSocket.on('debate:error', (error: { message: string }) => {
          callbacksRef.current.onError?.(error.message);
        });

        // Mic control events
        newSocket.on('debate:mic_enabled', (event: MicEnabledEvent) => {
          callbacksRef.current.onMicEnabled?.(event);
        });

        newSocket.on('debate:mic_disabled', (event: MicDisabledEvent) => {
          callbacksRef.current.onMicDisabled?.(event);
        });

      } catch (err) {
        // Connection failed
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
      socket.emit('debate:join_room', { roomId });
    }
  }, [socket, isConnected, roomId]);

  const leaveRoom = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('debate:leave_room', { roomId });
    }
  }, [socket, isConnected, roomId]);

  const pressBuzzer = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('debate:buzzer', { roomId });
    }
  }, [socket, isConnected, roomId]);

  const sendTeamChat = useCallback(
    (message: string) => {
      if (socket && isConnected && message.trim()) {
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
      socket.emit('debate:advance_turn', { roomId });
    }
  }, [socket, isConnected, roomId]);

  const endDebate = useCallback(
    (reason?: string) => {
      if (socket && isConnected) {
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
