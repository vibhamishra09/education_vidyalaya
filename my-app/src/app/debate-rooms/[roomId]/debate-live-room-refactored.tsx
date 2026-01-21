'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
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
  useDataChannel,
} from '@livekit/components-react';
import { Track, RoomOptions, VideoPresets, RoomEvent, DataPacket_Kind, RemoteParticipant } from 'livekit-client';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  DebateRoom,
  DebateState,
  DebateSide,
  DebateStatus,
  TeamChatMessage,
  BuzzerPressedEvent,
  DebateUserRole,
} from '@/types/debate.types';
import {
  DebateTurnTimer,
  PrepCountdown,
  DebateBuzzer,
  CompactTeamsDisplay,
} from '@/components/debate';

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
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
  side: DebateSide | 'MODERATOR' | 'ALL';
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
}: DebateLiveRoomProps) {
  const router = useRouter();

  const handleLeave = useCallback(async () => {
    router.push('/debate-rooms');
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
    console.log('[DebateLiveRoom] User Role:', userRole);
    console.log('[DebateLiveRoom] User Side:', userSide);
  }, [livekitToken, livekitServerUrl, room.livekitRoomName, room.id, userRole, userSide]);

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
            resolution: VideoPresets.h720,
          },
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: {
            videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
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
          onLeave={handleLeave}
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
  onLeave: () => void;
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
  onLeave,
}: DebateLiveContentProps) {
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'teams' | 'chat'>('teams');
  const [isAudioOutputEnabled, setIsAudioOutputEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<'speaker' | 'grid'>('speaker');
  const [isRoomConnected, setIsRoomConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

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

  // LiveKit Chat - Data Channel
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: RemoteParticipant,
      _kind?: DataPacket_Kind
    ) => {
      const decoder = new TextDecoder();
      const text = decoder.decode(payload);
      
      try {
        const data = JSON.parse(text);
        if (data.type === 'chat') {
          const newMessage: ChatMessage = {
            id: data.id || Date.now().toString(),
            senderId: participant?.identity || 'unknown',
            senderName: participant?.name || 'Unknown',
            message: data.message,
            timestamp: data.timestamp || Date.now(),
            side: data.side || 'ALL',
          };
          
          // Filter messages based on user role
          const isModerator = userRole === 'moderator';
          const canSeeMessage = isModerator || 
                                newMessage.side === 'ALL' || 
                                newMessage.side === 'MODERATOR' ||
                                newMessage.side === userSide;
          
          if (canSeeMessage) {
            setChatMessages(prev => [...prev, newMessage]);
            console.log('[DebateRoom] Chat message received:', newMessage);
          }
        }
      } catch (err) {
        console.error('[DebateRoom] Failed to parse chat message:', err);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, userRole, userSide]);

  // Send chat message
  const sendChatMessage = useCallback(async () => {
    if (!room || !localParticipant || !chatInput.trim()) return;

    try {
      const isModerator = userRole === 'moderator';
      const message: ChatMessage = {
        id: Date.now().toString(),
        senderId: localParticipant.identity,
        senderName: localParticipant.name || 'You',
        message: chatInput,
        timestamp: Date.now(),
        side: isModerator ? 'ALL' : userSide || 'ALL',
      };

      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({
        type: 'chat',
        ...message,
      }));

      await room.localParticipant.publishData(data, { reliable: true });
      setChatMessages(prev => [...prev, message]);
      setChatInput('');
      console.log('[DebateRoom] Chat message sent:', message);
    } catch (err) {
      console.error('[DebateRoom] Failed to send chat message:', err);
    }
  }, [room, localParticipant, chatInput, userRole, userSide]);

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

  // Toggle microphone with proper error handling
  const toggleMicrophone = useCallback(async () => {
    if (!localParticipant) return;

    try {
      await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
      console.log('[DebateRoom] Microphone toggled:', !localParticipant.isMicrophoneEnabled);
    } catch (err) {
      console.error('[DebateRoom] Microphone toggle error:', err);
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
  const getParticipantSide = useCallback((identity: string): DebateSide | 'MODERATOR' => {
    if (!identity) return 'MODERATOR';

    const forTeam = debateRoom.teams.find(t => t.side === DebateSide.FOR);
    const againstTeam = debateRoom.teams.find(t => t.side === DebateSide.AGAINST);

    if (forTeam?.participants.some(p => p.user.id === identity || p.user.clerkId === identity)) return DebateSide.FOR;
    if (againstTeam?.participants.some(p => p.user.id === identity || p.user.clerkId === identity)) return DebateSide.AGAINST;
    
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

  // Filter tracks by team side
  const { forTracks, againstTracks, moderatorTracks, allTracks } = useMemo(() => {
    const forTracks: TrackReferenceOrPlaceholder[] = [];
    const againstTracks: TrackReferenceOrPlaceholder[] = [];
    const moderatorTracks: TrackReferenceOrPlaceholder[] = [];

    cameraTracks.forEach(track => {
      const side = getParticipantSide(track.participant.identity);
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

  // Get speaking participant
  const getSpeakingParticipant = useCallback(() => {
    if (speakingParticipants.length === 0) return null;
    const speaking = speakingParticipants[0];
    return cameraTracks.find(t => t.participant.identity === speaking.identity);
  }, [speakingParticipants, cameraTracks]);

  const isModerator = userRole === 'moderator';
  const isPrepPhase = debateRoom.status === DebateStatus.PREP;

  return (
    <>
      {/* Header */}
      <div className="h-16 bg-[#2d2d30] border-b border-gray-700 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-white font-semibold">{debateRoom.topic}</h1>
            <div className="flex items-center gap-2">
              <Badge variant={isPrepPhase ? 'secondary' : 'default'}>
                {isPrepPhase ? 'Prep Phase' : 'Live'}
              </Badge>
              {debateState && (
                <span className="text-sm text-gray-400">
                  Turn: {debateState.currentTurnIndex + 1}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === 'speaker' ? 'default' : 'ghost'}
              onClick={() => setViewMode('speaker')}
              className="h-8"
            >
              <Focus className="h-4 w-4 mr-1" />
              Speaker
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className="h-8"
            >
              <Grid2X2 className="h-4 w-4 mr-1" />
              Grid
            </Button>
          </div>

          {/* Connection Status */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-lg text-sm",
            isRoomConnected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>
            <div className={cn("w-2 h-2 rounded-full", isRoomConnected ? "bg-green-400" : "bg-red-400")} />
            {isRoomConnected ? 'Connected' : 'Connecting...'}
          </div>

          <div className="text-white text-sm">
            {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 overflow-hidden relative">
          {viewMode === 'speaker' ? (
            /* SPEAKER VIEW - VS Layout */
            <div className="h-full w-full flex items-center justify-center gap-2 p-4">
              {/* Team FOR Panel */}
              <div className="flex-1 h-full flex flex-col bg-green-900/10 border border-green-500/30 rounded-lg overflow-hidden">
                <div className="bg-green-900/30 px-4 py-2 border-b border-green-500/30">
                  <h3 className="text-green-400 font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    TEAM FOR ({forTracks.length})
                  </h3>
                </div>
                <div className="flex-1 p-2 grid grid-cols-1 gap-2">
                  {forTracks.length > 0 ? (
                    forTracks.map((track, idx) => (
                      <VideoTile key={idx} track={track} />
                    ))
                  ) : (
                    <EmptyVideoTile text="No Team FOR participants" />
                  )}
                </div>
              </div>

              {/* Center VS Divider */}
              <div className="flex flex-col items-center justify-center px-6">
                <div className="text-6xl font-bold text-white opacity-50">VS</div>
                {prepCountdown !== null && prepCountdown > 0 && (
                  <PrepCountdown secondsRemaining={prepCountdown} />
                )}
                {debateState && debateState.status === DebateStatus.LIVE && (
                  <DebateTurnTimer
                    turnDurationSeconds={debateState.turnDurationSeconds}
                    turnStartedAt={debateState.turnStartedAt}
                    isActive={!!debateState.currentSpeakerId}
                  />
                )}
              </div>

              {/* Team AGAINST Panel */}
              <div className="flex-1 h-full flex flex-col bg-red-900/10 border border-red-500/30 rounded-lg overflow-hidden">
                <div className="bg-red-900/30 px-4 py-2 border-b border-red-500/30">
                  <h3 className="text-red-400 font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    TEAM AGAINST ({againstTracks.length})
                  </h3>
                </div>
                <div className="flex-1 p-2 grid grid-cols-1 gap-2">
                  {againstTracks.length > 0 ? (
                    againstTracks.map((track, idx) => (
                      <VideoTile key={idx} track={track} />
                    ))
                  ) : (
                    <EmptyVideoTile text="No Team AGAINST participants" />
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* GRID VIEW - All Participants in One Grid */
            <div className="h-full w-full p-4">
              <div className="h-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-fr">
                {allTracks.map((track, idx) => (
                  <VideoTile 
                    key={idx} 
                    track={track} 
                    showSide
                    side={getParticipantSide(track.participant.identity)}
                  />
                ))}
                {allTracks.length === 0 && (
                  <div className="col-span-full flex items-center justify-center">
                    <EmptyVideoTile text="No participants in room" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 bg-[#252526] border-l border-gray-700 flex flex-col">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setSidebarTab('teams')}
                className={cn(
                  "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                  sidebarTab === 'teams'
                    ? "text-white bg-[#2d2d30] border-b-2 border-blue-500"
                    : "text-gray-400 hover:text-white"
                )}
              >
                <Users className="h-4 w-4 inline mr-2" />
                Teams
              </button>
              <button
                onClick={() => setSidebarTab('chat')}
                className={cn(
                  "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                  sidebarTab === 'chat'
                    ? "text-white bg-[#2d2d30] border-b-2 border-blue-500"
                    : "text-gray-400 hover:text-white"
                )}
              >
                <MessageSquare className="h-4 w-4 inline mr-2" />
                Chat
              </button>
            </div>

            {/* Sidebar Content */}
            {sidebarTab === 'teams' ? (
              <ScrollArea className="flex-1 p-4">
                {/* Moderators */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <h3 className="text-white font-semibold">Moderators ({moderators.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {moderators.map((mod, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-yellow-900/10 rounded-lg border border-yellow-500/20">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={mod.avatarUrl || undefined} />
                          <AvatarFallback>{mod.name?.[0] || 'M'}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-white">{mod.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team FOR */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-green-500" />
                    <h3 className="text-green-400 font-semibold">Team FOR ({debateRoom.teams.find(t => t.side === DebateSide.FOR)?.participants.length || 0})</h3>
                  </div>
                  <div className="space-y-2">
                    {debateRoom.teams.find(t => t.side === DebateSide.FOR)?.participants.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-green-900/10 rounded-lg border border-green-500/20">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={p.user.avatar || undefined} />
                          <AvatarFallback>{p.user.name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-white">{p.user.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team AGAINST */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-red-500" />
                    <h3 className="text-red-400 font-semibold">Team AGAINST ({debateRoom.teams.find(t => t.side === DebateSide.AGAINST)?.participants.length || 0})</h3>
                  </div>
                  <div className="space-y-2">
                    {debateRoom.teams.find(t => t.side === DebateSide.AGAINST)?.participants.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-red-900/10 rounded-lg border border-red-500/20">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={p.user.avatar || undefined} />
                          <AvatarFallback>{p.user.name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-white">{p.user.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            ) : (
              /* Chat Tab */
              <div className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className="bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-white">{msg.senderName}</span>
                          <Badge variant="outline" className="text-xs">
                            {msg.side === 'MODERATOR' ? 'Mod' : msg.side}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-300">{msg.message}</p>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                    {chatMessages.length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No messages yet</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t border-gray-700">
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder={isModerator ? "Message everyone..." : `Message team ${userSide}...`}
                      className="flex-1 bg-gray-800 border-gray-700 text-white"
                    />
                    <Button onClick={sendChatMessage} size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="h-20 bg-[#2d2d30] border-t border-gray-700 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Connection status indicator */}
          <div className="text-sm text-gray-400">
            {isRoomConnected ? '● Connected' : '○ Connecting...'}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Camera Toggle */}
          <Button
            size="lg"
            variant={localParticipant?.isCameraEnabled ? 'default' : 'destructive'}
            onClick={toggleCamera}
            disabled={!isRoomConnected}
            className="rounded-full w-12 h-12"
          >
            {localParticipant?.isCameraEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </Button>

          {/* Mic Toggle */}
          <Button
            size="lg"
            variant={localParticipant?.isMicrophoneEnabled ? 'default' : 'destructive'}
            onClick={toggleMicrophone}
            disabled={!isRoomConnected}
            className="rounded-full w-12 h-12"
          >
            {localParticipant?.isMicrophoneEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </Button>

          {/* Audio Output */}
          <Button
            size="lg"
            variant="secondary"
            onClick={toggleAudioOutput}
            className="rounded-full w-12 h-12"
          >
            {isAudioOutputEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </Button>

          {/* Leave */}
          <Button
            size="lg"
            variant="destructive"
            onClick={onLeave}
            className="rounded-full px-6"
          >
            <PhoneOff className="h-5 w-5 mr-2" />
            Leave
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Moderator Controls */}
          {isModerator && !isPrepPhase && (
            <>
              <Button onClick={onAdvanceTurn} variant="secondary">
                <SkipForward className="h-4 w-4 mr-2" />
                Next Turn
              </Button>
              <Button onClick={() => onEndDebate()} variant="destructive">
                <Square className="h-4 w-4 mr-2" />
                End Debate
              </Button>
            </>
          )}

          {/* Sidebar Toggle */}
          <Button
            size="lg"
            variant="ghost"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

// Video Tile Component
function VideoTile({ 
  track, 
  showSide, 
  side 
}: { 
  track: TrackReferenceOrPlaceholder; 
  showSide?: boolean;
  side?: DebateSide | 'MODERATOR';
}) {
  const isPlaceholder = !isTrackReference(track);
  
  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      {!isPlaceholder && track.publication ? (
        <VideoTrack
          trackRef={track}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <User className="h-12 w-12 text-gray-600" />
        </div>
      )}
      
      {/* Participant Name */}
      <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded-lg">
        <span className="text-white text-sm font-medium">
          {track.participant.name || track.participant.identity}
        </span>
      </div>

      {/* Side Badge */}
      {showSide && side && (
        <div className="absolute top-2 right-2">
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              side === DebateSide.FOR && "bg-green-900/50 border-green-500 text-green-400",
              side === DebateSide.AGAINST && "bg-red-900/50 border-red-500 text-red-400",
              side === 'MODERATOR' && "bg-yellow-900/50 border-yellow-500 text-yellow-400"
            )}
          >
            {side === 'MODERATOR' ? 'MOD' : side}
          </Badge>
        </div>
      )}

      {/* Camera Off Indicator */}
      {isPlaceholder && (
        <div className="absolute top-2 left-2 bg-red-500/80 px-2 py-1 rounded">
          <VideoOff className="h-3 w-3 text-white" />
        </div>
      )}
    </div>
  );
}

// Empty Video Tile
function EmptyVideoTile({ text }: { text: string }) {
  return (
    <div className="w-full h-full bg-gray-900 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center">
      <div className="text-center">
        <User className="h-12 w-12 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">{text}</p>
      </div>
    </div>
  );
}
