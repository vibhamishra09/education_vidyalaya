'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useAuth } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import { DebateLiveRoom } from './debate-live-room';
import {
  useDebateRoomDetails,
  useDebateLivekitToken,
} from '@/hooks/use-debate-rooms';
import { useDebateSocket } from '@/hooks/use-debate-socket';
import {
  DebateStatus,
  DebateSide,
  getUserDebateRole,
  getUserTeamSide,
  MicEnabledEvent,
  MicDisabledEvent,
} from '@/types/debate.types';

// Live Debate View - Allow entering when WAITING, LIVE, or PREP
export default function DebateRoomPage() {
  const params = useParams<{ room: string }>();
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();
  const roomId = params.room;

  // Fetch debate room data
  const { data: room, isLoading, error } = useDebateRoomDetails(roomId);

  // Get LiveKit token (only when room is LIVE or PREP)
  const { data: livekitData } = useDebateLivekitToken(
    roomId,
    room?.status === DebateStatus.LIVE || room?.status === DebateStatus.PREP || room?.status === DebateStatus.WAITING
  );

  // Get user's role and team
  const userRole = room && user ? getUserDebateRole(room, user.id) : null;
  const userSide = room && user ? getUserTeamSide(room, user.id) : null;
  const isModerator = userRole === 'host' || userRole === 'moderator';

  // Mic control handlers - will be passed to socket and debate room
  const handleMicEnabledRef = useRef<((event: MicEnabledEvent) => void) | null>(null);
  const handleMicDisabledRef = useRef<((event: MicDisabledEvent) => void) | null>(null);

  const handleMicEnabled = useCallback((event: MicEnabledEvent) => {
    handleMicEnabledRef.current?.(event);
  }, []);

  const handleMicDisabled = useCallback((event: MicDisabledEvent) => {
    handleMicDisabledRef.current?.(event);
  }, []);

  // Socket connection for real-time updates
  const {
    isConnected,
    debateState,
    teamChatMessages,
    buzzerQueue,
    prepCountdown,
    joinRoom: socketJoinRoom,
    pressBuzzer,
    sendTeamChat,
    startPrep: socketStartPrep,
    advanceTurn,
    endDebate,
  } = useDebateSocket({
    roomId,
    enabled: !!room && room.status !== DebateStatus.CANCELLED,
    onDebateEnded: () => {
      router.push(`/debateroom/${roomId}`);
    },
    onMicEnabled: handleMicEnabled,
    onMicDisabled: handleMicDisabled,
  });

  // Join socket room when connected
  useEffect(() => {
    if (isConnected && room) {
      socketJoinRoom();
    }
  }, [isConnected, room, socketJoinRoom]);

  // Handle start prep phase via socket
  const handleStartPrep = () => {
    if (isConnected && socketStartPrep) {
      socketStartPrep();
    } else {
      console.error('Socket not connected, cannot start prep phase');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#202124]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-white">Loading debate room...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !room) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#202124]">
        <div className="text-center text-red-500">
          <p className="text-xl font-semibold mb-2">Error</p>
          <p>Failed to load debate room</p>
        </div>
      </div>
    );
  }

  // Check if room status allows entering
  const canEnter = 
    room.status === DebateStatus.WAITING ||
    room.status === DebateStatus.PREP ||
    room.status === DebateStatus.LIVE;

  if (!canEnter) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#202124]">
        <div className="text-center text-white">
          <p className="text-xl font-semibold mb-2">Cannot Enter Room</p>
          <p className="text-gray-400">
            This debate room is {room.status.toLowerCase()}. You can only enter when the room is waiting, in prep, or live.
          </p>
        </div>
      </div>
    );
  }

  // Check if LiveKit data is available
  if (!livekitData?.token || !livekitData?.serverUrl) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#202124]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-white">Connecting to video room...</p>
        </div>
      </div>
    );
  }

  // Check if both teams have at least 1 participant
  const forTeam = room.teams.find(t => t.side === DebateSide.FOR);
  const againstTeam = room.teams.find(t => t.side === DebateSide.AGAINST);
  const forCount = forTeam?.participants.length || 0;
  const againstCount = againstTeam?.participants.length || 0;
  const canStart = forCount >= 1 && againstCount >= 1;

  return (
    <DebateLiveRoom
      room={room}
      livekitToken={livekitData.token}
      livekitServerUrl={livekitData.serverUrl}
      userRole={userRole}
      userSide={userSide}
      userId={user?.id}
      debateState={debateState}
      teamChatMessages={teamChatMessages}
      buzzerQueue={buzzerQueue}
      prepCountdown={prepCountdown}
      onPressBuzzer={pressBuzzer}
      onSendTeamChat={sendTeamChat}
      onAdvanceTurn={advanceTurn}
      onEndDebate={endDebate}
      onStartDebate={room.status === DebateStatus.WAITING && isModerator ? handleStartPrep : undefined}
      canStartDebate={canStart}
      isStartingDebate={!isConnected}
      getToken={getToken}
      onMicEnabledRef={handleMicEnabledRef}
      onMicDisabledRef={handleMicDisabledRef}
    />
  );
}
