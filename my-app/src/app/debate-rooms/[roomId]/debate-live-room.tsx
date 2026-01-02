'use client';

import { useState, useCallback } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  VideoTrack,
  useParticipants,
  useLocalParticipant,
} from '@livekit/components-react';
import { Track, RoomOptions, VideoPresets } from 'livekit-client';
import '@livekit/components-styles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Crown,
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
  DebateTeamChat,
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

  const handleLeave = useCallback(() => {
    router.push(`/debate-rooms/${room.id}`);
  }, [router, room.id]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#202124] overflow-hidden">
      <LiveKitRoom
        video={true}
        audio={true}
        token={livekitToken}
        serverUrl={livekitServerUrl}
        connect={true}
        className="flex-1 flex flex-col overflow-hidden"
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
        } as RoomOptions}
      >
        <DebateLiveContent
          room={room}
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
  room: DebateRoom;
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
  room,
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

  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();

  // Get video tracks
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const toggleVideo = async () => {
    await localParticipant.setCameraEnabled(!isVideoEnabled);
    setIsVideoEnabled(!isVideoEnabled);
  };

  const toggleAudio = async () => {
    await localParticipant.setMicrophoneEnabled(!isAudioEnabled);
    setIsAudioEnabled(!isAudioEnabled);
  };

  const isModerator = userRole === 'host' || userRole === 'moderator';
  const isParticipant = userRole === 'participant';
  const isPrepPhase = room.status === DebateStatus.PREP;
  const isLive = room.status === DebateStatus.LIVE;

  // Find current speaker
  const currentSpeaker = room.teams
    .flatMap((t) => t.participants)
    .find((p) => p.id === room.currentSpeakerId);

  // Check if it's user's turn
  const isUserTurn = currentSpeaker?.user.id === userId;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-[#1a1a1d] border-b border-white/10 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-white font-medium truncate max-w-[300px]">
              {room.topic}
            </h1>
            <Badge
              variant="outline"
              className={cn(
                'text-white border-white/30',
                isPrepPhase && 'bg-blue-500/20 border-blue-500',
                isLive && 'bg-green-500/20 border-green-500'
              )}
            >
              {isPrepPhase ? 'Prep Phase' : '🔴 LIVE'}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            {/* Timer */}
            {isLive && (
              <div className="flex items-center gap-2 text-white">
                <Clock className="h-4 w-4" />
                <DebateTurnTimer
                  turnDurationSeconds={room.turnDurationSeconds}
                  turnStartedAt={room.turnStartedAt || null}
                  isActive={!!room.currentSpeakerId}
                  className="bg-transparent border-none p-0"
                />
              </div>
            )}

            {/* Participant count */}
            <div className="flex items-center gap-1 text-white/60 text-sm">
              <Users className="h-4 w-4" />
              <span>{participants.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 p-4 overflow-hidden">
          {/* Prep Countdown */}
          {isPrepPhase && prepCountdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <PrepCountdown secondsRemaining={prepCountdown} />
            </div>
          )}

          {/* Current Speaker Highlight */}
          {isLive && currentSpeaker && (
            <div className="mb-4 p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/50">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-yellow-500">
                  <AvatarImage src={currentSpeaker.user.avatar || undefined} />
                  <AvatarFallback>
                    {currentSpeaker.user.name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      {currentSpeaker.user.name}
                    </span>
                    {isUserTurn && (
                      <Badge className="bg-yellow-500 text-black">Your Turn!</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        currentSpeaker.side === DebateSide.FOR
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      )}
                    />
                    <span className="text-white/60">
                      Team {currentSpeaker.side}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Video Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 h-full">
            {tracks
              .filter((track) => track.source === Track.Source.Camera)
              .map((trackRef) => (
                <div
                  key={trackRef.participant.identity}
                  className={cn(
                    'relative rounded-lg overflow-hidden bg-[#3c4043]',
                    trackRef.participant.identity === room.currentSpeakerId &&
                      'ring-2 ring-yellow-500'
                  )}
                >
                  {trackRef.publication?.isSubscribed ? (
                    <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="text-2xl">
                          {trackRef.participant.name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                      {trackRef.participant.name}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 bg-[#1a1a1d] border-l border-white/10 flex flex-col">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setSidebarTab('teams')}
                className={cn(
                  'flex-1 py-3 text-sm font-medium transition-colors',
                  sidebarTab === 'teams'
                    ? 'text-white border-b-2 border-primary'
                    : 'text-white/60 hover:text-white'
                )}
              >
                <Users className="h-4 w-4 inline mr-2" />
                Teams
              </button>
              <button
                onClick={() => setSidebarTab('chat')}
                className={cn(
                  'flex-1 py-3 text-sm font-medium transition-colors',
                  sidebarTab === 'chat'
                    ? 'text-white border-b-2 border-primary'
                    : 'text-white/60 hover:text-white'
                )}
              >
                <MessageSquare className="h-4 w-4 inline mr-2" />
                Team Chat
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-hidden p-4">
              {sidebarTab === 'teams' ? (
                <ScrollArea className="h-full">
                  <CompactTeamsDisplay
                    teams={room.teams}
                    currentSpeakerId={room.currentSpeakerId}
                  />

                  {/* Buzzer */}
                  {isParticipant && isLive && (
                    <div className="mt-4">
                      <DebateBuzzer
                        onPress={onPressBuzzer}
                        isDisabled={isUserTurn}
                        isYourTurn={isUserTurn}
                        buzzerQueue={buzzerQueue}
                        currentUserId={userId}
                      />
                    </div>
                  )}

                  {/* Moderator Controls */}
                  {isModerator && isLive && (
                    <div className="mt-4 space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={onAdvanceTurn}
                      >
                        <SkipForward className="h-4 w-4 mr-2" />
                        Next Turn
                      </Button>
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => onEndDebate('manual')}
                      >
                        <Square className="h-4 w-4 mr-2" />
                        End Debate
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              ) : (
                <DebateTeamChat
                  messages={teamChatMessages}
                  onSendMessage={onSendTeamChat}
                  userSide={userSide}
                  currentUserId={userId}
                  className="h-full"
                />
              )}
            </div>
          </div>
        )}

        {/* Sidebar Toggle */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#3c4043] p-2 rounded-l-lg"
        >
          {showSidebar ? (
            <ChevronRight className="h-4 w-4 text-white" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-white" />
          )}
        </button>
      </div>

      {/* Controls */}
      <div className="bg-[#1a1a1d] border-t border-white/10 px-4 py-3">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={isAudioEnabled ? 'outline' : 'destructive'}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={toggleAudio}
          >
            {isAudioEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant={isVideoEnabled ? 'outline' : 'destructive'}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={toggleVideo}
          >
            {isVideoEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={onLeave}
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
