'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@clerk/nextjs';
import { Navigation } from '@/components/layout/navigation';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Users,
  Clock,
  Play,
  LogOut,
  Trash2,
  Loader2,
  Swords,
  Crown,
  Shield,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/contexts/toast-context';
import { cn } from '@/lib/utils';
import {
  useDebateRoomDetails,
  useJoinDebateRoom,
  useLeaveDebateRoom,
  useCancelDebateRoom,
  useStartPrepPhase,
  useDebateLivekitToken,
  useDebateResults,
  useGenerateResults,
} from '@/hooks/use-debate-rooms';
import { useDebateSocket } from '@/hooks/use-debate-socket';
import {
  DebateStatus,
  DebateSide,
  getUserDebateRole,
  getUserTeamSide,
} from '@/types/debate.types';
import {
  DebateTeamsDisplay,
  DebateTurnTimer,
  PrepCountdown,
  DebateBuzzer,
  DebateTeamChat,
  DebateResultsDisplay,
} from '@/components/debate';
import { ShareButton } from '@/components/share/share-button';

interface DebateRoomClientProps {
  roomId: string;
}

export default function DebateRoomClient({ roomId }: DebateRoomClientProps) {
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { showSuccess, showError } = useToast();

  // State
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [selectedSide, setSelectedSide] = useState<DebateSide | null>(null);

  // Queries
  const { data: room, isLoading, error, refetch } = useDebateRoomDetails(roomId);
  const { data: livekitData } = useDebateLivekitToken(
    roomId,
    room?.status === DebateStatus.LIVE || room?.status === DebateStatus.PREP
  );
  const { data: results } = useDebateResults(
    roomId,
    room?.status === DebateStatus.ENDED || room?.status === DebateStatus.PROCESSED
  );

  // Debug logging for LiveKit data
  useEffect(() => {
    if (livekitData) {
      console.log('[DebateRoomClient] LiveKit data received:', {
        hasToken: !!livekitData.token,
        tokenLength: livekitData.token?.length || 0,
        tokenPreview: livekitData.token ? `${livekitData.token.substring(0, 50)}...` : 'MISSING',
        serverUrl: livekitData.serverUrl || 'MISSING',
        serverUrlType: typeof livekitData.serverUrl,
      });
    } else {
      console.log('[DebateRoomClient] LiveKit data is null or undefined');
    }
  }, [livekitData]);

  // Mutations
  const joinDebateRoom = useJoinDebateRoom();
  const leaveDebateRoom = useLeaveDebateRoom();
  const cancelDebateRoom = useCancelDebateRoom();
  const startPrepPhase = useStartPrepPhase();
  const generateResults = useGenerateResults();

  // Get user's role and team
  const userRole = room && user ? getUserDebateRole(room, user.id) : null;
  const userSide = room && user ? getUserTeamSide(room, user.id) : null;
  const isHost = userRole === 'host';
  const isModerator = userRole === 'host' || userRole === 'moderator';
  const isParticipant = userRole === 'participant';

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
    advanceTurn,
    endDebate,
  } = useDebateSocket({
    roomId,
    enabled: !!room && room.status !== DebateStatus.CANCELLED,
    onDebateEnded: () => {
      refetch();
      showSuccess('Debate Ended', 'The debate has ended!');
    },
    onParticipantJoined: (event) => {
      showSuccess('Participant Joined', `${event.name} joined the debate`);
    },
    onParticipantLeft: (event) => {
      showSuccess('Participant Left', `A participant left the debate`);
    },
    onMicEnabled: (event) => {
      // Mic control hook will handle this
      console.log('[DebateRoomClient] Mic enabled:', event);
    },
    onMicDisabled: (event) => {
      // Mic control hook will handle this
      console.log('[DebateRoomClient] Mic disabled:', event);
    },
  });

  // Join socket room when connected
  useEffect(() => {
    if (isConnected && room) {
      socketJoinRoom();
    }
  }, [isConnected, room, socketJoinRoom]);

  // Handlers
  const handleJoin = async (side?: DebateSide) => {
    try {
      await joinDebateRoom.mutateAsync({
        roomId,
        preferredSide: side || selectedSide || undefined,
      });
      showSuccess('Joined!', `You joined the debate`);
      setSelectedSide(null);
    } catch (err: unknown) {
      showError('Failed to Join', err instanceof Error ? err.message : 'Could not join the debate');
    }
  };

  const handleLeave = async () => {
    try {
      await leaveDebateRoom.mutateAsync(roomId);
      showSuccess('Left Debate', 'You have left the debate');
      setShowLeaveDialog(false);
    } catch (err: unknown) {
      showError('Error', err instanceof Error ? err.message : 'Failed to leave debate');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelDebateRoom.mutateAsync(roomId);
      showSuccess('Debate Cancelled', 'The debate has been cancelled');
      setShowCancelDialog(false);
      router.push('/debate-rooms');
    } catch (err: unknown) {
      showError('Error', err instanceof Error ? err.message : 'Failed to cancel debate');
    }
  };

  const handleStartPrep = async () => {
    try {
      await startPrepPhase.mutateAsync(roomId);
      showSuccess('Prep Phase Started', 'Preparation time has begun!');
    } catch (err: unknown) {
      showError('Error', err instanceof Error ? err.message : 'Failed to start prep phase');
    }
  };

  const handleGenerateResults = async () => {
    try {
      await generateResults.mutateAsync(roomId);
      showSuccess('Results Generated', 'AI evaluation complete!');
    } catch (err: unknown) {
      showError('Error', err instanceof Error ? err.message : 'Failed to generate results');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error || !room) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Swords className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Debate Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This debate room doesn&apos;t exist or has been cancelled.
            </p>
            <Link href="/debate-rooms">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Debates
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Status display
  const statusConfig: Record<DebateStatus, { color: string; label: string }> = {
    [DebateStatus.WAITING]: { color: 'bg-yellow-500', label: 'Waiting for Participants' },
    [DebateStatus.PREP]: { color: 'bg-blue-500', label: 'Preparation Phase' },
    [DebateStatus.LIVE]: { color: 'bg-green-500 animate-pulse', label: 'Live' },
    [DebateStatus.ENDED]: { color: 'bg-gray-500', label: 'Ended' },
    [DebateStatus.PROCESSED]: { color: 'bg-purple-500', label: 'Results Ready' },
    [DebateStatus.CANCELLED]: { color: 'bg-red-500', label: 'Cancelled' },
  };

  const totalParticipants = room.teams.reduce(
    (sum, team) => sum + team.participants.length,
    0
  );
  
  // Check if both teams have at least 1 participant
  const forTeam = room.teams.find(t => t.side === DebateSide.FOR);
  const againstTeam = room.teams.find(t => t.side === DebateSide.AGAINST);
  const forCount = forTeam?.participants.length || 0;
  const againstCount = againstTeam?.participants.length || 0;
  const bothTeamsHaveParticipants = forCount >= 1 && againstCount >= 1;
  
  // Check if scheduled time has passed
  const scheduledTime = room.scheduledAt ? new Date(room.scheduledAt) : null;
  const now = new Date();
  const isScheduledTimePassed = scheduledTime ? now > scheduledTime : false;
  const canJoin = !isScheduledTimePassed && room.status === DebateStatus.WAITING;
  
  // Can start only if both teams have participants
  const canStart = bothTeamsHaveParticipants;
  
  // Check if user is the only moderator
  const isOnlyModerator = isModerator && room.moderators.length === 1;

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/10 selection:text-primary">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl relative z-10">
        {/* Back Button */}
        <Link href="/debate-rooms" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors group">
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Debates
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Header Section */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={room.status === DebateStatus.LIVE || room.status === DebateStatus.PREP ? "destructive" : "secondary"}
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium shadow-none border-transparent bg-primary/10 text-primary hover:bg-primary/20"
                >
                  {room.status === DebateStatus.LIVE || room.status === DebateStatus.PREP ? (
                    <span className="flex items-center gap-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                      </span>
                      {room.status === DebateStatus.PREP ? 'Preparation Phase' : 'Live Now'}
                    </span>
                  ) : (
                    statusConfig[room.status].label
                  )}
                </Badge>
                
                {isHost && (
                  <Badge className="rounded-full px-2.5 py-0.5 text-xs bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 shadow-none border-transparent">
                    <Crown className="h-3 w-3 mr-1" />
                    Host
                  </Badge>
                )}
                {isModerator && !isHost && (
                  <Badge className="rounded-full px-2.5 py-0.5 text-xs bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 shadow-none border-transparent">
                    <Shield className="h-3 w-3 mr-1" />
                    Moderator
                  </Badge>
                )}
                {isParticipant && (
                  <Badge className="rounded-full px-2.5 py-0.5 text-xs bg-green-500/10 text-green-600 hover:bg-green-500/20 shadow-none border-transparent">
                    Enrolled
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-tight">
                {room.topic}
              </h1>
          
              {room.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {room.description}
                </p>
              )}

              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                {room.scheduledAt && (
                  <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-3 transition-colors hover:bg-blue-500/10">
                    <div className="p-2 rounded-lg bg-background shadow-sm border border-border/50">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Scheduled</p>
                      <p className="text-sm font-semibold">{new Date(room.scheduledAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-3 transition-colors hover:bg-blue-500/10">
                  <div className="p-2 rounded-lg bg-background shadow-sm border border-border/50">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Turn Duration</p>
                    <p className="text-sm font-semibold">{room.turnDurationSeconds}s per turn</p>
                  </div>
                </div>
              </div>

              {/* Host Info */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
                <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                  <AvatarImage src={room.host.avatar || undefined} />
                  <AvatarFallback>{room.host.name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Hosted by</p>
                  <span className="text-sm font-semibold">{room.host.name}</span>
                </div>
              </div>

              {/* Connection status */}
              {isConnected !== undefined && (
                <div className="flex items-center gap-2 text-sm p-3 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      isConnected ? 'bg-green-500' : 'bg-red-500'
                    )}
                  />
                  <span className="text-muted-foreground">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              )}
            </div>

            {/* Main Content */}
            {/* Results View */}
            {(room.status === DebateStatus.ENDED ||
              room.status === DebateStatus.PROCESSED) &&
              results && (
                <DebateResultsDisplay
                  results={results}
                  currentUserId={user?.id}
                />
              )}

            {/* Generate Results Button (for moderators) */}
            {room.status === DebateStatus.ENDED && isModerator && !results && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="mb-4">
                    The debate has ended. Generate AI evaluation results?
                  </p>
                  <Button
                    onClick={handleGenerateResults}
                    disabled={generateResults.isPending}
                  >
                    {generateResults.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate Results'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Enter Debate Room Button (for WAITING/LIVE/PREP) */}
            {(room.status === DebateStatus.WAITING || 
              room.status === DebateStatus.LIVE || 
              room.status === DebateStatus.PREP) && (
              <Card>
                <CardHeader>
                  <CardTitle>Enter Debate Room</CardTitle>
                  <CardDescription>
                    {room.status === DebateStatus.WAITING
                      ? 'Enter the debate room to join the video call and wait for the debate to start.'
                      : room.status === DebateStatus.PREP 
                      ? 'Preparation phase is active. Join to prepare with your team.'
                      : 'The debate is live. Join to participate or watch.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full font-semibold text-sm h-10 shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] rounded-lg bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      router.push(`/rooms/debateroom/${roomId}`);
                    }}
                  >
                    <Play className="h-3.5 w-3.5 mr-2" />
                    Enter Debate Room
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Teams Display */}
            {room.status === DebateStatus.WAITING && (
              <DebateTeamsDisplay
                teams={room.teams}
                currentSpeakerId={room.currentSpeakerId}
                maxParticipants={room.maxParticipants}
                currentUserId={user?.id}
              />
            )}

            {/* Join Options (for non-participants in WAITING status) */}
            {room.status === DebateStatus.WAITING && !isParticipant && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {isModerator ? 'Join as Participant' : 'Join this Debate'}
                  </CardTitle>
                  <CardDescription>
                    {isScheduledTimePassed ? (
                      <span className="text-red-500">
                        The scheduled time has passed. Joining is no longer available.
                      </span>
                    ) : isOnlyModerator ? (
                      <span className="text-amber-500">
                        You are the only moderator. At least one moderator must remain.
                      </span>
                    ) : isModerator ? (
                      'As a moderator, you can join a team to participate'
                    ) : (
                      'Choose a team to join or let us assign you automatically'
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Show join buttons only if joining is allowed */}
                  {canJoin && !isOnlyModerator && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          variant="outline"
                          className="h-20 border-green-500/30 hover:bg-green-500/10"
                          onClick={() => handleJoin(DebateSide.FOR)}
                          disabled={joinDebateRoom.isPending}
                        >
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <div className="w-3 h-3 rounded-full bg-green-500" />
                              <span className="font-bold text-green-600">FOR</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Support the topic
                            </span>
                          </div>
                        </Button>

                        <Button
                          variant="outline"
                          className="h-20 border-red-500/30 hover:bg-red-500/10"
                          onClick={() => handleJoin(DebateSide.AGAINST)}
                          disabled={joinDebateRoom.isPending}
                        >
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <div className="w-3 h-3 rounded-full bg-red-500" />
                              <span className="font-bold text-red-600">AGAINST</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Oppose the topic
                            </span>
                          </div>
                        </Button>
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            or
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleJoin()}
                        disabled={joinDebateRoom.isPending}
                        className="w-full"
                      >
                        {joinDebateRoom.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Joining...
                          </>
                        ) : (
                          <>
                            {isModerator && <Shield className="h-4 w-4 mr-2" />}
                            {isModerator ? 'Join as Participant' : 'Auto-assign me to a team'}
                          </>
                        )}
                      </Button>
                    </>
                  )}

                  {/* Show warning when joining is not allowed */}
                  {(isScheduledTimePassed || isOnlyModerator) && (
                    <div className="text-center py-4">
                      <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {isScheduledTimePassed 
                          ? 'Joining is closed after the scheduled time'
                          : 'You cannot join as participant while being the only moderator'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          </div>

          {/* Right Column: Action Card & Status */}
          <div className="lg:col-span-1 space-y-4">
            <div className="sticky top-20 space-y-4">
              <Card className="border-border/50 shadow-lg shadow-primary/5 overflow-hidden backdrop-blur-sm bg-background/80 relative">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-blue-500" />
                <CardHeader className="space-y-1 pb-3 pt-5 px-5">
                  <CardTitle className="flex justify-between items-center text-base">
                    <span>Debate Details</span>
                    <Badge variant={totalParticipants >= room.maxParticipants * 2 ? "destructive" : "secondary"} className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5">
                      {totalParticipants >= room.maxParticipants * 2 ? 'Full' : 'Open'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-5 pb-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-1.5 border-b border-border/50 group text-sm">
                      <div className="flex items-center text-muted-foreground group-hover:text-foreground transition-colors">
                        <Users className="h-3.5 w-3.5 mr-2" />
                        <span>Participants</span>
                      </div>
                      <span className="font-medium font-mono">{totalParticipants} / {room.maxParticipants * 2}</span>
                    </div>
                    
                    {forTeam && againstTeam && (
                      <>
                        <div className="flex items-center justify-between py-1.5 border-b border-border/50 group text-sm">
                          <div className="flex items-center text-muted-foreground group-hover:text-foreground transition-colors">
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                            <span>Team FOR</span>
                          </div>
                          <span className="font-medium font-mono">{forTeam.participants.length} / {room.maxParticipants}</span>
                        </div>
                        
                        <div className="flex items-center justify-between py-1.5 border-b border-border/50 group text-sm">
                          <div className="flex items-center text-muted-foreground group-hover:text-foreground transition-colors">
                            <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                            <span>Team AGAINST</span>
                          </div>
                          <span className="font-medium font-mono">{againstTeam.participants.length} / {room.maxParticipants}</span>
                        </div>
                      </>
                    )}

                    {userSide && (
                      <div className="flex items-center justify-between py-1.5 border-b border-border/50 group text-sm">
                        <div className="flex items-center text-muted-foreground group-hover:text-foreground transition-colors">
                          {isHost && <Crown className="h-3.5 w-3.5 mr-2 text-yellow-500" />}
                          {isModerator && !isHost && <Shield className="h-3.5 w-3.5 mr-2 text-blue-500" />}
                          <span>Your Role</span>
                        </div>
                        <span className="font-medium capitalize">{userRole}</span>
                      </div>
                    )}

                    {userSide && (
                      <div className="flex items-center justify-between py-1.5 border-b border-border/50 group text-sm">
                        <div className="flex items-center text-muted-foreground group-hover:text-foreground transition-colors">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full mr-2',
                              userSide === DebateSide.FOR
                                ? 'bg-green-500'
                                : 'bg-red-500'
                            )}
                          />
                          <span>Your Team</span>
                        </div>
                        <span className="font-medium">{userSide}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-1 space-y-2.5">
                {/* Scheduled time warning */}
                {scheduledTime && room.status === DebateStatus.WAITING && (
                  <div className={cn(
                    "p-2 rounded-md text-xs mb-2",
                    isScheduledTimePassed 
                      ? "bg-red-500/10 text-red-600 border border-red-500/20" 
                      : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                  )}>
                    <div className="flex items-center gap-1 mb-1">
                      <Calendar className="h-3 w-3" />
                      <span className="font-medium">
                        {isScheduledTimePassed ? 'Scheduled time passed' : 'Scheduled for:'}
                      </span>
                    </div>
                    <span>{scheduledTime.toLocaleString()}</span>
                    {isScheduledTimePassed && (
                      <p className="mt-1 text-red-500">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        Joining is no longer available
                      </p>
                    )}
                  </div>
                )}

                    {/* Host/Moderator actions */}
                    {isModerator && room.status === DebateStatus.WAITING && (
                      <>
                        <Button
                          size="default"
                          className="w-full font-semibold text-sm h-10 shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] rounded-lg bg-green-600 hover:bg-green-700 text-white"
                          onClick={handleStartPrep}
                          disabled={!canStart || startPrepPhase.isPending}
                        >
                          {startPrepPhase.isPending ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                              Starting...
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5 mr-2" />
                              Start Debate
                            </>
                          )}
                        </Button>
                        {!canStart && (
                          <p className="text-xs text-muted-foreground text-center">
                            Need at least 1 participant per team
                            {forCount === 0 && ' (FOR team empty)'}
                            {againstCount === 0 && ' (AGAINST team empty)'}
                          </p>
                        )}
                      </>
                    )}

                    {/* Cancel/Delete button for host */}
                    {isHost && room.status === DebateStatus.WAITING && (
                      <Button
                        variant="destructive"
                        size="default"
                        className="w-full h-10 rounded-lg"
                        onClick={() => setShowCancelDialog(true)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Cancel Debate
                      </Button>
                    )}

                    {/* Participant actions */}
                    {isParticipant && room.status === DebateStatus.WAITING && (
                      <Button
                        variant="outline"
                        size="default"
                        className="w-full h-10 rounded-lg"
                        onClick={() => setShowLeaveDialog(true)}
                      >
                        <LogOut className="h-3.5 w-3.5 mr-2" />
                        Leave Debate
                      </Button>
                    )}

                    {/* No actions message */}
                    {!isModerator && !isParticipant && room.status === DebateStatus.WAITING && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Join the debate to see actions
                      </p>
                    )}

                    {/* Back to results */}
                    {(room.status === DebateStatus.ENDED ||
                      room.status === DebateStatus.PROCESSED) && (
                      <Link href="/debate-rooms" className="block">
                        <Button variant="outline" size="default" className="w-full h-10 rounded-lg">
                          <ArrowLeft className="h-3.5 w-3.5 mr-2" />
                          Back to Debates
                        </Button>
                      </Link>
                    )}

                    {/* Share Button */}
                    <ShareButton
                      url={`${typeof window !== "undefined" ? window.location.origin : ""}/debate-rooms/${roomId}`}
                      title={room.topic}
                      description={room.description || ""}
                      variant="outline"
                      className="w-full rounded-lg h-9 hover:bg-primary/5 text-xs text-green-600 border-green-200/50 hover:text-green-700"
                    />
                  </div>
                </CardContent>
              </Card>

            {/* Moderators */}
            {room.moderators.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Moderators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {room.moderators.map((mod) => (
                    <div key={mod.id} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={mod.user.avatar || undefined} />
                        <AvatarFallback className="text-xs">
                          {mod.user.name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{mod.user.name}</span>
                      {mod.isHost && (
                        <Crown className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Room Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Room Settings</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 text-muted-foreground">
                {room.scheduledAt && (
                  <div className="flex justify-between">
                    <span>Scheduled</span>
                    <span>{new Date(room.scheduledAt).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Turn Duration</span>
                  <span>{room.turnDurationSeconds}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Prep Time</span>
                  <span>{room.prepTimeSeconds}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Turn Order</span>
                  <span>{room.turnOrder}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max per Team</span>
                  <span>{room.maxParticipants}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Debate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently cancel the debate and remove all participants.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Debate</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground"
            >
              {cancelDebateRoom.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Cancel Debate'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Debate?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this debate? You can rejoin later
              if there&apos;s still room.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave}>
              {leaveDebateRoom.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Leave'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
