'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  VideoTrack,
  useParticipants,
  useLocalParticipant,
  useRoomContext,
  isTrackReference,
  useSpeakingParticipants,
} from '@livekit/components-react';
import { Track, RoomOptions, VideoPresets, RemoteParticipant } from 'livekit-client';
import { KrispNoiseFilter, isKrispNoiseFilterSupported } from '@livekit/krisp-noise-filter';
import { io, Socket } from 'socket.io-client';
import type { TrackReferenceOrPlaceholder } from '@livekit/components-react';
import '@livekit/components-styles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Users,
  MessageSquare,
  Clock,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Square,
  User,
  Volume2,
  VolumeX,
  Crown,
  Shield,
  MonitorUp,
  MonitorOff,
  Grid2X2,
  Focus,
  Send,
  Bell,
  Zap,
  Play,
  Loader2,
  MousePointer2,
  MousePointerClick,
  MousePointer,
  Pin,
  PinOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  DebateRoom,
  DebateState,
  DebateSide,
  DebateStatus,
  TeamChatMessage,
  BuzzerPressedEvent,
  DebateUserRole,
  estimateDebateSessionMinutes,
} from '@/types/debate.types';
import {
  SimpleTimer,
  PrepCountdown,
  DebateBuzzer,
  DebateTeamChat,
  CompactTeamsDisplay,
  ModeratorEvaluationPanel,
} from '@/components/debate';
import { useDebateMicControl } from '@/hooks/use-debate-mic-control';
import { MicEnabledEvent, MicDisabledEvent } from '@/types/debate.types';
import { useToast } from '@/contexts/toast-context';
import { useParticipantEvaluations, useUpsertModeratorEvaluation } from '@/hooks/use-debate-rooms';
import { useRemoteControl } from '@/hooks/use-remote-control';
import { RemoteControlOverlay } from '@/components/livekit/RemoteControlOverlay';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  createdAt: string;
  visibility: 'ALL' | 'MODERATOR' | 'MODERATOR_ONLY' | 'TEAM_FOR' | 'TEAM_AGAINST';
  side: DebateSide | null;
}

interface DebateLiveRoomProps {
  room: DebateRoom;
  livekitToken: string;
  livekitServerUrl: string;
  userRole: DebateUserRole;
  userSide: DebateSide | null;
  userId?: string;
  debateState: DebateState | null;
  teamChatMessages: TeamChatMessage[];
  buzzerQueue: BuzzerPressedEvent[];
  prepCountdown: number | null;
  onPressBuzzer: () => void;
  onSendTeamChat: (message: string) => void;
  onAdvanceTurn: () => void;
  onEndDebate: (reason?: string) => void;
  onStartDebate?: () => void;
  canStartDebate?: boolean;
  isStartingDebate?: boolean;
  getToken: () => Promise<string | null>;
  onMicEnabledRef: React.MutableRefObject<((event: MicEnabledEvent) => void) | null>;
  onMicDisabledRef: React.MutableRefObject<((event: MicDisabledEvent) => void) | null>;
}

export function DebateLiveRoom({
  room,
  livekitToken,
  livekitServerUrl,
  userRole,
  userSide,
  userId,
  debateState,
  teamChatMessages,
  buzzerQueue,
  prepCountdown,
  onPressBuzzer,
  onSendTeamChat,
  onAdvanceTurn,
  onEndDebate,
  onStartDebate,
  canStartDebate,
  isStartingDebate,
  getToken,
  onMicEnabledRef,
  onMicDisabledRef,
}: DebateLiveRoomProps) {
  const router = useRouter();
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  const handleLeave = useCallback(async () => {
    router.push('/debateroom');
  }, [router]);

  const handleRoomConnected = useCallback(() => {
    console.log('[DebateLiveRoom] Room connected callback triggered!');
  }, []);

  const handleRoomDisconnected = useCallback(() => {
    console.log('[DebateLiveRoom] Room disconnected callback triggered!');
  }, []);

  const handleRoomError = useCallback((error: Error) => {
    console.error('[DebateLiveRoom] Room error:', error);
  }, []);

  // Debug LiveKit connection params
  useEffect(() => {
    console.log('[DebateLiveRoom] LiveKit connection params:');
    console.log('[DebateLiveRoom] Token:', livekitToken ? `${livekitToken.substring(0, 50)}...` : 'MISSING');
    console.log('[DebateLiveRoom] Server URL:', livekitServerUrl || 'MISSING');
    console.log('[DebateLiveRoom] Room name:', room.livekitRoomName || room.id);
  }, [livekitToken, livekitServerUrl, room.livekitRoomName, room.id]);

  // Validate credentials
  if (!livekitToken || !livekitServerUrl) {
    console.error('[DebateLiveRoom] Missing LiveKit credentials:', {
      hasToken: !!livekitToken,
      hasServerUrl: !!livekitServerUrl,
    });
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#202124]">
        <div className="text-center p-8 bg-red-500/10 rounded-lg border border-red-500/20 max-w-md">
          <Video className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold text-white mb-2">Connection Error</h2>
          <p className="text-gray-300 mb-4">
            Unable to connect to the video room. Missing {!livekitToken && 'authentication token'}
            {!livekitToken && !livekitServerUrl && ' and '}
            {!livekitServerUrl && 'server URL'}.
          </p>
          <Button onClick={handleLeave} variant="destructive">
            Back to Lobby
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#202124] overflow-hidden fixed inset-0">
      <LiveKitRoom
        video={true}
        audio={true}
        token={livekitToken}
        serverUrl={livekitServerUrl}
        connect={true}
        className="flex-1 flex flex-col overflow-hidden"
        onConnected={handleRoomConnected}
        onDisconnected={handleRoomDisconnected}
        onError={handleRoomError}
        options={{
          videoCaptureDefaults: {
            resolution: isMobileViewport ? VideoPresets.h360 : VideoPresets.h720,
            frameRate: isMobileViewport ? 15 : 24,
          },
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: {
            videoSimulcastLayers: isMobileViewport
              ? [VideoPresets.h180]
              : [VideoPresets.h180, VideoPresets.h360],
          },
        } as RoomOptions}
      >
        <DebateLiveContent
          debateRoom={room}
          userRole={userRole}
          userSide={userSide}
          userId={userId}
          debateState={debateState}
          teamChatMessages={teamChatMessages}
          buzzerQueue={buzzerQueue}
          prepCountdown={prepCountdown}
          onPressBuzzer={onPressBuzzer}
          onSendTeamChat={onSendTeamChat}
          onAdvanceTurn={onAdvanceTurn}
          onEndDebate={onEndDebate}
          onStartDebate={onStartDebate}
          canStartDebate={canStartDebate}
          isStartingDebate={isStartingDebate}
          onLeave={handleLeave}
          getToken={getToken}
          onMicEnabledRef={onMicEnabledRef}
          onMicDisabledRef={onMicDisabledRef}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

interface DebateLiveContentProps {
  debateRoom: DebateRoom;
  userRole: DebateUserRole;
  userSide: DebateSide | null;
  userId?: string;
  debateState: DebateState | null;
  teamChatMessages: TeamChatMessage[];
  buzzerQueue: BuzzerPressedEvent[];
  prepCountdown: number | null;
  onPressBuzzer: () => void;
  onSendTeamChat: (message: string) => void;
  onAdvanceTurn: () => void;
  onEndDebate: (reason?: string) => void;
  onStartDebate?: () => void;
  canStartDebate?: boolean;
  isStartingDebate?: boolean;
  onLeave: () => void;
  getToken: () => Promise<string | null>;
  onMicEnabledRef: React.MutableRefObject<((event: MicEnabledEvent) => void) | null>;
  onMicDisabledRef: React.MutableRefObject<((event: MicDisabledEvent) => void) | null>;
}

// Local prep countdown timer component that updates every second
function PrepCountdownTimer({ secondsRemaining: initialSeconds }: { secondsRemaining: number }) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);

  useEffect(() => {
    // Reset when prop changes
    setSecondsRemaining(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsRemaining]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  return (
    <div className="bg-yellow-500/20 rounded-lg p-1.5 sm:p-2 text-center border border-yellow-500/30">
      <Clock className="h-3 w-3 sm:h-5 sm:w-5 text-yellow-400 mx-auto mb-1" />
      <div className="text-white text-sm sm:text-lg font-mono font-bold">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </div>
    </div>
  );
}

function DebateLiveContent({
  debateRoom,
  userRole,
  userSide,
  userId,
  debateState,
  teamChatMessages,
  buzzerQueue,
  prepCountdown,
  onPressBuzzer,
  onSendTeamChat,
  onAdvanceTurn,
  onEndDebate,
  onStartDebate,
  canStartDebate,
  isStartingDebate,
  onLeave,
  getToken,
  onMicEnabledRef,
  onMicDisabledRef,
}: DebateLiveContentProps) {
  const { showWarning, showInfo } = useToast();
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'teams' | 'chat' | 'evaluation'>('teams');
  const [isAudioOutputEnabled, setIsAudioOutputEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<'speaker' | 'grid'>('speaker');
  const [isRoomConnected, setIsRoomConnected] = useState(false);
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isModeratorOnly, setIsModeratorOnly] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const isHost = userRole === 'host';

  // Remote Control Hook
  const {
    isControlling,
    isRequestPending,
    targetScreenShareId,
    requestControl,
    stopControl,
    sendInputEvent,
    controllerId,
    pendingRequestFrom,
    grantControl,
    denyControl,
    revokeControl
  } = useRemoteControl()

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(max-width: 767px)').matches) {
      setShowSidebar(false);
    }
  }, []);

  // Initialize Socket.io connection
  useEffect(() => {
    const socket = io(`${API_URL}/debate-chat`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[DebateRoom] Socket.io connected');
      // Join the debate room
      socket.emit('join-debate-room', {
        roomId: debateRoom.id,
        userId: userId,
      });
    });

    socket.on('disconnect', () => {
      console.log('[DebateRoom] Socket.io disconnected');
    });

    // Listen for new messages
    socket.on('new-message', (message: { 
      id: string;
      visibility: string; 
      senderId: string; 
      content: string;
      createdAt: string;
      side: DebateSide | null;
      sender: {
        clerkId: string;
        name: string;
        avatar?: string | null;
      };
    }) => {
      console.log('[DebateRoom] Received new message:', message);
      
      // Filter based on user role and team
      const isModerator = userRole === 'host' || userRole === 'moderator';
      const visibility = message.visibility;
      
      let canSee = false;
      if (isModerator) {
        // Moderators see everything
        canSee = true;
      } else if (visibility === 'ALL' || visibility === 'MODERATOR') {
        // Everyone sees ALL and MODERATOR broadcast messages
        canSee = true;
      } else if (visibility === 'MODERATOR_ONLY') {
        // Only moderators see private moderator messages
        canSee = false;
      } else if (visibility === 'TEAM_FOR' && userSide === DebateSide.FOR) {
        canSee = true;
      } else if (visibility === 'TEAM_AGAINST' && userSide === DebateSide.AGAINST) {
        canSee = true;
      }
      
      if (canSee) {
        setChatMessages(prev => {
          // Prevent duplicates
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, {
            id: message.id,
            senderId: message.sender.clerkId,
            senderName: message.sender.name,
            senderAvatar: message.sender.avatar || undefined,
            content: message.content,
            createdAt: message.createdAt,
            visibility: message.visibility as 'ALL' | 'MODERATOR' | 'MODERATOR_ONLY' | 'TEAM_FOR' | 'TEAM_AGAINST',
            side: message.side,
          }];
        });
      }
    });

    // Listen for chat cleared event
    socket.on('chat-cleared', () => {
      console.log('[DebateRoom] Chat cleared by moderator');
      setChatMessages([]);
    });

    socketRef.current = socket;

    return () => {
      socket.emit('leave-debate-room', {
        roomId: debateRoom.id,
        userId: userId,
      });
      socket.close();
    };
  }, [debateRoom.id, userId, userRole, userSide]);

  // Load chat history from API
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoadingMessages(true);
        
        // Get authentication token
        const token = await getToken();
        if (!token) {
          console.error('[DebateRoom] No authentication token available');
          return;
        }
        
        const response = await fetch(
          `${API_URL}/debate-rooms/${debateRoom.id}/messages?userRole=${userRole}&userSide=${userSide || ''}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            credentials: 'include',
          }
        );

        if (response.ok) {
          const data = await response.json();
          const formattedMessages = data.messages.map((msg: { 
            id: string; 
            sender: { clerkId: string; name: string; avatar: string | null }; 
            content: string; 
            createdAt: string; 
            visibility: string;
            side: DebateSide | null;
          }) => ({
            id: msg.id,
            senderId: msg.sender.clerkId,
            senderName: msg.sender.name,
            senderAvatar: msg.sender.avatar || undefined,
            content: msg.content,
            createdAt: msg.createdAt,
            visibility: msg.visibility as 'ALL' | 'MODERATOR' | 'MODERATOR_ONLY' | 'TEAM_FOR' | 'TEAM_AGAINST',
            side: msg.side,
          }));
          setChatMessages(formattedMessages);
          console.log('[DebateRoom] Loaded', formattedMessages.length, 'messages from API');
        } else {
          console.error('[DebateRoom] Failed to load messages:', response.status, response.statusText);
        }
      } catch (err) {
        console.error('[DebateRoom] Failed to load messages:', err);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [debateRoom.id, userRole, userSide, getToken]);

  // LiveKit hooks
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const speakingParticipants = useSpeakingParticipants();

  // Get camera tracks
  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );

  // Get screen share tracks
  const screenShareTracks = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: false }]
  );

  // Pinned track
  const pinnedTrack = useMemo(() => {
    if (!pinnedParticipantId) return null;
    return cameraTracks.find(t => t.participant.identity === pinnedParticipantId);
  }, [cameraTracks, pinnedParticipantId]);

  const togglePin = useCallback((participantId: string) => {
    setPinnedParticipantId(prev => (prev === participantId ? null : participantId));
  }, []);
  

  // Track room connection state
  useEffect(() => {
    if (!room) return;

    const handleConnected = () => {
      console.log('[DebateRoom] Room connected!');
      setIsRoomConnected(true);
    };

    const handleDisconnected = () => {
      console.log('[DebateRoom] Room disconnected');
      setIsRoomConnected(false);
    };

    // Check if already connected
    if (room.state === 'connected') {
      setIsRoomConnected(true);
    }

    room.on('connected', handleConnected);
    room.on('disconnected', handleDisconnected);

    return () => {
      room.off('connected', handleConnected);
      room.off('disconnected', handleDisconnected);
    };
  }, [room]);

  // Apply Krisp AI noise suppression to microphone track
  useEffect(() => {
    if (!localParticipant || !isKrispNoiseFilterSupported()) return;
    const micPublication = localParticipant.getTrackPublication(Track.Source.Microphone);
    const micTrack = micPublication?.audioTrack;
    if (!micTrack) return;
    const filter = KrispNoiseFilter();
    micTrack.setProcessor(filter).catch(() => {});
    return () => {
      micTrack.stopProcessor().catch(() => {});
    };
  }, [localParticipant]);

  // Log a concise connection snapshot in development only.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || !room || !localParticipant) return;
    console.log('[DebateRoom] Connected to room:', room.name);
    console.log('[DebateRoom] Room state:', room.state);
    console.log('[DebateRoom] Local participant:', localParticipant.identity);
    console.log('[DebateRoom] Total camera tracks:', cameraTracks.length);
    console.log('[DebateRoom] Participants:', participants.length);
    console.log('[DebateRoom] Speaking participants:', speakingParticipants.length);
  }, [room, localParticipant, cameraTracks.length, participants.length, speakingParticipants.length]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current && sidebarTab === 'chat') {
      chatScrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [chatMessages, sidebarTab]);

  // Get participant avatar from metadata
  const getParticipantAvatar = useCallback((participant: { metadata?: string | null }): string | null => {
    if (!participant.metadata) return null;
    try {
      const metadata = JSON.parse(participant.metadata);
      return metadata.avatar || null;
    } catch (e) {
      return null;
    }
  }, []);

  // Send chat message via API
  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim()) return;

    try {
      const isModerator = userRole === 'host' || userRole === 'moderator';
      
      // Get authentication token
      const token = await getToken();
      if (!token) {
        console.error('[DebateRoom] No authentication token available');
        return;
      }
      
      const response = await fetch(
        `${API_URL}/debate-rooms/${debateRoom.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            content: chatInput.trim(),
            userRole,
            userSide,
            isModeratorOnly: isModerator && isModeratorOnly,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('[DebateRoom] Message sent successfully:', data);
        
        // Emit via Socket.io for real-time delivery
        if (socketRef.current) {
          socketRef.current.emit('message-sent', {
            roomId: debateRoom.id,
            message: data.message,
            userRole,
            userSide,
          });
        }
        
        setChatInput('');
        setIsModeratorOnly(false); // Reset moderator-only flag
      } else {
        console.error('[DebateRoom] Failed to send message:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('[DebateRoom] Failed to send chat message:', err);
    }
  }, [chatInput, userRole, userSide, isModeratorOnly, debateRoom.id, getToken]);

  // Clear chat history (moderators only)
  const clearChatHistory = useCallback(async () => {
    const isModerator = userRole === 'host' || userRole === 'moderator';
    if (!isModerator) return;

    try {
      // Get authentication token
      const token = await getToken();
      if (!token) {
        console.error('[DebateRoom] No authentication token available');
        return;
      }
      
      const response = await fetch(
        `${API_URL}/debate-rooms/${debateRoom.id}/messages`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            userRole,
          }),
        }
      );

      if (response.ok) {
        console.log('[DebateRoom] Chat history cleared');
        setChatMessages([]);
        
        // Emit via Socket.io to notify all participants
        if (socketRef.current) {
          socketRef.current.emit('messages-cleared', {
            roomId: debateRoom.id,
          });
        }
      } else {
        console.error('[DebateRoom] Failed to clear chat history:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('[DebateRoom] Failed to clear chat history:', err);
    }
  }, [userRole, debateRoom.id, getToken]);

  // Toggle camera with proper error handling
  const toggleCamera = useCallback(async () => {
    if (!localParticipant) return;

    try {
      await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
      console.log('[DebateRoom] Camera toggled:', !localParticipant.isCameraEnabled);
    } catch (err) {
      console.error('[DebateRoom] Camera toggle error:', err);
    }
  }, [localParticipant]);


  // Toggle audio output
  const toggleAudioOutput = useCallback(() => {
    if (room) {
      const enabled = !isAudioOutputEnabled;
      setIsAudioOutputEnabled(enabled);
      room.remoteParticipants.forEach((participant) => {
        participant.audioTrackPublications.forEach((publication) => {
          if (publication.track && 'setVolume' in publication.track) {
            (publication.track as { setVolume: (volume: number) => void }).setVolume(enabled ? 1 : 0);
          }
        });
      });
    }
  }, [room, isAudioOutputEnabled]);

  // Helper to get participant's side based on debate room teams
  // LiveKit identity could be user.id (database ID) or user.clerkId
  const getParticipantSide = useCallback((identity: string): DebateSide | 'MODERATOR' => {
    // Handle empty identity - treat as unassigned/moderator
    if (!identity) {
      console.log('[DebateRoom] Empty identity, treating as MODERATOR');
      return 'MODERATOR';
    }

    const forTeam = debateRoom.teams.find(t => t.side === DebateSide.FOR);
    const againstTeam = debateRoom.teams.find(t => t.side === DebateSide.AGAINST);

    // Try matching by both user.id (database ID used by LiveKit) and clerkId
    if (forTeam?.participants.some(p => p.user.id === identity || p.user.clerkId === identity)) return DebateSide.FOR;
    if (againstTeam?.participants.some(p => p.user.id === identity || p.user.clerkId === identity)) return DebateSide.AGAINST;
    
    // If no match found, return MODERATOR (includes host and unmatched participants)
    return 'MODERATOR';
  }, [debateRoom.teams]);

  // Get moderators from debate room
  const moderators = useMemo(() => {
    return debateRoom.moderators.map(m => ({
      userId: m.user.id,
      clerkId: m.user.clerkId,
      name: m.user.name,
      avatarUrl: m.user.avatar,
    }));
  }, [debateRoom.moderators]);

  // Filter tracks by team side - in grid mode, show ALL tracks in both panels
  const { forTracks, againstTracks, moderatorTracks, allTracks } = useMemo(() => {
    const forTracks: TrackReferenceOrPlaceholder[] = [];
    const againstTracks: TrackReferenceOrPlaceholder[] = [];
    const moderatorTracks: TrackReferenceOrPlaceholder[] = [];

    cameraTracks.forEach(track => {
      const side = getParticipantSide(track.participant.identity);
      console.log('[DebateRoom] Track participant:', track.participant.identity, 'Side:', side);
      if (side === DebateSide.FOR) {
        forTracks.push(track);
      } else if (side === DebateSide.AGAINST) {
        againstTracks.push(track);
      } else {
        moderatorTracks.push(track);
      }
    });

    console.log('[DebateRoom] Filtered tracks - FOR:', forTracks.length, 'AGAINST:', againstTracks.length, 'MODERATOR:', moderatorTracks.length);

    return { forTracks, againstTracks, moderatorTracks, allTracks: cameraTracks };
  }, [cameraTracks, getParticipantSide]);

  // Get visible tracks based on view mode
  // Presenter view: shows only the person speaking (or first person if none speaking)
  // Grid view: shows all participants including moderators
  const getVisibleTracks = useCallback((tracks: TrackReferenceOrPlaceholder[], mode: 'speaker' | 'grid') => {
    if (mode === 'grid') return tracks;
    
    // In presenter view, find who is speaking from this team
    // First check using speakingParticipants hook
    const speakingIds = speakingParticipants.map(p => p.identity);
    const speaking = tracks.find(t => speakingIds.includes(t.participant.identity) || t.participant.isSpeaking);
    
    // Return speaker, or if no one is speaking, return the first person
    if (speaking) return [speaking];
    return tracks.length > 0 ? [tracks[0]] : [];
  }, [speakingParticipants]);

  // For grid view, include moderators with teams
  // For presenter view, show only active speaker or first participant
  const getTracksForPanel = useCallback((
    panelSide: 'FOR' | 'AGAINST',
    teamTracks: TrackReferenceOrPlaceholder[],
    moderatorTracks: TrackReferenceOrPlaceholder[],
    allTracks: TrackReferenceOrPlaceholder[],
    mode: 'speaker' | 'grid'
  ): TrackReferenceOrPlaceholder[] => {
    // In grid view, include moderators with team tracks
    if (mode === 'grid') {
      if (teamTracks.length > 0) {
        // Show team members + half of moderators in each panel
        const halfMods = Math.ceil(moderatorTracks.length / 2);
        const modsForThisPanel = panelSide === 'FOR' 
          ? moderatorTracks.slice(0, halfMods)
          : moderatorTracks.slice(halfMods);
        return [...teamTracks, ...modsForThisPanel];
      }
    } else {
      // Presenter mode: show only team tracks
      if (teamTracks.length > 0) {
        return getVisibleTracks(teamTracks, mode);
      }
    }
    
    // No team-specific tracks - fall back to showing all tracks distributed
    // This handles when participants haven't been assigned to teams yet
    // or when team assignment doesn't match LiveKit identity
    
    if (allTracks.length === 0) return [];
    
    // In grid mode with no team assignments, split all tracks between panels
    if (mode === 'grid') {
      const halfIndex = Math.ceil(allTracks.length / 2);
      if (panelSide === 'FOR') {
        return allTracks.slice(0, halfIndex);
      } else {
        return allTracks.slice(halfIndex);
      }
    }
    
    // In speaker mode with no team assignments, show speaking participant or first
    const speakingIds = speakingParticipants.map(p => p.identity);
    const speaking = allTracks.find(t => speakingIds.includes(t.participant.identity) || t.participant.isSpeaking);
    
    if (speaking) {
      const side = getParticipantSide(speaking.participant.identity);
      // Show the speaker in the appropriate panel
      if (side === DebateSide.FOR && panelSide === 'FOR') return [speaking];
      if (side === DebateSide.AGAINST && panelSide === 'AGAINST') return [speaking];
      // If speaker is moderator or side doesn't match, show in FOR panel only
      if (panelSide === 'FOR') return [speaking];
      return [];
    }
    
    // Default: show first participant in FOR panel only (to avoid duplication)
    if (panelSide === 'FOR') return [allTracks[0]];
    return [];
  }, [getVisibleTracks, getParticipantSide, speakingParticipants]);

  // Memoize the tracks to display for each panel
  const forPanelTracks = useMemo(() => 
    getTracksForPanel('FOR', forTracks, moderatorTracks, allTracks, viewMode),
    [getTracksForPanel, forTracks, moderatorTracks, allTracks, viewMode]
  );

  const againstPanelTracks = useMemo(() => 
    getTracksForPanel('AGAINST', againstTracks, moderatorTracks, allTracks, viewMode),
    [getTracksForPanel, againstTracks, moderatorTracks, allTracks, viewMode]
  );

  const isModerator = userRole === 'host' || userRole === 'moderator';
  const isPrepPhase = debateRoom.status === DebateStatus.PREP;
  const isLive = debateRoom.status === DebateStatus.LIVE;
  const currentTurnNumber = debateState?.currentTurnIndex ?? debateRoom.currentTurnIndex ?? 0;

  // Find current speaker from debate state
  const currentSpeaker = debateRoom.teams
    .flatMap((t) => t.participants)
    .find((p) => debateState?.currentSpeakerId && p.user.clerkId === debateState.currentSpeakerId);

  const isUserTurn = currentSpeaker?.user.clerkId === userId;

  const currentSpeakerParticipant = useMemo(
    () =>
      debateRoom.teams
        .flatMap((t) => t.participants)
        .find(
          (p) =>
            !!debateState?.currentSpeakerId &&
            (p.user.clerkId === debateState.currentSpeakerId ||
              p.user.id === debateState.currentSpeakerId),
        ),
    [debateRoom.teams, debateState?.currentSpeakerId],
  );

  const { data: currentSpeakerEvaluations } = useParticipantEvaluations(
    debateRoom.id,
    currentSpeakerParticipant?.id || '',
    currentTurnNumber,
    isModerator && !!currentSpeakerParticipant && sidebarTab === 'evaluation',
  );

  const upsertModeratorEvaluation = useUpsertModeratorEvaluation(debateRoom.id);
  const existingEvaluation = currentSpeakerEvaluations?.evaluations?.[0];

  const handleSaveModeratorEvaluation = useCallback(
    async (payload: { notes?: string; scores?: Record<string, number> }) => {
      if (!currentSpeakerParticipant) return;
      await upsertModeratorEvaluation.mutateAsync({
        participantId: currentSpeakerParticipant.id,
        turnNumber: currentTurnNumber,
        ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
        ...(payload.scores !== undefined ? { scores: payload.scores } : {}),
      });
    },
    [currentSpeakerParticipant, currentTurnNumber, upsertModeratorEvaluation],
  );

  // Mic control handlers - connect to refs from parent
  const handleMicEnabled = useCallback((event: MicEnabledEvent) => {
    console.log('[DebateLiveRoom] Mic enabled for:', event.participantId, 'reason:', event.reason);
    // Call the handler from the hook if it exists
    onMicEnabledRef.current?.(event);
  }, [onMicEnabledRef]);

  const handleMicDisabled = useCallback((event: MicDisabledEvent) => {
    console.log('[DebateLiveRoom] Mic disabled for:', event.participantId, 'reason:', event.reason);
    // Call the handler from the hook if it exists
    onMicDisabledRef.current?.(event);
  }, [onMicDisabledRef]);

  // Use mic control hook
  const { isMicLocked, canToggleMic, micLockReason, handleMicEnabled: handleMicEnabledFromHook, handleMicDisabled: handleMicDisabledFromHook } = useDebateMicControl({
    debateStatus: debateRoom.status,
    currentSpeakerId: debateState?.currentSpeakerId || null,
    userRole,
    userId,
    onMicEnabled: handleMicEnabled,
    onMicDisabled: handleMicDisabled,
    onNotification: (title, message, type) => {
      if (type === 'warning') {
        showWarning(title, message);
      } else if (type === 'info') {
        showInfo(title, message);
      } else if (type === 'error') {
        showWarning(title, message); // Use warning for errors too
      } else {
        showInfo(title, message);
      }
    },
  });

  // Store hook handlers in refs for socket callbacks to use
  useEffect(() => {
    onMicEnabledRef.current = handleMicEnabledFromHook;
    onMicDisabledRef.current = handleMicDisabledFromHook;
  }, [handleMicEnabledFromHook, handleMicDisabledFromHook, onMicEnabledRef, onMicDisabledRef]);

  // Toggle microphone with proper error handling and lock checking
  const toggleMicrophone = useCallback(async () => {
    if (!localParticipant) return;

    // Check if mic is locked
    if (isMicLocked && !localParticipant.isMicrophoneEnabled) {
      // User is trying to unmute while locked
      showWarning('🔒 Microphone Locked', micLockReason || 'You cannot unmute during this phase.');
      return;
    }

    try {
      await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
      console.log('[DebateRoom] Microphone toggled:', !localParticipant.isMicrophoneEnabled);
    } catch (err) {
      console.error('[DebateRoom] Microphone toggle error:', err);
      showWarning('Microphone Error', 'Failed to toggle microphone. Please check your permissions.');
    }
  }, [localParticipant, isMicLocked, micLockReason, showWarning]);

  // Active screen share
  const activeScreenShare = screenShareTracks.length > 0 ? screenShareTracks[0] : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-12 sm:h-14 bg-[#1f1f1f] border-b border-white/10 flex items-center justify-between px-2 sm:px-4 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="relative h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
            <Image src="/webyalaya-main-logo.svg" alt="Webyalaya" fill className="object-contain" priority />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-white font-medium text-xs sm:text-sm truncate">{debateRoom.topic}</span>
            <span className="text-white/50 text-[10px] sm:text-xs">Debate Room</span>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'ml-1 sm:ml-2 flex-shrink-0 text-[10px] sm:text-xs px-1.5 sm:px-2',
              isPrepPhase && 'bg-blue-500/20 border-blue-500 text-blue-300',
              isLive && 'bg-green-500/20 border-green-500 text-green-300'
            )}
          >
            {isPrepPhase ? 'Prep' : '🔴 LIVE'}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* View Mode Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(viewMode === 'speaker' ? 'grid' : 'speaker')}
            className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 sm:h-9 sm:w-auto sm:px-3 p-0"
          >
            {viewMode === 'speaker' ? (
              <>
                <Grid2X2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Grid View</span>
              </>
            ) : (
              <>
                <Focus className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Presenter View</span>
              </>
            )}
          </Button>

          {/* Role Badge */}
          {isModerator && (
            <Badge variant="outline" className="bg-yellow-500/20 border-yellow-500 text-yellow-300 flex-shrink-0 text-[10px] sm:text-xs px-1.5 sm:px-2">
              {userRole === 'host' ? <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 sm:mr-1" /> : <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3 sm:mr-1" />}
              <span className="hidden sm:inline">{userRole === 'host' ? 'Host' : 'Moderator'}</span>
            </Badge>
          )}

          {/* Participant count */}
          <div className="hidden sm:flex items-center gap-1 text-white/60 text-xs sm:text-sm flex-shrink-0">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{participants.length} ({allTracks.length} videos)</span>
          </div>

          {/* Sidebar Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
            className="text-white/70 hover:text-white hover:bg-white/10 flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9 p-0"
          >
            {showSidebar ? <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" /> : <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>
        </div>
      </div>

      {/* Main Content - Versus Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Debate Area */}
        <div className="flex-1 flex overflow-hidden transition-all duration-300">
          {/* Prep Countdown Overlay */}
          {isPrepPhase && prepCountdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
              <PrepCountdown secondsRemaining={prepCountdown} />
            </div>
          )}

          {/* Screen Share Overlay - Only shown if no participant is pinned and not in split mode */}
          {activeScreenShare && !pinnedParticipantId && (
            <div className="absolute inset-0 z-10 bg-black/90 flex flex-col items-center justify-center p-4">
              <div className="w-full h-full max-h-[75vh] flex items-center justify-center relative group">
                <div className="relative inline-block max-w-full max-h-full">
                  {isTrackReference(activeScreenShare) && activeScreenShare.publication?.track && (
                    <VideoTrack trackRef={activeScreenShare} className="w-auto h-auto max-w-full max-h-[75vh] object-contain rounded-lg" />
                  )}
                  
                  {/* Remote Control Overlay */}
                  <RemoteControlOverlay
                    isControlling={isControlling}
                    isSharing={activeScreenShare.participant.identity === localParticipant?.identity}
                    controllerId={controllerId}
                    onSendInput={sendInputEvent}
                    onStopControl={stopControl}
                    onRevokeControl={revokeControl}
                  />
                </div>

                <div className="absolute bottom-4 left-4 bg-blue-500 text-white text-sm px-3 py-1 rounded-full flex items-center gap-2 shadow-lg z-20">
                  <MonitorUp className="h-4 w-4" />
                  <span>{activeScreenShare.participant.name || activeScreenShare.participant.identity} - Screen Share</span>
                </div>
              </div>
              
              {/* Remote Control Request Button */}
              {activeScreenShare.participant.identity !== localParticipant?.identity && (
                <div className="mt-4 shrink-0 transition-opacity duration-300">
                  {isControlling ? (
                    <Button 
                      key="stop-btn"
                      variant="destructive" 
                      onClick={stopControl}
                      className="gap-2 shadow-xl animate-in fade-in slide-in-from-bottom-2"
                    >
                      <MousePointer className="h-4 w-4" /> Stop Controlling
                    </Button>
                  ) : (
                    <Button 
                      key="req-btn"
                      variant="secondary" 
                      onClick={() => requestControl(activeScreenShare.participant.identity)}
                      disabled={isRequestPending}
                      className="gap-2 bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:text-sky-300 border border-sky-500/30 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2"
                    >
                      <MousePointerClick className="h-4 w-4" />
                      {isRequestPending ? 'Request Pending...' : 'Request Remote Control'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Split Screen Overlay - Shown when BOTH are active */}
          {activeScreenShare && pinnedParticipantId && pinnedTrack && (
            <div className="absolute inset-0 z-10 bg-[#0a0a0a] flex flex-col md:flex-row gap-3 p-3">
              {/* Screen Share Side */}
              <div className="flex-1 relative bg-black/40 rounded-xl overflow-hidden group border border-white/5 flex items-center justify-center">
                {isTrackReference(activeScreenShare) ? (
                  <VideoTrack
                    trackRef={activeScreenShare}
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <MonitorUp className="h-16 w-16 text-white/10" />
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-blue-500/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-2 shadow-lg z-20 border border-white/10">
                  <MonitorUp className="h-3 w-3" />
                  <span>{activeScreenShare.participant.name || activeScreenShare.participant.identity} - SCREEN</span>
                </div>
                
                <RemoteControlOverlay
                  isControlling={isControlling}
                  isSharing={activeScreenShare.participant.identity === localParticipant?.identity}
                  controllerId={controllerId}
                  onSendInput={sendInputEvent}
                  onStopControl={stopControl}
                  onRevokeControl={revokeControl}
                />
              </div>

              {/* Pinned Participant Side */}
              <div className="flex-1 relative bg-[#1a1a1a] rounded-xl overflow-hidden group border border-blue-500/30 flex items-center justify-center">
                {pinnedTrack && isTrackReference(pinnedTrack) && pinnedTrack.publication?.track ? (
                  <VideoTrack
                    trackRef={pinnedTrack}
                    className={`w-full h-full object-contain rounded-lg ${pinnedTrack.participant.isLocal ? 'scale-x-[-1]' : ''}`}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#252525] to-[#1a1a1a]">
                    {(() => {
                      const avatarUrl = getParticipantAvatar(pinnedTrack.participant);
                      return avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={pinnedTrack.participant.name || 'Participant'}
                          width={100}
                          height={100}
                          className="w-24 h-24 rounded-full object-cover shadow-2xl border-4 border-white/10"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] flex items-center justify-center shadow-2xl border-4 border-white/10">
                          <User className="w-12 h-12 text-white/10" />
                        </div>
                      )
                    })()}
                    <p className="mt-4 text-white/50 text-[10px] font-bold tracking-[0.2em] uppercase bg-black/30 px-4 py-1.5 rounded-full border border-white/5">Camera Off</p>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-2 shadow-lg z-20 border border-white/10">
                  <Pin className="h-3 w-3 fill-current" />
                  <span>PINNED: {pinnedTrack?.participant.name || pinnedTrack?.participant.identity}</span>
                </div>
                <Button
                  onClick={() => setPinnedParticipantId(null)}
                  className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 rounded-full h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Unpin"
                >
                  <PinOff className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Pinned Participant Overlay - Only shown if NO screen share */}
          {pinnedTrack && !activeScreenShare && (
            <div className="absolute inset-0 z-10 bg-black/90 flex flex-col items-center justify-center p-4">
              <div className="w-full h-full max-h-[85vh] flex items-center justify-center relative group">
                <div className="relative inline-block max-w-full max-h-full">
                  {isTrackReference(pinnedTrack) && pinnedTrack.publication?.track ? (
                    <VideoTrack 
                      trackRef={pinnedTrack} 
                      className="w-full h-full object-contain rounded-lg border-2 border-blue-500 shadow-2xl shadow-blue-500/20"
                    />
                  ) : (
                    <div className="bg-gray-800 rounded-lg flex flex-col items-center justify-center w-[600px] aspect-video max-w-full">
                      {(() => {
                        const avatarUrl = getParticipantAvatar(pinnedTrack.participant);
                        return avatarUrl ? (
                          <Image
                            src={avatarUrl}
                            alt={pinnedTrack.participant.name || 'Participant'}
                            width={160}
                            height={160}
                            className="w-40 h-40 rounded-full object-cover shadow-2xl border-4 border-white/10"
                          />
                        ) : (
                          <User className="h-24 w-24 text-white/20 mb-4" />
                        )
                      })()}
                      <p className="text-white font-medium text-xl mt-4">{pinnedTrack.participant.name || pinnedTrack.participant.identity}</p>
                    </div>
                  )}
                </div>

                <div className="absolute bottom-4 left-4 bg-blue-600 text-white text-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-xl z-20 font-bold border border-blue-400/30">
                  <Pin className="h-4 w-4 fill-current text-white" />
                  <span>Pinned: {pinnedTrack.participant.name || pinnedTrack.participant.identity}</span>
                </div>

                <Button
                  onClick={() => setPinnedParticipantId(null)}
                  className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 rounded-full h-10 w-10 p-0"
                  title="Unpin"
                >
                  <PinOff className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
          {/* Remote Control Consent UI (Screen Sharer Side) */}
          {pendingRequestFrom && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
              <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-sky-500/30 shadow-2xl rounded-2xl p-5 w-80 max-w-[calc(100vw-32px)] text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-sky-500/10 to-transparent pointer-events-none" />
                
                <div className="h-12 w-12 rounded-full bg-sky-500/20 flex items-center justify-center mx-auto mb-3">
                  <MousePointer2 className="h-6 w-6 text-sky-400" />
                </div>
                
                <h3 className="text-white font-bold text-lg">Remote Control Request</h3>
                <p className="text-white/70 text-sm mt-1 mb-4 leading-relaxed">
                  <span className="text-white font-semibold">{pendingRequestFrom.name}</span> would like to control your shared screen.
                </p>
                
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    className="flex-1 bg-white/5 border-white/10 text-white/70 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                    onClick={denyControl}
                  >
                    Deny
                  </Button>
                  <Button
                    className="flex-1 bg-sky-500 text-white hover:bg-sky-400"
                    onClick={grantControl}
                  >
                    Grant Control
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* LEFT SIDE: TEAM FOR */}
          <div className="flex-1 flex flex-col border-r border-green-500/30 bg-gradient-to-b from-green-900/10 to-transparent min-w-0">
            {/* Team Header */}
            <div className="flex items-center justify-between p-2 sm:p-3 border-b border-green-500/20">
              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500 flex-shrink-0" />
                <h3 className="text-green-400 font-bold text-sm sm:text-lg truncate">TEAM FOR</h3>
                <Badge variant="outline" className="bg-green-500/20 border-green-500 text-green-300 text-xs flex-shrink-0">
                  {forPanelTracks.length}
                </Badge>
              </div>
              {userSide === DebateSide.FOR && (
                <Button 
                  onClick={onPressBuzzer}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Buzz
                </Button>
              )}
            </div>
            
            {/* Video Grid for Team FOR */}
            <div className="flex-1 p-2 sm:p-3 overflow-auto">
              <TeamVideoGrid 
                tracks={forPanelTracks} 
                teamColor="green"
                currentSpeakerId={debateState?.currentSpeakerId}
                pinnedParticipantId={pinnedParticipantId}
                onTogglePin={togglePin}
              />
            </div>
          </div>

          {/* CENTER: VS and Timer */}
          <div className="w-12 sm:w-20 md:w-24 flex flex-col items-center justify-center bg-black/50 border-x border-white/10 flex-shrink-0">
            <div className="text-xl sm:text-3xl md:text-4xl font-black text-white/90 mb-2 sm:mb-4 tracking-widest">VS</div>
            
            {/* Timer - Show prep countdown during PREP, turn timer during LIVE/WAITING */}
            {debateRoom.status === DebateStatus.PREP && prepCountdown !== null ? (
              <PrepCountdownTimer secondsRemaining={prepCountdown} />
            ) : (isLive || debateRoom.status === DebateStatus.WAITING) && (
              <div className="bg-white/10 rounded-lg p-1.5 sm:p-2 text-center text-white text-sm sm:text-lg">
                <Clock className="h-3 w-3 sm:h-5 sm:w-5 text-white/70 mx-auto mb-1" />
                <SimpleTimer
                  turnDurationSeconds={debateRoom.turnDurationSeconds}
                  turnStartedAt={debateState?.turnStartedAt || null}
                  isActive={isLive && !!debateState?.currentSpeakerId && !!debateState?.turnStartedAt}
                />
              </div>
            )}

            {/* Current Speaker Indicator */}
            {currentSpeaker && (
              <div className="mt-2 sm:mt-4 text-center px-1">
                <div className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider">Speaking</div>
                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mt-1 border-2 border-yellow-500">
                  <AvatarImage src={currentSpeaker.user.avatar || undefined} />
                  <AvatarFallback className="bg-yellow-500/20 text-yellow-400 text-xs sm:text-sm">
                    {currentSpeaker.user.name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-[10px] sm:text-xs text-white/70 mt-1 truncate max-w-[60px] sm:max-w-[80px]">
                  {currentSpeaker.user.name?.split(' ')[0]}
                </div>
              </div>
            )}

            {/* Start Debate Button (WAITING status) */}
            {isModerator && debateRoom.status === DebateStatus.WAITING && onStartDebate && (
              <div className="mt-auto pb-2 sm:pb-4 flex flex-col gap-1.5 sm:gap-2">
                <Button
                  onClick={onStartDebate}
                  size="sm"
                  disabled={!canStartDebate || isStartingDebate}
                  className="text-[10px] sm:text-xs bg-green-600 hover:bg-green-700 text-white h-7 sm:h-8 px-2 sm:px-3"
                >
                  {isStartingDebate ? (
                    <>
                      <Loader2 className="h-3 w-3 sm:mr-1 animate-spin" />
                      <span className="hidden sm:inline">Starting...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Start Debate</span>
                    </>
                  )}
                </Button>
                {!canStartDebate && (
                  <p className="text-[8px] sm:text-[10px] text-white/50 text-center px-1">
                    Need at least 1 participant per team
                  </p>
                )}
              </div>
            )}

            {/* Moderator Controls (LIVE status) */}
            {isModerator && isLive && (
              <div className="mt-auto pb-2 sm:pb-4 flex flex-col gap-1.5 sm:gap-2">
                <Button
                  onClick={onAdvanceTurn}
                  size="sm"
                  variant="outline"
                  className="text-[10px] sm:text-xs border-white/20 text-white/70 hover:text-white hover:bg-white/10 h-7 sm:h-8 px-2 sm:px-3"
                >
                  <SkipForward className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Next</span>
                </Button>
                <Button
                  onClick={() => onEndDebate()}
                  size="sm"
                  variant="outline"
                  className="text-[10px] sm:text-xs border-red-500/50 text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 sm:h-8 px-2 sm:px-3"
                >
                  <Square className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">End</span>
                </Button>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: TEAM AGAINST */}
          <div className="flex-1 flex flex-col border-l border-red-500/30 bg-gradient-to-b from-red-900/10 to-transparent min-w-0">
            {/* Team Header */}
            <div className="flex items-center justify-between p-2 sm:p-3 border-b border-red-500/20">
              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500 flex-shrink-0" />
                <h3 className="text-red-400 font-bold text-sm sm:text-lg truncate">TEAM AGAINST</h3>
                <Badge variant="outline" className="bg-red-500/20 border-red-500 text-red-300 text-xs flex-shrink-0">
                  {againstPanelTracks.length}
                </Badge>
              </div>
              {userSide === DebateSide.AGAINST && (
                <Button 
                  onClick={onPressBuzzer}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Buzz
                </Button>
              )}
            </div>
            
            {/* Video Grid for Team AGAINST */}
            <div className="flex-1 p-2 sm:p-3 overflow-auto">
              <TeamVideoGrid 
                tracks={againstPanelTracks} 
                teamColor="red"
                currentSpeakerId={debateState?.currentSpeakerId}
                pinnedParticipantId={pinnedParticipantId}
                onTogglePin={togglePin}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="absolute md:relative right-0 top-0 bottom-0 w-full md:w-80 bg-[#1f1f1f] border-l border-white/10 flex flex-col z-30">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setSidebarTab('teams')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                  sidebarTab === 'teams' ? 'text-white border-b-2 border-green-500' : 'text-white/50 hover:text-white/70'
                )}
              >
                <Users className="h-4 w-4" />
                Teams
              </button>
              <button
                onClick={() => setSidebarTab('chat')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                  sidebarTab === 'chat' ? 'text-white border-b-2 border-green-500' : 'text-white/50 hover:text-white/70'
                )}
              >
                <MessageSquare className="h-4 w-4" />
                Chat
              </button>
              {isModerator && (
                <button
                  onClick={() => setSidebarTab('evaluation')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                    sidebarTab === 'evaluation'
                      ? 'text-white border-b-2 border-yellow-500'
                      : 'text-white/50 hover:text-white/70',
                  )}
                >
                  <Shield className="h-4 w-4" />
                  Evaluate
                </button>
              )}
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-hidden">
              {sidebarTab === 'teams' ? (
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {/* Moderators Section */}
                    {moderators.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          <span className="text-xs font-semibold text-yellow-500 uppercase tracking-wide">Moderators</span>
                          <span className="text-xs text-white/40">({moderators.length})</span>
                        </div>
                        <div className="space-y-2">
                          {moderators.map((mod) => (
                            <div key={mod.userId} className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors">
                              <Avatar className="h-8 w-8 border-2 border-yellow-500/50">
                                <AvatarImage src={mod.avatarUrl || undefined} />
                                <AvatarFallback className="text-xs bg-yellow-500/20 text-yellow-400">
                                  {mod.name?.charAt(0)?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{mod.name}</p>
                                <p className="text-xs text-white/50">Moderator</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Room settings (start + total session length) */}
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-3.5 w-3.5 text-white/50" />
                        <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">
                          Room settings
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 text-xs">
                        <span className="text-white/50 shrink-0">Start time</span>
                        <span className="text-white text-right max-w-[min(100%,14rem)]">
                          {debateRoom.scheduledAt
                            ? new Date(debateRoom.scheduledAt).toLocaleString()
                            : debateRoom.startTime
                              ? new Date(debateRoom.startTime).toLocaleString()
                              : debateRoom.status === DebateStatus.WAITING
                                ? 'Flexible'
                                : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 text-xs">
                        <span className="text-white/50">Debate duration</span>
                        <span className="text-white font-medium text-right">
                          {debateRoom.debateDurationMinutes != null ? (
                            `${debateRoom.debateDurationMinutes} min`
                          ) : (
                            <>
                              ~
                              {estimateDebateSessionMinutes(
                                debateRoom.turnDurationSeconds,
                                debateRoom.maxParticipants,
                              )}{' '}
                              min
                              <span className="text-white/50 font-normal"> (est.)</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    
                    {/* Team FOR Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Team For</span>
                        <span className="text-xs text-white/40">({debateRoom.teams.find(t => t.side === DebateSide.FOR)?.participants.length || 0})</span>
                      </div>
                      <div className="space-y-2">
                        {debateRoom.teams.find(t => t.side === DebateSide.FOR)?.participants.map((p) => (
                          <div 
                            key={p.id} 
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-lg transition-colors",
                              p.id === debateState?.currentSpeakerId
                                ? "bg-yellow-500/20 ring-2 ring-yellow-500/50"
                                : "bg-green-500/10 hover:bg-green-500/20"
                            )}
                          >
                            <Avatar className={cn(
                              "h-8 w-8 border-2",
                              p.id === debateState?.currentSpeakerId
                                ? "border-yellow-500"
                                : "border-green-500/50"
                            )}>
                              <AvatarImage src={p.user.avatar || undefined} />
                              <AvatarFallback className="text-xs bg-green-500/20 text-green-400">
                                {p.user.name?.charAt(0)?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{p.user.name}</p>
                              {p.id === debateState?.currentSpeakerId && (
                                <p className="text-xs text-yellow-400">Speaking now</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Team AGAINST Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">Team Against</span>
                        <span className="text-xs text-white/40">({debateRoom.teams.find(t => t.side === DebateSide.AGAINST)?.participants.length || 0})</span>
                      </div>
                      <div className="space-y-2">
                        {debateRoom.teams.find(t => t.side === DebateSide.AGAINST)?.participants.map((p) => (
                          <div 
                            key={p.id} 
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-lg transition-colors",
                              p.id === debateState?.currentSpeakerId
                                ? "bg-yellow-500/20 ring-2 ring-yellow-500/50"
                                : "bg-red-500/10 hover:bg-red-500/20"
                            )}
                          >
                            <Avatar className={cn(
                              "h-8 w-8 border-2",
                              p.id === debateState?.currentSpeakerId
                                ? "border-yellow-500"
                                : "border-red-500/50"
                            )}>
                              <AvatarImage src={p.user.avatar || undefined} />
                              <AvatarFallback className="text-xs bg-red-500/20 text-red-400">
                                {p.user.name?.charAt(0)?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{p.user.name}</p>
                              {p.id === debateState?.currentSpeakerId && (
                                <p className="text-xs text-yellow-400">Speaking now</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Buzzer Queue */}
                    {buzzerQueue.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-white/70 text-sm font-medium mb-2">Buzzer Queue</h4>
                        <div className="space-y-2">
                          {buzzerQueue.map((buzz, index) => (
                            <div key={`${buzz.participantId}-${index}`} className="flex items-center gap-2 text-sm text-white/60">
                              <span className="text-yellow-500 font-bold">{index + 1}.</span>
                              <span>{buzz.participantName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : sidebarTab === 'chat' ? (
                <div className="h-full flex flex-col">
                  {/* Chat Header with message count */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                    <span className="text-xs text-white/50">
                      {isLoadingMessages ? 'Loading messages...' : `${chatMessages.length} ${chatMessages.length === 1 ? 'message' : 'messages'}`}
                    </span>
                    {(userRole === 'host' || userRole === 'moderator') && chatMessages.length > 0 && (
                      <button
                        onClick={clearChatHistory}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Clear History
                      </button>
                    )}
                  </div>
                  
                  {/* LiveKit Chat UI */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-3">
                      {chatMessages.length === 0 ? (
                        <div className="flex items-center justify-center h-32">
                          <p className="text-white/50 text-sm text-center px-4">
                            {isLoadingMessages ? 'Loading messages...' : 'No messages yet. Start the conversation!'}
                          </p>
                        </div>
                      ) : (
                        chatMessages.map((msg) => {
                          const isOwnMessage = msg.senderId === userId;
                          
                          // Determine message badge (visibility indicator)
                          let visibilityBadge = '';
                          const visibility = msg.visibility;
                          if (visibility === 'MODERATOR_ONLY') {
                            visibilityBadge = '🔒 Moderators Only';
                          } else if (visibility === 'MODERATOR') {
                            visibilityBadge = '📢 Broadcast';
                          } else if (visibility === 'TEAM_FOR') {
                            visibilityBadge = '🟢 Team FOR';
                          } else if (visibility === 'TEAM_AGAINST') {
                            visibilityBadge = '🔴 Team AGAINST';
                          }
                          
                          return (
                            <div key={msg.id} className={cn(
                              "flex gap-2",
                              isOwnMessage && "flex-row-reverse"
                            )}>
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                {msg.senderAvatar && <AvatarImage src={msg.senderAvatar} />}
                                <AvatarFallback className="text-xs bg-white/10 text-white">
                                  {msg.senderName?.charAt(0)?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className={cn(
                                "flex-1 min-w-0",
                                isOwnMessage && "flex flex-col items-end"
                              )}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={cn(
                                    "text-xs font-medium",
                                    visibility === 'MODERATOR' || visibility === 'MODERATOR_ONLY' ? "text-yellow-400" :
                                    visibility === 'TEAM_FOR' ? "text-green-400" :
                                    visibility === 'TEAM_AGAINST' ? "text-red-400" :
                                    "text-white/70"
                                  )}>
                                    {msg.senderName}
                                  </span>
                                  {visibilityBadge && (
                                    <span className="text-xs text-white/40">
                                      {visibilityBadge}
                                    </span>
                                  )}
                                  <span className="text-xs text-white/40">
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div className={cn(
                                  "rounded-lg px-3 py-2 max-w-[85%] break-words",
                                  isOwnMessage 
                                    ? "bg-green-600 text-white" 
                                    : "bg-white/10 text-white"
                                )}>
                                  <p className="text-sm">{msg.content}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      {/* Scroll anchor */}
                      <div ref={chatScrollRef} />
                    </div>
                  </ScrollArea>
                  
                  {/* Chat Input */}
                  <div className="border-t border-white/10 p-2 sm:p-3 flex-shrink-0">
                    {/* Moderator-only toggle */}
                    {(userRole === 'host' || userRole === 'moderator') && (
                      <div className="mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                        <input
                          type="checkbox"
                          id="moderator-only"
                          checked={isModeratorOnly}
                          onChange={(e) => setIsModeratorOnly(e.target.checked)}
                          className="rounded border-white/20 text-yellow-500 focus:ring-yellow-500/20 h-3 w-3 sm:h-4 sm:w-4"
                        />
                        <label htmlFor="moderator-only" className="text-[10px] sm:text-xs text-white/60 cursor-pointer">
                          🔒 <span className="hidden sm:inline">Send to moderators only (private)</span><span className="sm:hidden">Private</span>
                        </label>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendChatMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-green-500/50 focus:ring-green-500/20 text-sm sm:text-base h-8 sm:h-9"
                      />
                      <Button
                        onClick={sendChatMessage}
                        disabled={!chatInput.trim()}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white h-8 w-8 sm:h-9 sm:w-auto sm:px-3 p-0 sm:p-2"
                      >
                        <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                    <p className="text-[10px] sm:text-xs text-white/40 mt-1.5 sm:mt-2">
                      {(userRole === 'host' || userRole === 'moderator')
                        ? isModeratorOnly
                          ? "Sending private message to moderators only" 
                          : "Broadcasting to everyone" 
                        : userSide 
                          ? `Messages visible to your team and moderators`
                          : "Join a team to start chatting"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full">
                  {currentSpeakerParticipant ? (
                    <ModeratorEvaluationPanel
                      debateRoomId={debateRoom.id}
                      participantId={currentSpeakerParticipant.id}
                      participantName={currentSpeakerParticipant.user.name}
                      turnNumber={currentTurnNumber}
                      initialNotes={existingEvaluation?.notes}
                      initialScores={existingEvaluation?.scores as Record<string, number> | undefined}
                      isSaving={upsertModeratorEvaluation.isPending}
                      onSave={handleSaveModeratorEvaluation}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center p-6 text-center text-white/60">
                      No active speaker right now. Evaluation panel appears when a participant is speaking.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar - Fixed at bottom */}
      <div className="h-16 sm:h-20 bg-[#1f1f1f] border-t border-white/10 flex items-center justify-center gap-2 sm:gap-3 px-2 sm:px-4 flex-shrink-0 z-50">
        {/* Connection status indicator */}
        {!isRoomConnected && (
          <div className="absolute left-2 sm:left-4 flex items-center gap-1.5 sm:gap-2 text-yellow-500 text-xs sm:text-sm">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="hidden sm:inline">Connecting...</span>
          </div>
        )}

        {/* Video Toggle */}
        <Button
          onClick={async () => {
            try {
              const participant = room?.localParticipant;
              if (!participant) {
                console.warn('[DebateRoom] No local participant');
                return;
              }
              // Check if room is connected
              if (room?.state !== 'connected') {
                console.warn('[DebateRoom] Room not connected yet, state:', room?.state);
                alert('Please wait for the room to connect before enabling camera.');
                return;
              }
              const newState = !participant.isCameraEnabled;
              console.log('[DebateRoom] Toggling camera to:', newState, 'Room state:', room?.state);
              await participant.setCameraEnabled(newState);
            } catch (err) {
              const error = err as Error & { name?: string; message?: string };
              if (error?.name === 'NotReadableError' || error?.message?.includes('Device in use')) {
                alert('Camera is being used by another application.');
              } else if (error?.name === 'NotAllowedError') {
                alert('Camera access was denied. Please allow camera permissions.');
              } else if (error?.name === 'NotFoundError') {
                alert('No camera found. Please connect a camera.');
              } else if (error?.message?.includes('not connected')) {
                alert('Room is not connected yet. Please wait a moment and try again.');
              } else {
                console.error('[DebateRoom] Camera error:', err);
                alert(`Camera error: ${error?.message || 'Unknown error'}`);
              }
            }
          }}
          disabled={!isRoomConnected}
          variant="ghost"
          size="lg"
          className={cn(
            'h-10 w-10 sm:h-12 sm:w-12 rounded-full transition-all p-0',
            !isRoomConnected && 'opacity-50 cursor-not-allowed',
            localParticipant?.isCameraEnabled
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          )}
          title={localParticipant?.isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {localParticipant?.isCameraEnabled 
            ? <Video className="h-5 w-5 sm:h-6 sm:w-6" /> 
            : <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" />}
        </Button>

        {/* Mic Toggle */}
        <div className="relative">
          <Button
            onClick={toggleMicrophone}
            disabled={!isRoomConnected || !canToggleMic}
            variant="ghost"
            size="lg"
            className={cn(
              'h-10 w-10 sm:h-12 sm:w-12 rounded-full transition-all p-0',
              (!isRoomConnected || !canToggleMic) && 'opacity-50 cursor-not-allowed',
              localParticipant?.isMicrophoneEnabled
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white',
              isMicLocked && 'ring-2 ring-yellow-500/50'
            )}
            title={
              isMicLocked && micLockReason
                ? micLockReason
                : localParticipant?.isMicrophoneEnabled
                ? 'Mute'
                : 'Unmute'
            }
          >
            {localParticipant?.isMicrophoneEnabled 
              ? <Mic className="h-5 w-5 sm:h-6 sm:w-6" /> 
              : <MicOff className="h-5 w-5 sm:h-6 sm:w-6" />}
          </Button>
          {isMicLocked && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-[#202124]" />
          )}
          {isUserTurn && isLive && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#202124] animate-pulse" />
          )}
        </div>

        {/* Audio Output Toggle */}
        <Button
          onClick={toggleAudioOutput}
          variant="ghost"
          size="lg"
          className={cn(
            'hidden md:flex h-12 w-12 rounded-full transition-all p-0',
            isAudioOutputEnabled 
              ? 'bg-white/10 hover:bg-white/20 text-white' 
              : 'bg-white/5 hover:bg-white/10 text-white/50'
          )}
          title={isAudioOutputEnabled ? 'Mute all' : 'Unmute all'}
        >
          {isAudioOutputEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
        </Button>

        {/* Screen Share Toggle */}
        <Button
          onClick={async () => {
            try {
              const participant = room?.localParticipant;
              if (!participant) return;
              const newState = !participant.isScreenShareEnabled;
              if (newState) {
                // Enable screen share with audio capture
                const optionsWithAudio = { 
                  audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                  }
                };
                await participant.setScreenShareEnabled(newState, optionsWithAudio);
              } else {
                await participant.setScreenShareEnabled(newState);
              }
            } catch (err) {
              console.error('[DebateRoom] Screen share error:', err);
            }
          }}
          variant="ghost"
          size="lg"
          className={cn(
            'hidden md:flex h-12 w-12 rounded-full transition-all p-0',
            localParticipant?.isScreenShareEnabled
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-white/10 hover:bg-white/20 text-white'
          )}
          title={localParticipant?.isScreenShareEnabled ? 'Stop sharing' : 'Share screen'}
        >
          {localParticipant?.isScreenShareEnabled 
            ? <MonitorOff className="h-6 w-6" /> 
            : <MonitorUp className="h-6 w-6" />}
        </Button>

        {/* Leave Button */}
        <Button
          onClick={async () => {
            try {
              if (room) {
                await room.disconnect();
              }
            } catch (err) {
              console.error('[DebateRoom] Disconnect error:', err);
            } finally {
              onLeave();
            }
          }}
          variant="ghost"
          size="lg"
          className="h-10 w-10 sm:h-12 sm:w-auto sm:px-4 md:px-6 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium"
        >
          <PhoneOff className="h-5 w-5 sm:mr-2" />
          <span className="hidden sm:inline">Leave</span>
        </Button>
      </div>
    </div>
  );
}

// Team Video Grid Component
interface TeamVideoGridProps {
  tracks: TrackReferenceOrPlaceholder[];
  teamColor: 'green' | 'red';
  currentSpeakerId?: string | null;
  pinnedParticipantId: string | null;
  onTogglePin: (id: string) => void;
}

function TeamVideoGrid({ tracks, teamColor, currentSpeakerId, pinnedParticipantId, onTogglePin }: TeamVideoGridProps) {
  const borderColor = teamColor === 'green' ? 'border-green-500' : 'border-red-500';
  const shadowColor = teamColor === 'green' ? 'shadow-green-500/30' : 'shadow-red-500/30';

  if (tracks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-white/40">
          <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No participants</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "grid gap-2 sm:gap-3 h-full",
      tracks.length === 1 && "grid-cols-1",
      tracks.length === 2 && "grid-cols-1 sm:grid-cols-2",
      tracks.length >= 3 && "grid-cols-1 sm:grid-cols-2"
    )}>
      {tracks.map((trackRef) => {
        const isLocal = trackRef.participant.isLocal;
        const hasVideo = isTrackReference(trackRef) && trackRef.publication?.track;
        const isSpeaking = trackRef.participant.isSpeaking;
        const isCurrentSpeaker = currentSpeakerId === trackRef.participant.identity;

        // Extract avatar from participant metadata
        let avatarUrl: string | undefined = undefined;
        if (trackRef.participant.metadata) {
          try {
            const metadata = JSON.parse(trackRef.participant.metadata);
            avatarUrl = metadata.avatar || undefined;
          } catch (e) {
            // Silently handle parsing errors
          }
        }

        return (
          <div
            key={trackRef.participant.identity}
            className={cn(
              'relative rounded-xl overflow-hidden bg-gray-800 aspect-video',
              isSpeaking && `ring-2 ring-offset-2 ring-offset-gray-900 ${teamColor === 'green' ? 'ring-green-500' : 'ring-red-500'}`,
              isCurrentSpeaker && `border-2 ${borderColor} shadow-lg ${shadowColor}`
            )}
          >
            {/* Avatar placeholder - always visible as background */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 z-[1]">
              <Avatar className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 border-2 sm:border-4 border-gray-700">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-gray-700 text-white text-lg sm:text-2xl">
                  {(isLocal ? 'You' : (trackRef.participant.name || trackRef.participant.identity)).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="mt-2 sm:mt-3 text-white/90 text-xs sm:text-sm font-medium px-2 text-center truncate w-full">
                {isLocal ? 'You' : (trackRef.participant.name || trackRef.participant.identity)}
              </p>
            </div>

            {/* Video layer - on top when available */}
            {hasVideo && (
              <div className="absolute inset-0 z-[2]">
                <VideoTrack 
                  trackRef={trackRef} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Pin button overlay */}
            <div className="absolute top-2 left-2 z-[20] opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTogglePin(trackRef.participant.identity)}
                className={cn(
                  "h-7 w-7 p-0 rounded-full border backdrop-blur-md",
                  pinnedParticipantId === trackRef.participant.identity
                    ? "bg-blue-600 border-blue-400 text-white"
                    : "bg-black/40 border-white/10 text-white/70 hover:bg-black/60 hover:text-white"
                )}
              >
                {pinnedParticipantId === trackRef.participant.identity ? (
                  <PinOff className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>

            {/* Name label */}
            <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2 right-1 sm:right-2 flex items-center justify-between z-[10]">
              <span className="text-white text-xs sm:text-sm bg-black/60 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded backdrop-blur-sm truncate">
                {isLocal ? 'You' : (trackRef.participant.name || trackRef.participant.identity)}
              </span>
              {isSpeaking && (
                <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500 animate-pulse flex-shrink-0 ml-1 sm:ml-2" />
              )}
            </div>

            {/* Current speaker badge */}
            {isCurrentSpeaker && (
              <div className="absolute top-1 sm:top-2 left-1 sm:left-2 bg-yellow-500 text-black text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-bold z-[10]">
                Speaking
              </div>
            )}

            {/* Video off indicator */}
            {!hasVideo && (
              <div className="absolute top-2 right-2 z-[10]">
                <VideoOff className="h-4 w-4 text-white/50" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}